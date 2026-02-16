import { useMemo, useState, useCallback, useRef } from "react";
import { StyleSheet, type LayoutChangeEvent } from "react-native";
import { Canvas, Path, Skia, type SkPath } from "@shopify/react-native-skia";
import { View } from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import {
  getStrokeOutlinePoints,
  outlineToSvgPath,
  getStrokeOpacity,
  getStrokeBlendMode,
} from "@cookednote/shared/lib/stroke-renderer";
import type { DrawingPoint, DrawingTool, DrawingStroke } from "@cookednote/shared/types";

interface DrawingCanvasProps {
  pageNumber: number;
}

export function DrawingCanvas({ pageNumber }: DrawingCanvasProps) {
  const isDrawingMode = useDrawingStore((s) => s.isDrawingMode);
  const allPageStrokes = useDrawingStore((s) => s.pageStrokes);
  const strokeColor = useDrawingStore((s) => s.strokeColor);
  const activeTool = useDrawingStore((s) => s.activeTool);
  const strokeSize = useDrawingStore((s) => s.strokeSize);

  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  // Counter to trigger canvas re-draws for active stroke (throttled to ~60fps)
  const [renderTick, setRenderTick] = useState(0);

  // Refs for active drawing — bypass Zustand store for performance.
  // Points accumulate in a plain array; only committed to store on stroke end.
  const rawPointsRef = useRef<DrawingPoint[]>([]);
  const isDrawingRef = useRef(false);
  const rafScheduledRef = useRef(false);

  // Capture stroke properties at begin time so endStroke uses the correct
  // tool/color/size even if the user switches tools mid-stroke.
  const strokeToolRef = useRef<DrawingTool>("pen");
  const strokeColorRef = useRef("#000000");
  const strokeSizeRef = useRef(0.005);

  // Cache canvas size in ref so gesture callbacks always read the latest value
  // without needing canvasSize in the gesture memo deps.
  const canvasSizeRef = useRef({ width: 1, height: 1 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasSize({ width, height });
      canvasSizeRef.current = { width, height };
    }
  }, []);

  const committedStrokes = useMemo(
    () => allPageStrokes.get(pageNumber) ?? [],
    [allPageStrokes, pageNumber]
  );

  const pageDimensions = useMemo(
    () => ({ pageWidth: canvasSize.width, pageHeight: canvasSize.height }),
    [canvasSize.width, canvasSize.height]
  );

  // Build Skia paths for committed strokes (smoothed with perfect-freehand).
  // Only recomputed when committed strokes or canvas size change — never during active drawing.
  const committedPaths = useMemo(() => {
    return committedStrokes.map((stroke) => {
      const outline = getStrokeOutlinePoints(stroke, pageDimensions);
      const svgPath = outlineToSvgPath(outline);
      return {
        id: stroke.id,
        path: Skia.Path.MakeFromSVGString(svgPath),
        color: Skia.Color(stroke.color),
        opacity: getStrokeOpacity(stroke.tool),
        blendMode: getStrokeBlendMode(stroke.tool),
      };
    });
  }, [committedStrokes, pageDimensions]);

  // Schedule a canvas re-draw, throttled to one per animation frame (~60fps).
  const scheduleRender = useCallback(() => {
    if (rafScheduledRef.current) return;
    rafScheduledRef.current = true;
    requestAnimationFrame(() => {
      rafScheduledRef.current = false;
      setRenderTick((t) => t + 1);
    });
  }, []);

  // --- Gesture handlers (called on JS thread via runOnJS) ---

  // Gesture callbacks pass raw pixel coords; we normalize here on the JS
  // thread where canvasSizeRef is always current (worklets only get a snapshot).
  const handleBegin = useCallback(
    (px: number, py: number, pressure: number) => {
      const w = canvasSizeRef.current.width;
      const h = canvasSizeRef.current.height;
      const x = px / w;
      const y = py / h;

      const store = useDrawingStore.getState();
      if (store.activeTool === "eraser") {
        store.eraseStrokesAtPoint(pageNumber, x, y, store.strokeSize * 2);
        return;
      }

      // Snapshot stroke properties at begin time
      strokeToolRef.current = store.activeTool;
      strokeColorRef.current = store.strokeColor;
      strokeSizeRef.current = store.strokeSize;

      rawPointsRef.current = [{ x, y, pressure }];
      isDrawingRef.current = true;
      scheduleRender();
    },
    [pageNumber, scheduleRender]
  );

  const handleUpdate = useCallback(
    (px: number, py: number, pressure: number) => {
      const w = canvasSizeRef.current.width;
      const h = canvasSizeRef.current.height;
      const x = px / w;
      const y = py / h;

      if (!isDrawingRef.current) {
        // Eraser: keep erasing along the drag path
        const store = useDrawingStore.getState();
        if (store.activeTool === "eraser" && store.isDrawingMode) {
          store.eraseStrokesAtPoint(pageNumber, x, y, store.strokeSize * 2);
        }
        return;
      }

      // Append point to ref array (no Zustand update, no re-render)
      rawPointsRef.current.push({ x, y, pressure });
      scheduleRender();
    },
    [pageNumber, scheduleRender]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = rawPointsRef.current;
    rawPointsRef.current = [];

    if (points.length < 2) {
      scheduleRender();
      return;
    }

    // Build the complete stroke from captured refs and commit directly
    // to pageStrokes. This avoids going through beginStroke/endStroke which
    // re-reads activeTool and can silently drop the stroke.
    const stroke: DrawingStroke = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      points,
      color: strokeColorRef.current,
      size: strokeSizeRef.current,
      tool: strokeToolRef.current,
      timestamp: Date.now(),
    };

    const store = useDrawingStore.getState();
    const newMap = new Map(store.pageStrokes);
    const existing = newMap.get(pageNumber) ?? [];
    newMap.set(pageNumber, [...existing, stroke]);

    const newDirty = new Set(store.dirtyPages);
    newDirty.add(pageNumber);

    useDrawingStore.setState({
      pageStrokes: newMap,
      activeStroke: null,
      activePageNumber: null,
      undoStack: [
        ...store.undoStack,
        { type: "add_stroke" as const, pageNumber, stroke },
      ],
      redoStack: [],
      dirtyPages: newDirty,
    });

    scheduleRender();
  }, [pageNumber, scheduleRender]);

  // --- Gesture definition ---

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isDrawingMode)
        .minDistance(0)
        .onBegin((e) => {
          if (e.numberOfPointers > 1) return;
          // Pass raw pixel coords — normalization happens on JS thread
          // where canvasSizeRef is always current.
          const f = (e as unknown as Record<string, unknown>).force;
          const p = typeof f === "number" && f > 0 ? Math.min(f, 1) : 0.5;
          runOnJS(handleBegin)(e.x, e.y, p);
        })
        .onUpdate((e) => {
          if (e.numberOfPointers > 1) return;
          const f = (e as unknown as Record<string, unknown>).force;
          const p = typeof f === "number" && f > 0 ? Math.min(f, 1) : 0.5;
          runOnJS(handleUpdate)(e.x, e.y, p);
        })
        .onFinalize(() => {
          runOnJS(handleEnd)();
        }),
    [isDrawingMode, handleBegin, handleUpdate, handleEnd]
  );

  // --- Active stroke path (raw line segments, no perfect-freehand) ---
  // Built from rawPointsRef on each render tick. O(n) moveTo/lineTo is
  // orders of magnitude faster than perfect-freehand + SVG + MakeFromSVGString.
  let activePath: SkPath | null = null;
  if (isDrawingRef.current && rawPointsRef.current.length > 0) {
    // renderTick is read here to ensure React re-evaluates this block
    void renderTick;
    const { width, height } = canvasSizeRef.current;
    const points = rawPointsRef.current;
    const path = Skia.Path.Make();
    path.moveTo(points[0].x * width, points[0].y * height);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i].x * width, points[i].y * height);
    }
    activePath = path;
  }

  // Nothing to render and no gestures to capture — unmount entirely.
  if (!isDrawingMode && committedStrokes.length === 0) return null;

  const activeStrokeWidth =
    strokeSize * Math.min(canvasSize.width, canvasSize.height);

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        !isDrawingMode && styles.noPointerEvents,
      ]}
      onLayout={onLayout}
    >
      <GestureDetector gesture={panGesture}>
        <Canvas style={styles.canvas}>
          {committedPaths.map((item) =>
            item.path ? (
              <Path
                key={item.id}
                path={item.path}
                color={item.color}
                opacity={item.opacity}
                blendMode={
                  item.blendMode === "multiply" ? "multiply" : undefined
                }
              />
            ) : null
          )}
          {activePath && (
            <Path
              path={activePath}
              color={Skia.Color(strokeColor)}
              style="stroke"
              strokeWidth={activeStrokeWidth}
              strokeCap="round"
              strokeJoin="round"
              opacity={activeTool === "highlighter" ? 0.35 : 1.0}
              blendMode={
                activeTool === "highlighter" ? "multiply" : undefined
              }
            />
          )}
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 10,
  },
  canvas: {
    flex: 1,
  },
  noPointerEvents: {
    pointerEvents: "none",
  },
});
