import { captureRef } from "react-native-view-shot";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { PixelRatio } from "react-native";
import type { NormalizedRect, Screenshot } from "@cookednote/shared/types";

const MAX_DIMENSION = 1200;

export async function captureRegionMobile(
  viewRef: React.RefObject<unknown>,
  region: NormalizedRect,
  pageNumber: number,
  viewWidth: number,
  viewHeight: number
): Promise<Screenshot | null> {
  try {
    const pixelRatio = PixelRatio.get();

    const uri = await captureRef(viewRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    const capturedWidth = viewWidth * pixelRatio;
    const capturedHeight = viewHeight * pixelRatio;

    const cropX = Math.round(region.x * capturedWidth);
    const cropY = Math.round(region.y * capturedHeight);
    const cropW = Math.round(region.width * capturedWidth);
    const cropH = Math.round(region.height * capturedHeight);

    const actions: Array<
      | { crop: { originX: number; originY: number; width: number; height: number } }
      | { resize: { width: number } }
    > = [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }];

    const maxDim = Math.max(cropW, cropH);
    if (maxDim > MAX_DIMENSION) {
      const ratio = MAX_DIMENSION / maxDim;
      actions.push({ resize: { width: Math.round(cropW * ratio) } });
    }

    const result = await manipulateAsync(uri, actions, {
      format: SaveFormat.PNG,
      base64: true,
    });

    if (!result.base64) return null;

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      base64: `data:image/png;base64,${result.base64}`,
      pageNumber,
      region,
      createdAt: Date.now(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("Screenshot capture failed:", message);
    return null;
  }
}
