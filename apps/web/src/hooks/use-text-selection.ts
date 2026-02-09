"use client";

import { useCallback, useEffect, useState } from "react";
import type { NormalizedRect } from "@cookednote/shared/types";

export interface TextSelectionResult {
  selectedText: string;
  rects: NormalizedRect[];
  pageNumber: number;
  popupPosition: { x: number; y: number };
}

interface UseTextSelectionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pageNumber: number;
  enabled: boolean;
  resolvePageFromSelection?: boolean;
}

/**
 * Merge adjacent rects on the same line into wider rects.
 * getClientRects() returns many small rects per line — merging cleans them up.
 */
export function mergeAdjacentRects(
  rects: NormalizedRect[],
  yThreshold = 0.005
): NormalizedRect[] {
  if (rects.length <= 1) return rects;

  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: NormalizedRect[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    // Same line (y values close enough)
    if (Math.abs(next.y - current.y) < yThreshold) {
      const rightEdge = Math.max(
        current.x + current.width,
        next.x + next.width
      );
      current.x = Math.min(current.x, next.x);
      current.width = rightEdge - current.x;
      current.height = Math.max(current.height, next.height);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

export function useTextSelection({
  containerRef,
  pageNumber,
  enabled,
  resolvePageFromSelection,
}: UseTextSelectionOptions) {
  const [selection, setSelection] = useState<TextSelectionResult | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        return;
      }

      const selectedText = sel.toString().trim();
      if (!selectedText) return;

      // Find the react-pdf Page element
      let pageElement: HTMLElement | null = null;
      let resolvedPageNumber = pageNumber;

      if (resolvePageFromSelection && sel.anchorNode) {
        // In continuous mode, find which page the selection is on
        const node = sel.anchorNode instanceof HTMLElement
          ? sel.anchorNode
          : sel.anchorNode.parentElement;
        const wrapper = node?.closest("[data-page-number]");
        if (wrapper) {
          resolvedPageNumber = Number(wrapper.getAttribute("data-page-number"));
          // react-pdf's Page div also has data-page-number, so .closest()
          // may return the Page itself rather than our outer wrapper
          if (wrapper.classList.contains("react-pdf__Page")) {
            pageElement = wrapper as HTMLElement;
          } else {
            pageElement = wrapper.querySelector(".react-pdf__Page") as HTMLElement;
          }
        }
      }

      if (!pageElement) {
        pageElement = container.querySelector(".react-pdf__Page") as HTMLElement;
      }
      if (!pageElement) return;

      const pageRect = pageElement.getBoundingClientRect();
      const pageWidth = pageRect.width;
      const pageHeight = pageRect.height;

      if (pageWidth === 0 || pageHeight === 0) return;

      // Get all client rects from the selection range
      const range = sel.getRangeAt(0);
      const clientRects = range.getClientRects();

      const normalizedRects: NormalizedRect[] = [];
      for (let i = 0; i < clientRects.length; i++) {
        const rect = clientRects[i];
        // Skip tiny/zero-size rects
        if (rect.width < 1 || rect.height < 1) continue;

        // Normalize to 0-1 range relative to page, clamped
        normalizedRects.push({
          x: Math.max(0, Math.min(1, (rect.left - pageRect.left) / pageWidth)),
          y: Math.max(0, Math.min(1, (rect.top - pageRect.top) / pageHeight)),
          width: Math.max(0, Math.min(1, rect.width / pageWidth)),
          height: Math.max(0, Math.min(1, rect.height / pageHeight)),
        });
      }

      if (normalizedRects.length === 0) return;

      const mergedRects = mergeAdjacentRects(normalizedRects);

      // Popup position near the end of selection
      const lastRect = clientRects[clientRects.length - 1];
      const popupPosition = {
        x: lastRect.right,
        y: lastRect.bottom,
      };

      setSelection({
        selectedText,
        rects: mergedRects,
        pageNumber: resolvedPageNumber,
        popupPosition,
      });
    };

    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, pageNumber, enabled, resolvePageFromSelection]);

  return { selection, clearSelection };
}
