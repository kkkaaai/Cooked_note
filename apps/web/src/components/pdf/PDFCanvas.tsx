"use client";

import { useCallback, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "@/lib/pdf-worker";
import { Loader2 } from "lucide-react";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { useAnnotationStore } from "@cookednote/shared/stores/annotation-store";
import { useAIStore } from "@cookednote/shared/stores/ai-store";
import { useTextSelection } from "@/hooks/use-text-selection";
import { useRegionSelect } from "@/hooks/use-region-select";
import { captureRegion } from "@/lib/screenshot";
import { HighlightLayer } from "./HighlightLayer";
import { DrawingLayer } from "./DrawingLayer";
import { RegionSelectOverlay } from "./RegionSelectOverlay";
import { ContinuousScrollView } from "./ContinuousScrollView";
import { SelectionPopup } from "./SelectionPopup";
import { ConversationBadge } from "@/components/ai/ConversationBadge";
import { useConversationStore } from "@/stores/conversation-store";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import { useDrawingSave } from "@/hooks/use-drawing-save";
import {
  fetchAnnotations,
  createAnnotation as createAnnotationApi,
} from "@/lib/annotations";
import type { HighlightColor, Screenshot } from "@cookednote/shared/types";
import { useToast } from "@/hooks/use-toast";

interface PDFCanvasProps {
  fileUrl: string;
}

export function PDFCanvas({ fileUrl }: PDFCanvasProps) {
  const { currentPage, scale, numPages, setDocument, documentId, viewMode } =
    usePDFStore();
  const {
    addAnnotation,
    setAnnotations,
    activeColor,
    isHighlightMode,
    selectAnnotation,
    reset: resetAnnotations,
  } = useAnnotationStore();
  const isAIMode = useAIStore((s) => s.isAIMode);
  const isDrawingMode = useDrawingStore((s) => s.isDrawingMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load/save drawing annotations
  useDrawingSave(documentId);

  // Helper: find which page a point lands on (for continuous mode)
  const getPageFromPoint = useCallback((x: number, y: number) => {
    if (!containerRef.current) return null;
    const wrappers = Array.from(containerRef.current.querySelectorAll("[data-page-number]"));
    for (const wrapper of wrappers) {
      const rect = wrapper.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom && x >= rect.left && x <= rect.right) {
        // react-pdf's Page div also has data-page-number, so we may hit
        // the Page itself instead of our outer wrapper
        const pageEl = wrapper.classList.contains("react-pdf__Page")
          ? wrapper as HTMLElement
          : wrapper.querySelector(".react-pdf__Page") as HTMLElement;
        if (!pageEl) return null;
        return {
          pageNumber: Number(wrapper.getAttribute("data-page-number")),
          pageElement: pageEl,
        };
      }
    }
    return null;
  }, []);

  const { selection, clearSelection } = useTextSelection({
    containerRef,
    pageNumber: currentPage,
    enabled: !isAIMode && !isDrawingMode,
    resolvePageFromSelection: viewMode === "continuous",
  });

  // Region selection for AI mode (screenshot capture)
  const handleRegionSelected = useCallback(
    ({ region, pageNumber }: { region: import("@cookednote/shared/types").NormalizedRect; pageNumber: number }) => {
      let pageEl: HTMLElement | null;

      if (viewMode === "continuous") {
        pageEl = containerRef.current?.querySelector(
          `[data-page-number="${pageNumber}"] .react-pdf__Page`
        ) as HTMLElement | null;
      } else {
        pageEl = containerRef.current?.querySelector(
          ".react-pdf__Page"
        ) as HTMLElement | null;
      }
      if (!pageEl) return;

      const base64 = captureRegion(pageEl, region);
      if (!base64) {
        toast({
          title: "Capture failed",
          description: "Could not capture the selected region. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const screenshot: Screenshot = {
        id: crypto.randomUUID(),
        base64,
        pageNumber,
        region,
        createdAt: Date.now(),
      };

      useAIStore.getState().addScreenshot(screenshot);
    },
    [toast, viewMode]
  );

  const { isSelecting, selectionRect, activeRegionPage } = useRegionSelect({
    containerRef,
    pageNumber: currentPage,
    enabled: isAIMode && !isDrawingMode,
    onRegionSelected: handleRegionSelected,
    getPageFromPoint: viewMode === "continuous" ? getPageFromPoint : undefined,
  });

  const fetchConversations = useConversationStore((s) => s.fetchConversations);

  // Fetch annotations and conversations on document load
  useEffect(() => {
    if (!documentId) return;
    fetchAnnotations(documentId)
      .then(setAnnotations)
      .catch((err) => {
        console.error("Failed to load annotations:", err);
      });
    fetchConversations(documentId);
    return () => resetAnnotations();
  }, [documentId, setAnnotations, resetAnnotations, fetchConversations]);

  // Auto-highlight in highlight mode
  useEffect(() => {
    if (isHighlightMode && selection) {
      handleCreateHighlight(activeColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, isHighlightMode]);

  // Deselect annotation when clicking on empty space
  const handleContainerClick = useCallback(() => {
    const { selectedAnnotationId } = useAnnotationStore.getState();
    if (selectedAnnotationId) {
      selectAnnotation(null);
    }
  }, [selectAnnotation]);

  const handleCreateHighlight = async (color: HighlightColor) => {
    if (!selection || !documentId) return;

    const tempId = crypto.randomUUID();
    const optimisticAnnotation = {
      id: tempId,
      documentId,
      userId: "",
      type: "highlight" as const,
      pageNumber: selection.pageNumber,
      color: color.value,
      position: { rects: selection.rects },
      selectedText: selection.selectedText,
      content: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addAnnotation(optimisticAnnotation);
    clearSelection();

    try {
      const saved = await createAnnotationApi({
        documentId,
        type: "highlight",
        pageNumber: selection.pageNumber,
        color: color.value,
        position: { rects: selection.rects },
        selectedText: selection.selectedText,
      });
      // Replace temp with server version
      useAnnotationStore.getState().removeAnnotation(tempId);
      useAnnotationStore.getState().addAnnotation(saved);
    } catch {
      useAnnotationStore.getState().removeAnnotation(tempId);
      toast({
        title: "Error",
        description: "Failed to save highlight. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: pages }: { numPages: number }) => {
      if (documentId) {
        setDocument(documentId, pages);
      }
    },
    [documentId, setDocument]
  );

  // Reset scroll when switching view modes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [viewMode]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 overflow-auto bg-muted/30 p-4${
        viewMode === "single" ? " items-start justify-center" : " justify-center"
      }${isDrawingMode ? " cursor-crosshair" : isHighlightMode ? " cursor-text" : isAIMode ? " cursor-crosshair" : ""}`}
      onClick={handleContainerClick}
    >
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading PDF...
          </div>
        }
        error={
          <div className="text-center text-destructive">
            <p className="font-medium">Failed to load PDF</p>
            <p className="mt-1 text-sm">
              The document could not be loaded. Please try again.
            </p>
          </div>
        }
      >
        {viewMode === "single" && numPages > 0 && (
          <div className="relative">
            {documentId && (
              <ConversationBadge
                documentId={documentId}
                pageNumber={currentPage}
              />
            )}
            <Page
              pageNumber={currentPage}
              scale={scale}
              loading={
                <div className="flex h-[800px] w-[600px] items-center justify-center bg-white shadow-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
              className="shadow-lg"
            >
              <HighlightLayer pageNumber={currentPage} />
              <DrawingLayer pageNumber={currentPage} />
              {isAIMode && (
                <RegionSelectOverlay
                  isSelecting={isSelecting}
                  selectionRect={selectionRect}
                />
              )}
            </Page>
          </div>
        )}
        {viewMode === "continuous" && numPages > 0 && (
          <ContinuousScrollView
            numPages={numPages}
            scale={scale}
            containerRef={containerRef}
            isAIMode={isAIMode}
            isSelecting={isSelecting}
            selectionRect={selectionRect}
            activeRegionPage={activeRegionPage}
            documentId={documentId || undefined}
          />
        )}
      </Document>

      {/* Selection popup (when not in highlight mode and not in AI mode) */}
      {selection && !isHighlightMode && !isAIMode && selection.popupPosition && (
        <SelectionPopup
          position={selection.popupPosition}
          onHighlight={handleCreateHighlight}
          onDismiss={clearSelection}
        />
      )}
    </div>
  );
}
