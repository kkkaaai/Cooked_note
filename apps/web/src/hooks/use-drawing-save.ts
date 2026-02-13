"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import {
  fetchAnnotations,
  createAnnotation,
  updateAnnotation,
} from "@/lib/annotations";
import type { DrawingPosition } from "@cookednote/shared/types";
import { isDrawingPosition } from "@cookednote/shared/types";

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Hook that manages loading and saving drawing annotations.
 * - Loads existing drawing annotations into the drawing store on mount
 * - Debounced save of dirty pages after strokes are committed
 * - Saves remaining dirty pages on unmount
 */
export function useDrawingSave(documentId: string | null) {
  const drawingAnnotationIds = useRef<Map<number, string>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  // Load existing drawing annotations into store
  useEffect(() => {
    if (!documentId) return;
    isMounted.current = true;

    fetchAnnotations(documentId)
      .then((annotations) => {
        if (!isMounted.current) return;
        for (const ann of annotations) {
          if (ann.type === "drawing" && isDrawingPosition(ann.position)) {
            drawingAnnotationIds.current.set(ann.pageNumber, ann.id);
            useDrawingStore
              .getState()
              .loadPageStrokes(ann.pageNumber, ann.position.strokes);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load drawing annotations:", err);
      });

    return () => {
      isMounted.current = false;
    };
  }, [documentId]);

  const saveDirtyPages = useCallback(async () => {
    if (!documentId) return;

    const store = useDrawingStore.getState();
    const dirtyPages = store.getDirtyPages();

    for (const pageNumber of dirtyPages) {
      const strokes = store.getPageStrokes(pageNumber);
      const position: DrawingPosition = { strokes };
      const existingId = drawingAnnotationIds.current.get(pageNumber);

      try {
        if (existingId) {
          await updateAnnotation(existingId, { position });
        } else {
          const saved = await createAnnotation({
            documentId,
            type: "drawing",
            pageNumber,
            position,
          });
          drawingAnnotationIds.current.set(pageNumber, saved.id);
        }
        store.markPageClean(pageNumber);
      } catch (err) {
        console.error(`Failed to save drawing for page ${pageNumber}:`, err);
      }
    }
  }, [documentId]);

  // Subscribe to dirty pages changes and debounce save
  useEffect(() => {
    if (!documentId) return;

    const unsub = useDrawingStore.subscribe((state, prevState) => {
      if (state.dirtyPages.size > 0 && state.dirtyPages !== prevState.dirtyPages) {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
          saveDirtyPages();
        }, SAVE_DEBOUNCE_MS);
      }
    });

    return () => {
      unsub();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Save remaining dirty pages on unmount
      saveDirtyPages();
    };
  }, [documentId, saveDirtyPages]);
}
