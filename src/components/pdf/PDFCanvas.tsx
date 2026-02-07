"use client";

import { useCallback, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "@/lib/pdf-worker";
import { Loader2 } from "lucide-react";
import { usePDFStore } from "@/stores/pdf-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useAIStore } from "@/stores/ai-store";
import { useTextSelection } from "@/hooks/use-text-selection";
import { useRegionSelect } from "@/hooks/use-region-select";
import { captureRegion } from "@/lib/screenshot";
import { HighlightLayer } from "./HighlightLayer";
import { RegionSelectOverlay } from "./RegionSelectOverlay";
import { SelectionPopup } from "./SelectionPopup";
import {
  fetchAnnotations,
  createAnnotation as createAnnotationApi,
} from "@/lib/annotations";
import type { HighlightColor, Screenshot } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface PDFCanvasProps {
  fileUrl: string;
}

export function PDFCanvas({ fileUrl }: PDFCanvasProps) {
  const { currentPage, scale, numPages, setDocument, documentId } =
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { selection, clearSelection } = useTextSelection({
    containerRef,
    pageNumber: currentPage,
    enabled: !isAIMode,
  });

  // Region selection for AI mode (screenshot capture)
  const handleRegionSelected = useCallback(
    ({ region, pageNumber }: { region: import("@/types").NormalizedRect; pageNumber: number }) => {
      const pageEl = containerRef.current?.querySelector(
        ".react-pdf__Page"
      ) as HTMLElement | null;
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
    [toast]
  );

  const { isSelecting, selectionRect } = useRegionSelect({
    containerRef,
    pageNumber: currentPage,
    enabled: isAIMode,
    onRegionSelected: handleRegionSelected,
  });

  // Fetch annotations on document load
  useEffect(() => {
    if (!documentId) return;
    fetchAnnotations(documentId)
      .then(setAnnotations)
      .catch((err) => {
        console.error("Failed to load annotations:", err);
      });
    return () => resetAnnotations();
  }, [documentId, setAnnotations, resetAnnotations]);

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

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-4${
        isHighlightMode ? " cursor-text" : isAIMode ? " cursor-crosshair" : ""
      }`}
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
        {numPages > 0 && (
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
            {isAIMode && (
              <RegionSelectOverlay
                isSelecting={isSelecting}
                selectionRect={selectionRect}
              />
            )}
          </Page>
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
