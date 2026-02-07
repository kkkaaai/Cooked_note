import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalizedRect } from "@/types";

const MIN_SIZE_PX = 10;

export interface RegionSelectResult {
  region: NormalizedRect;
  pageNumber: number;
}

interface UseRegionSelectOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pageNumber: number;
  enabled: boolean;
  onRegionSelected: (result: RegionSelectResult) => void;
  getPageFromPoint?: (x: number, y: number) => { pageNumber: number; pageElement: HTMLElement } | null;
}

export function useRegionSelect({
  containerRef,
  pageNumber,
  enabled,
  onRegionSelected,
  getPageFromPoint,
}: UseRegionSelectOptions) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<NormalizedRect | null>(null);
  const [activeRegionPage, setActiveRegionPage] = useState<number | null>(null);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const pageRectRef = useRef<DOMRect | null>(null);
  const activePageNumRef = useRef<number>(pageNumber);
  const onRegionSelectedRef = useRef(onRegionSelected);
  onRegionSelectedRef.current = onRegionSelected;

  const getPageElement = useCallback(() => {
    return containerRef.current?.querySelector(".react-pdf__Page") as HTMLElement | null;
  }, [containerRef]);

  useEffect(() => {
    if (!enabled) {
      setIsSelecting(false);
      setSelectionRect(null);
      setActiveRegionPage(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      let pageEl: HTMLElement | null;
      let targetPageNumber: number;

      if (getPageFromPoint) {
        const result = getPageFromPoint(e.clientX, e.clientY);
        if (!result) return;
        pageEl = result.pageElement;
        targetPageNumber = result.pageNumber;
      } else {
        pageEl = getPageElement();
        targetPageNumber = pageNumber;
        if (!pageEl || !pageEl.contains(e.target as Node)) return;
      }

      // Left click only
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const pageRect = pageEl.getBoundingClientRect();
      pageRectRef.current = pageRect;
      activePageNumRef.current = targetPageNumber;
      setActiveRegionPage(targetPageNumber);

      startRef.current = {
        x: e.clientX - pageRect.left,
        y: e.clientY - pageRect.top,
      };

      setIsSelecting(true);
      setSelectionRect(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!startRef.current || !pageRectRef.current) return;

      const pageRect = pageRectRef.current;
      const pageWidth = pageRect.width;
      const pageHeight = pageRect.height;

      // Current position relative to page
      const curX = Math.max(0, Math.min(e.clientX - pageRect.left, pageWidth));
      const curY = Math.max(0, Math.min(e.clientY - pageRect.top, pageHeight));

      // Compute rect (handle any drag direction)
      const x1 = Math.min(startRef.current.x, curX);
      const y1 = Math.min(startRef.current.y, curY);
      const x2 = Math.max(startRef.current.x, curX);
      const y2 = Math.max(startRef.current.y, curY);

      // Normalize to 0-1 range
      setSelectionRect({
        x: x1 / pageWidth,
        y: y1 / pageHeight,
        width: (x2 - x1) / pageWidth,
        height: (y2 - y1) / pageHeight,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!startRef.current || !pageRectRef.current) return;

      const pageRect = pageRectRef.current;
      const pageWidth = pageRect.width;
      const pageHeight = pageRect.height;

      const curX = Math.max(0, Math.min(e.clientX - pageRect.left, pageWidth));
      const curY = Math.max(0, Math.min(e.clientY - pageRect.top, pageHeight));

      const x1 = Math.min(startRef.current.x, curX);
      const y1 = Math.min(startRef.current.y, curY);
      const x2 = Math.max(startRef.current.x, curX);
      const y2 = Math.max(startRef.current.y, curY);

      const pixelWidth = x2 - x1;
      const pixelHeight = y2 - y1;

      // Reset
      startRef.current = null;
      pageRectRef.current = null;
      setIsSelecting(false);
      setSelectionRect(null);
      setActiveRegionPage(null);

      // Minimum size threshold
      if (pixelWidth < MIN_SIZE_PX || pixelHeight < MIN_SIZE_PX) return;

      const region: NormalizedRect = {
        x: x1 / pageWidth,
        y: y1 / pageHeight,
        width: pixelWidth / pageWidth,
        height: pixelHeight / pageHeight,
      };

      onRegionSelectedRef.current({ region, pageNumber: activePageNumRef.current });
    };

    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [enabled, containerRef, getPageElement, pageNumber, getPageFromPoint]);

  return { isSelecting, selectionRect, activeRegionPage };
}
