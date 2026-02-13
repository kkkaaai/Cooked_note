"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Page } from "react-pdf";
import { Loader2 } from "lucide-react";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { HighlightLayer } from "./HighlightLayer";
import { DrawingLayer } from "./DrawingLayer";
import { RegionSelectOverlay } from "./RegionSelectOverlay";
import { ConversationBadge } from "@/components/ai/ConversationBadge";
import type { NormalizedRect } from "@cookednote/shared/types";

const PAGE_BUFFER = 2;
const DEFAULT_PAGE_HEIGHT = 800;
const DEFAULT_PAGE_WIDTH = 600;

interface ContinuousScrollViewProps {
  numPages: number;
  scale: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isAIMode: boolean;
  isSelecting: boolean;
  selectionRect: NormalizedRect | null;
  activeRegionPage: number | null;
  documentId?: string;
}

export function ContinuousScrollView({
  numPages,
  scale,
  containerRef,
  isAIMode,
  isSelecting,
  selectionRect,
  activeRegionPage,
  documentId,
}: ContinuousScrollViewProps) {
  const pageDimensions = useRef<Map<number, { width: number; height: number }>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const visiblePages = useRef<Set<number>>(new Set([1]));
  const [renderRange, setRenderRange] = useState<{ start: number; end: number }>({
    start: 1,
    end: Math.min(1 + PAGE_BUFFER, numPages),
  });
  const scrollTargetHandled = useRef(false);

  const updateRenderRange = useCallback(() => {
    const visible = visiblePages.current;
    if (visible.size === 0) return;
    const pages = Array.from(visible);
    const minVisible = Math.min(...pages);
    const maxVisible = Math.max(...pages);
    const start = Math.max(1, minVisible - PAGE_BUFFER);
    const end = Math.min(numPages, maxVisible + PAGE_BUFFER);
    setRenderRange((prev) => {
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });
  }, [numPages]);

  // IntersectionObserver for tracking visible pages
  // Re-creates when renderRange changes to observe newly rendered page wrappers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          const pageNum = Number(entry.target.getAttribute("data-page-number"));
          if (!pageNum) return;
          if (entry.isIntersecting) {
            if (!visiblePages.current.has(pageNum)) {
              visiblePages.current.add(pageNum);
              changed = true;
            }
          } else {
            if (visiblePages.current.has(pageNum)) {
              visiblePages.current.delete(pageNum);
              changed = true;
            }
          }
        });

        if (changed) {
          updateRenderRange();

          // Update currentPage to topmost visible page (only if not handling scrollTarget)
          if (visiblePages.current.size > 0 && !usePDFStore.getState().scrollTarget) {
            const topmost = Math.min(...Array.from(visiblePages.current));
            const { currentPage } = usePDFStore.getState();
            if (topmost !== currentPage) {
              // Directly set without triggering scrollTarget
              usePDFStore.setState({ currentPage: topmost });
            }
          }
        }
      },
      {
        root: container,
        threshold: [0, 0.1, 0.5],
      }
    );

    pageRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages, renderRange, containerRef, updateRenderRange]);

  // Scroll-to-page when scrollTarget changes
  useEffect(() => {
    const checkScrollTarget = () => {
      const { scrollTarget } = usePDFStore.getState();
      if (scrollTarget === null) {
        scrollTargetHandled.current = false;
        return;
      }
      if (scrollTargetHandled.current) return;

      const el = pageRefs.current.get(scrollTarget);
      if (el) {
        scrollTargetHandled.current = true;
        el.scrollIntoView?.({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          usePDFStore.getState().clearScrollTarget();
          scrollTargetHandled.current = false;
        }, 600);
      }
    };

    // Check immediately
    checkScrollTarget();

    // Subscribe to store changes
    const unsub = usePDFStore.subscribe(checkScrollTarget);
    return unsub;
  }, []);

  const handlePageLoadSuccess = useCallback(
    (pageNum: number) =>
      ({ width, height }: { width: number; height: number }) => {
        pageDimensions.current.set(pageNum, { width, height });
      },
    []
  );

  const getEstimatedHeight = useCallback(
    (pageNum: number): number => {
      const dims = pageDimensions.current.get(pageNum);
      if (dims) {
        return dims.height * scale;
      }
      // Use page 1 dimensions as default, or fallback
      const page1 = pageDimensions.current.get(1);
      if (page1) {
        return page1.height * scale;
      }
      return DEFAULT_PAGE_HEIGHT * scale;
    },
    [scale]
  );

  const getEstimatedWidth = useCallback(
    (pageNum: number): number => {
      const dims = pageDimensions.current.get(pageNum);
      if (dims) {
        return dims.width * scale;
      }
      const page1 = pageDimensions.current.get(1);
      if (page1) {
        return page1.width * scale;
      }
      return DEFAULT_PAGE_WIDTH * scale;
    },
    [scale]
  );

  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el);
    } else {
      pageRefs.current.delete(pageNum);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 pb-4">
      {Array.from({ length: numPages }, (_, i) => {
        const pageNum = i + 1;
        const isInRange = pageNum >= renderRange.start && pageNum <= renderRange.end;

        return (
          <div
            key={pageNum}
            ref={(el) => setPageRef(pageNum, el)}
            data-page-number={pageNum}
            className="relative isolate"
            style={
              !isInRange
                ? {
                    height: getEstimatedHeight(pageNum),
                    width: getEstimatedWidth(pageNum),
                  }
                : undefined
            }
          >
            {documentId && isInRange && (
              <ConversationBadge
                documentId={documentId}
                pageNumber={pageNum}
              />
            )}
            {isInRange ? (
              <Page
                pageNumber={pageNum}
                scale={scale}
                onLoadSuccess={handlePageLoadSuccess(pageNum)}
                loading={
                  <div
                    className="flex items-center justify-center bg-white shadow-lg"
                    style={{
                      height: getEstimatedHeight(pageNum),
                      width: getEstimatedWidth(pageNum),
                    }}
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
                className="shadow-lg"
              >
                <HighlightLayer pageNumber={pageNum} />
                <DrawingLayer pageNumber={pageNum} />
                {isAIMode && activeRegionPage === pageNum && (
                  <RegionSelectOverlay
                    isSelecting={isSelecting}
                    selectionRect={selectionRect}
                  />
                )}
              </Page>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
