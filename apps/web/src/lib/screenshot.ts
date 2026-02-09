import type { NormalizedRect } from "@cookednote/shared/types";

const MAX_DIMENSION = 1200;

/**
 * Capture a region from the PDF canvas as a base64 PNG data URL.
 * Uses the canvas element inside the react-pdf Page component.
 *
 * @param pageElement - The .react-pdf__Page DOM element
 * @param region - Normalized rect (0-1 range relative to page)
 * @returns base64 data URL string, or null if capture fails
 */
export function captureRegion(
  pageElement: HTMLElement,
  region: NormalizedRect
): string | null {
  const sourceCanvas = pageElement.querySelector("canvas");
  if (!sourceCanvas) return null;

  // Use canvas pixel dimensions (accounts for device pixel ratio & scale)
  const canvasWidth = sourceCanvas.width;
  const canvasHeight = sourceCanvas.height;

  // Convert normalized region to canvas pixel coords
  const srcX = Math.round(region.x * canvasWidth);
  const srcY = Math.round(region.y * canvasHeight);
  const srcW = Math.round(region.width * canvasWidth);
  const srcH = Math.round(region.height * canvasHeight);

  if (srcW <= 0 || srcH <= 0) return null;

  // Determine output size (downscale if needed)
  let outW = srcW;
  let outH = srcH;
  const maxDim = Math.max(srcW, srcH);
  if (maxDim > MAX_DIMENSION) {
    const ratio = MAX_DIMENSION / maxDim;
    outW = Math.round(srcW * ratio);
    outH = Math.round(srcH * ratio);
  }

  // Create temporary canvas and draw cropped region
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = outW;
  tempCanvas.height = outH;
  const ctx = tempCanvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(sourceCanvas, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

  return tempCanvas.toDataURL("image/png");
}

/**
 * Extract raw base64 data from a data URL.
 * Strips the "data:image/png;base64," prefix.
 */
export function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}
