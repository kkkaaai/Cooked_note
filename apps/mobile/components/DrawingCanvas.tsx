import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import {
  getStrokeOutlinePoints,
  outlineToSvgPath,
  getStrokeOpacity,
  getStrokeBlendMode,
} from "@cookednote/shared/lib/stroke-renderer";
import { shouldRejectTouch } from "@/lib/palm-rejection";

/** Extract pressure from gesture event (Apple Pencil force on iOS). */
function extractPressure(event: Record<string, unknown>): number {
  if ("force" in event && typeof event.force === "number" && event.force > 0) {
    return event.force;
  }
  return 0.5;
}

interface DrawingCanvasProps {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
}

export function DrawingCanvas({
  pageNumber,
  pageWidth,
  pageHeight,
}: DrawingCanvasProps) {
  const isDrawingMode = useDrawingStore((s) => s.isDrawingMode);
  const allPageStrokes = useDrawingStore((s) => s.pageStrokes);
  const activeStroke = useDrawingStore((s) => s.activeStroke);
  const activePageNumber = useDrawingStore((s) => s.activePageNumber);

  const committedStrokes = useMemo(
    () => allPageStrokes.get(pageNumber) ?? [],
    [allPageStrokes, pageNumber]
  );

  const showActiveStroke =
    activePageNumber === pageNumber && activeStroke !== null;

  const dims = useMemo(
    () => ({ pageWidth, pageHeight }),
    [pageWidth, pageHeight]
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

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isDrawingMode)
        .minDistance(0)
        .onBegin((e) => {
          if (shouldRejectTouch(e)) return;
          const x = e.x / pageWidth;
          const y = e.y / pageHeight;
          const pressure = extractPressure(e as unknown as Record<string, unknown>);
          useDrawingStore.getState().beginStroke(pageNumber, { x, y, pressure });
        })
        .onUpdate((e) => {
          if (shouldRejectTouch(e)) return;
          const x = e.x / pageWidth;
          const y = e.y / pageHeight;
          const pressure = extractPressure(e as unknown as Record<string, unknown>);
          useDrawingStore.getState().addPoint({ x, y, pressure });
        })
        .onEnd(() => {
          useDrawingStore.getState().endStroke();
        })
        .onFinalize(() => {
          // Fallback: make sure stroke is ended
          const { activeStroke: stroke } = useDrawingStore.getState();
          if (stroke) {
            useDrawingStore.getState().endStroke();
          }
        }),
    [isDrawingMode, pageNumber, pageWidth, pageHeight]
  );

  if (!isDrawingMode && committedStrokes.length === 0) return null;

  return (
    <GestureHandlerRootView
      style={[
        styles.overlay,
        { width: pageWidth, height: pageHeight },
        !isDrawingMode && styles.noPointerEvents,
      ]}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
  },
  canvas: {
    flex: 1,
  },
  noPointerEvents: {
    pointerEvents: "none",
  },
});
