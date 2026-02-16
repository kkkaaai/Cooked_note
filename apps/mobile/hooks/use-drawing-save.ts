import { useCallback, useEffect, useRef } from "react";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import { useApiFetch } from "@/lib/api";
import type {
  Annotation,
  DrawingPosition,
} from "@cookednote/shared/types";
import { isDrawingPosition } from "@cookednote/shared/types";

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Hook that manages loading and saving drawing annotations on mobile.
 * Same logic as the web version but uses the mobile `apiFetch` helper.
 */
export function useDrawingSave(documentId: string | null) {
  const apiFetch = useApiFetch();
  const drawingAnnotationIds = useRef<Map<number, string>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  // Load existing drawing annotations into store
  useEffect(() => {
    if (!documentId) return;
    isMounted.current = true;

    (async () => {
      try {
        const res = await apiFetch(`/api/annotations?documentId=${documentId}`);
        if (!res.ok) return;
        const annotations: Annotation[] = await res.json();
        if (!isMounted.current) return;

        for (const ann of annotations) {
          if (ann.type === "drawing" && isDrawingPosition(ann.position)) {
            drawingAnnotationIds.current.set(ann.pageNumber, ann.id);
            useDrawingStore
              .getState()
              .loadPageStrokes(ann.pageNumber, ann.position.strokes);
          }
        }
      } catch (err) {
        console.error("Failed to load drawing annotations:", err);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, [documentId, apiFetch]);

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
          const res = await apiFetch(`/api/annotations/${existingId}`, {
            method: "PATCH",
            body: JSON.stringify({ position }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`PATCH ${res.status}: ${text}`);
          }
        } else {
          const res = await apiFetch("/api/annotations", {
            method: "POST",
            body: JSON.stringify({
              documentId,
              type: "drawing",
              pageNumber,
              position,
            }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`POST ${res.status}: ${text}`);
          }
          const saved: Annotation = await res.json();
          drawingAnnotationIds.current.set(pageNumber, saved.id);
        }
        store.markPageClean(pageNumber);
      } catch (err) {
        console.error(`Failed to save drawing for page ${pageNumber}:`, err);
      }
    }
  }, [documentId, apiFetch]);

  // Subscribe to dirty pages changes and debounce save
  useEffect(() => {
    if (!documentId) return;

    const unsub = useDrawingStore.subscribe((state, prevState) => {
      if (
        state.dirtyPages.size > 0 &&
        state.dirtyPages !== prevState.dirtyPages
      ) {
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
      saveDirtyPages();
    };
  }, [documentId, saveDirtyPages]);
}
