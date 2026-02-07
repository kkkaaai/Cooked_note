import { create } from "zustand";
import type { Annotation, HighlightColor } from "@/types";
import { HIGHLIGHT_COLORS } from "@/types";

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

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  setActiveColor: (color) => set({ activeColor: color }),

  toggleHighlightMode: () => set({ isHighlightMode: !get().isHighlightMode }),

  setHighlightMode: (mode) => set({ isHighlightMode: mode }),

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));

// Selector: get annotations for a specific page
export function selectPageAnnotations(pageNumber: number) {
  return (state: AnnotationStore) =>
    state.annotations.filter((a) => a.pageNumber === pageNumber);
}
