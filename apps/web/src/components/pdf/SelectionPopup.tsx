"use client";

import { useEffect, useRef } from "react";
import { HIGHLIGHT_COLORS, type HighlightColor } from "@cookednote/shared/types";

interface SelectionPopupProps {
  position: { x: number; y: number };
  onHighlight: (color: HighlightColor) => void;
  onDismiss: () => void;
}

export function SelectionPopup({
  position,
  onHighlight,
  onDismiss,
}: SelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        onDismiss();
      }
    };
    // Delay to avoid the mouseup that triggered this popup from dismissing it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onDismiss]);

  // Keep popup within viewport
  const left = Math.min(position.x, window.innerWidth - 200);
  const top = position.y + 8;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 flex items-center gap-1.5 rounded-lg border bg-background p-2 shadow-lg"
      style={{ left, top }}
      role="toolbar"
      aria-label="Highlight colors"
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color.name}
          className="h-7 w-7 rounded-full border-2 border-transparent hover:border-foreground/50 transition-colors hover:scale-110"
          style={{ backgroundColor: color.value }}
          onClick={() => onHighlight(color)}
          title={`Highlight ${color.name}`}
          aria-label={`Highlight ${color.name}`}
        />
      ))}
    </div>
  );
}
