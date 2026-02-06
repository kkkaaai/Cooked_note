"use client";

import { useCallback } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "@/lib/pdf-worker";
import { Loader2 } from "lucide-react";
import { usePDFStore } from "@/stores/pdf-store";

interface PDFCanvasProps {
  fileUrl: string;
}

export function PDFCanvas({ fileUrl }: PDFCanvasProps) {
  const { currentPage, scale, numPages, setDocument, documentId } =
    usePDFStore();

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: pages }: { numPages: number }) => {
      if (documentId) {
        setDocument(documentId, pages);
      }
    },
    [documentId, setDocument]
  );

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-4">
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
          />
        )}
      </Document>
    </div>
  );
}
