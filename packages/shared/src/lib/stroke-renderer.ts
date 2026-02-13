import getStroke from "perfect-freehand";
import type { DrawingStroke, DrawingTool } from "../types";

interface PageDimensions {
  pageWidth: number;
  pageHeight: number;
}

/**
 * Convert normalized stroke points to pixel-space outline polygon using perfect-freehand.
 */
export function getStrokeOutlinePoints(
  stroke: DrawingStroke,
  dims: PageDimensions
): number[][] {
  const { pageWidth, pageHeight } = dims;

  // Convert normalized points to pixel coordinates
  const pixelPoints: number[][] = stroke.points.map((p) => [
    p.x * pageWidth,
    p.y * pageHeight,
    p.pressure,
  ]);

  const strokeWidth = stroke.size * Math.min(pageWidth, pageHeight);

  const options = {
    size: strokeWidth,
    smoothing: 0.5,
    streamline: 0.5,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
    ...(stroke.tool === "pen"
      ? { thinning: 0.5 } // Pressure-sensitive width
      : { thinning: 0 }), // Uniform width for highlighter
  };

  return getStroke(pixelPoints, options);
}

/**
 * Convert outline polygon points to an SVG path string.
 */
export function outlineToSvgPath(points: number[][]): string {
  if (points.length === 0) return "";

  const [first, ...rest] = points;
  let path = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`;

  for (const point of rest) {
    path += ` L ${point[0].toFixed(2)} ${point[1].toFixed(2)}`;
  }

  path += " Z";
  return path;
}

/**
 * Get the opacity for a drawing tool.
 */
export function getStrokeOpacity(tool: DrawingTool): number {
  return tool === "highlighter" ? 0.35 : 1.0;
}

/**
 * Get the composite operation / blend mode for a drawing tool.
 * For Canvas2D: globalCompositeOperation values.
 */
export function getStrokeBlendMode(
  tool: DrawingTool
): GlobalCompositeOperation {
  return tool === "highlighter" ? "multiply" : "source-over";
}

/**
 * Render a stroke onto a Canvas2D context using the outline polygon.
 */
export function renderStrokeToCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  dims: PageDimensions
): void {
  const outlinePoints = getStrokeOutlinePoints(stroke, dims);
  if (outlinePoints.length === 0) return;

  const path = new Path2D(outlineToSvgPath(outlinePoints));

  ctx.save();
  ctx.globalAlpha = getStrokeOpacity(stroke.tool);
  ctx.globalCompositeOperation = getStrokeBlendMode(stroke.tool);
  ctx.fillStyle = stroke.color;
  ctx.fill(path);
  ctx.restore();
}
