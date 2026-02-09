"use client";

import type { NormalizedRect } from "@cookednote/shared/types";

interface RegionSelectOverlayProps {
  isSelecting: boolean;
  selectionRect: NormalizedRect | null;
}

export function RegionSelectOverlay({
  isSelecting,
  selectionRect,
}: RegionSelectOverlayProps) {
  if (!isSelecting || !selectionRect) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 10 }}
    >
      <div
        className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10"
        style={{
          left: `${selectionRect.x * 100}%`,
          top: `${selectionRect.y * 100}%`,
          width: `${selectionRect.width * 100}%`,
          height: `${selectionRect.height * 100}%`,
        }}
      />
    </div>
  );
}
