import { create } from "zustand";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

export type ViewMode = "single" | "continuous";

interface PDFState {
  documentId: string | null;
  numPages: number;
  currentPage: number;
  scale: number;
  viewMode: ViewMode;
  scrollTarget: number | null;
}

interface PDFActions {
  setDocument: (id: string, numPages: number) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScale: (scale: number) => void;
  setViewMode: (mode: ViewMode) => void;
  clearScrollTarget: () => void;
  reset: () => void;
}

export type PDFStore = PDFState & PDFActions;

export const usePDFStore = create<PDFStore>((set, get) => ({
  documentId: null,
  numPages: 0,
  currentPage: 1,
  scale: 1.0,
  viewMode: "single",
  scrollTarget: null,

  setDocument: (id, numPages) =>
    set({ documentId: id, numPages, currentPage: 1, scale: 1.0 }),

  setCurrentPage: (page) => {
    const { numPages, viewMode } = get();
    if (page >= 1 && page <= numPages) {
      set({
        currentPage: page,
        scrollTarget: viewMode === "continuous" ? page : null,
      });
    }
  },

  nextPage: () => {
    const { currentPage, numPages, viewMode } = get();
    if (currentPage < numPages) {
      const next = currentPage + 1;
      set({
        currentPage: next,
        scrollTarget: viewMode === "continuous" ? next : null,
      });
    }
  },

  previousPage: () => {
    const { currentPage, viewMode } = get();
    if (currentPage > 1) {
      const prev = currentPage - 1;
      set({
        currentPage: prev,
        scrollTarget: viewMode === "continuous" ? prev : null,
      });
    }
  },

  zoomIn: () => {
    const { scale } = get();
    const newScale = Math.min(scale + SCALE_STEP, MAX_SCALE);
    set({ scale: newScale });
  },

  zoomOut: () => {
    const { scale } = get();
    const newScale = Math.max(scale - SCALE_STEP, MIN_SCALE);
    set({ scale: newScale });
  },

  setScale: (scale) => {
    const clamped = Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
    set({ scale: clamped });
  },

  setViewMode: (mode) => set({ viewMode: mode, scrollTarget: null }),

  clearScrollTarget: () => set({ scrollTarget: null }),

  reset: () =>
    set({
      documentId: null,
      numPages: 0,
      currentPage: 1,
      scale: 1.0,
      viewMode: "single",
      scrollTarget: null,
    }),
}));
