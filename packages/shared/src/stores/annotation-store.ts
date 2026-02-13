import { create } from "zustand";
import type { Annotation, HighlightColor } from "../types";
import { HIGHLIGHT_COLORS } from "../types";
import { useDrawingStore } from "./drawing-store";

// Callback to notify when highlight mode is activated (used by ai-store to deactivate AI mode)
let onHighlightModeActivated: (() => void) | null = null;

export function setOnHighlightModeActivated(callback: (() => void) | null) {
  onHighlightModeActivated = callback;
}

interface AnnotationState {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  activeColor: HighlightColor;
  isHighlightMode: boolean;
  isLoading: boolean;
}

interface AnnotationActions {
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  mergeAnnotation: (serverAnnotation: Annotation) => void;
  selectAnnotation: (id: string | null) => void;
  setActiveColor: (color: HighlightColor) => void;
  toggleHighlightMode: () => void;
  setHighlightMode: (mode: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export type AnnotationStore = AnnotationState & AnnotationActions;

const initialState: AnnotationState = {
  annotations: [],
  selectedAnnotationId: null,
  activeColor: HIGHLIGHT_COLORS[0],
  isHighlightMode: false,
  isLoading: false,
};

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  ...initialState,

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) =>
    set({ annotations: [...get().annotations, annotation] }),

  removeAnnotation: (id) =>
    set({
      annotations: get().annotations.filter((a) => a.id !== id),
      selectedAnnotationId:
        get().selectedAnnotationId === id ? null : get().selectedAnnotationId,
    }),

  updateAnnotation: (id, updates) =>
    set({
      annotations: get().annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }),

  mergeAnnotation: (serverAnnotation) => {
    const existing = get().annotations.find((a) => a.id === serverAnnotation.id);
    if (!existing) {
      // New annotation from server — add it
      set({ annotations: [...get().annotations, serverAnnotation] });
      return;
    }
    // LWW: accept server version if syncVersion is higher
    const serverVersion = serverAnnotation.syncVersion ?? 0;
    const localVersion = existing.syncVersion ?? 0;
    if (serverVersion > localVersion) {
      set({
        annotations: get().annotations.map((a) =>
          a.id === serverAnnotation.id ? { ...a, ...serverAnnotation } : a
        ),
      });
    }
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  setActiveColor: (color) => set({ activeColor: color }),

  toggleHighlightMode: () => {
    const newMode = !get().isHighlightMode;
    set({ isHighlightMode: newMode });
    if (newMode) {
      useDrawingStore.getState().setDrawingMode(false);
      if (onHighlightModeActivated) {
        onHighlightModeActivated();
      }
    }
  },

  setHighlightMode: (mode) => set({ isHighlightMode: mode }),

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));

// Selector: get annotations for a specific page
export function selectPageAnnotations(pageNumber: number) {
  return (state: AnnotationStore) =>
    state.annotations.filter((a) => a.pageNumber === pageNumber);
}
