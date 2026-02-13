"use client";

import { useEffect } from "react";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { useAnnotationStore } from "@cookednote/shared/stores/annotation-store";
import { useAIStore } from "@cookednote/shared/stores/ai-store";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import { deleteAnnotation as deleteAnnotationApi } from "@/lib/annotations";

export function useKeyboardShortcuts() {
  const { nextPage, previousPage, zoomIn, zoomOut, viewMode, setViewMode } = usePDFStore();
  const { toggleHighlightMode, selectedAnnotationId, removeAnnotation, selectAnnotation } =
    useAnnotationStore();
  const { toggleAIMode, isSidebarOpen, closeSidebar } = useAIStore();
  const { toggleDrawingMode, undo: drawingUndo, redo: drawingRedo, isDrawingMode } = useDrawingStore();

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

      // Ctrl+Z / Ctrl+Shift+Z for drawing undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (isDrawingMode) {
          e.preventDefault();
          if (e.shiftKey) {
            drawingRedo();
          } else {
            drawingUndo();
          }
          return;
        }
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
        case "d":
        case "D":
          e.preventDefault();
          toggleDrawingMode();
          break;
        case "a":
        case "A":
          e.preventDefault();
          toggleAIMode();
          break;
        case "v":
        case "V":
          e.preventDefault();
          setViewMode(viewMode === "single" ? "continuous" : "single");
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
          if (isSidebarOpen) {
            closeSidebar();
          } else {
            selectAnnotation(null);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, previousPage, zoomIn, zoomOut, toggleHighlightMode, toggleDrawingMode, drawingUndo, drawingRedo, isDrawingMode, selectedAnnotationId, removeAnnotation, selectAnnotation, toggleAIMode, isSidebarOpen, closeSidebar, viewMode, setViewMode]);
}
