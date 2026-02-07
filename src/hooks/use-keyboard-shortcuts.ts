"use client";

import { useEffect } from "react";
import { usePDFStore } from "@/stores/pdf-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { deleteAnnotation as deleteAnnotationApi } from "@/lib/annotations";

export function useKeyboardShortcuts() {
  const { nextPage, previousPage, zoomIn, zoomOut } = usePDFStore();
  const { toggleHighlightMode, selectedAnnotationId, removeAnnotation, selectAnnotation } =
    useAnnotationStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          previousPage();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextPage();
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomIn();
          break;
        case "-":
          e.preventDefault();
          zoomOut();
          break;
        case "h":
        case "H":
          e.preventDefault();
          toggleHighlightMode();
          break;
        case "Delete":
        case "Backspace":
          if (selectedAnnotationId) {
            e.preventDefault();
            const id = selectedAnnotationId;
            removeAnnotation(id);
            selectAnnotation(null);
            deleteAnnotationApi(id).catch(console.error);
          }
          break;
        case "Escape":
          e.preventDefault();
          selectAnnotation(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, previousPage, zoomIn, zoomOut, toggleHighlightMode, selectedAnnotationId, removeAnnotation, selectAnnotation]);
}
