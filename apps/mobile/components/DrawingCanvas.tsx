import { useMemo, useState, useCallback } from "react";
import { StyleSheet, type LayoutChangeEvent } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
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

interface DrawingCanvasProps {
  pageNumber: number;
}

export function DrawingCanvas({ pageNumber }: DrawingCanvasProps) {
  const isDrawingMode = useDrawingStore((s) => s.isDrawingMode);
  const allPageStrokes = useDrawingStore((s) => s.pageStrokes);
  const activeStroke = useDrawingStore((s) => s.activeStroke);
  const activePageNumber = useDrawingStore((s) => s.activePageNumber);

  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasSize({ width, height });
    }
  }, []);

  const committedStrokes = useMemo(
    () => allPageStrokes.get(pageNumber) ?? [],
    [allPageStrokes, pageNumber]
  );

  const showActiveStroke =
    activePageNumber === pageNumber && activeStroke !== null;

  const dims = useMemo(
    () => ({ pageWidth: canvasSize.width, pageHeight: canvasSize.height }),
    [canvasSize.width, canvasSize.height]
  );

  // Build Skia paths for committed strokes
  const committedPaths = useMemo(() => {
    return committedStrokes.map((stroke) => {
      const outline = getStrokeOutlinePoints(stroke, dims);
      const svgPath = outlineToSvgPath(outline);
      return {
        id: stroke.id,
        path: Skia.Path.MakeFromSVGString(svgPath),
        color: Skia.Color(stroke.color),
        opacity: getStrokeOpacity(stroke.tool),
        blendMode: getStrokeBlendMode(stroke.tool),
      };
    });
  }, [committedStrokes, dims]);

  // Build Skia path for active stroke
  const activePath = useMemo(() => {
    if (!showActiveStroke || !activeStroke) return null;
    const outline = getStrokeOutlinePoints(activeStroke, dims);
    const svgPath = outlineToSvgPath(outline);
    return {
      path: Skia.Path.MakeFromSVGString(svgPath),
      color: Skia.Color(activeStroke.color),
      opacity: getStrokeOpacity(activeStroke.tool),
      blendMode: getStrokeBlendMode(activeStroke.tool),
    };
  }, [showActiveStroke, activeStroke, dims]);

  // JS-thread handlers called from UI-thread gesture callbacks via runOnJS
  const handleBegin = useCallback(
    (x: number, y: number, pressure: number) => {
      useDrawingStore
        .getState()
        .beginStroke(pageNumber, { x, y, pressure });
    },
    [pageNumber]
  );

  const handleUpdate = useCallback(
    (x: number, y: number, pressure: number) => {
      useDrawingStore.getState().addPoint({ x, y, pressure });
    },
    []
  );

  const handleEnd = useCallback(() => {
    useDrawingStore.getState().endStroke();
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isDrawingMode)
        .minDistance(0)
        .onBegin((e) => {
          if (e.numberOfPointers > 1) return;
          const x = e.x / canvasSize.width;
          const y = e.y / canvasSize.height;
          const force = (e as unknown as Record<string, unknown>).force;
          const pressure =
            typeof force === "number" && force > 0 ? force : 0.5;
          runOnJS(handleBegin)(x, y, pressure);
        })
        .onUpdate((e) => {
          if (e.numberOfPointers > 1) return;
          const x = e.x / canvasSize.width;
          const y = e.y / canvasSize.height;
          const force = (e as unknown as Record<string, unknown>).force;
          const pressure =
            typeof force === "number" && force > 0 ? force : 0.5;
          runOnJS(handleUpdate)(x, y, pressure);
        })
        .onEnd(() => {
          runOnJS(handleEnd)();
        })
        .onFinalize(() => {
          runOnJS(handleEnd)();
        }),
    [isDrawingMode, canvasSize.width, canvasSize.height, handleBegin, handleUpdate, handleEnd]
  );

  if (!isDrawingMode && committedStrokes.length === 0) return null;

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
                blendMode={item.blendMode === "multiply" ? "multiply" : undefined}
              />
            ) : null
          )}
          {activePath?.path && (
            <Path
              path={activePath.path}
              color={activePath.color}
              opacity={activePath.opacity}
              blendMode={activePath.blendMode === "multiply" ? "multiply" : undefined}
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
