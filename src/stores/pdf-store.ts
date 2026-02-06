import { create } from "zustand";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

interface PDFState {
  documentId: string | null;
  numPages: number;
  currentPage: number;
  scale: number;
}

interface PDFActions {
  setDocument: (id: string, numPages: number) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScale: (scale: number) => void;
  reset: () => void;
}

export type PDFStore = PDFState & PDFActions;

export const usePDFStore = create<PDFStore>((set, get) => ({
  documentId: null,
  numPages: 0,
  currentPage: 1,
  scale: 1.0,

  setDocument: (id, numPages) =>
    set({ documentId: id, numPages, currentPage: 1, scale: 1.0 }),

  setCurrentPage: (page) => {
    const { numPages } = get();
    if (page >= 1 && page <= numPages) {
      set({ currentPage: page });
    }
  },

  nextPage: () => {
    const { currentPage, numPages } = get();
    if (currentPage < numPages) {
      set({ currentPage: currentPage + 1 });
    }
  },

  previousPage: () => {
    const { currentPage } = get();
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 });
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

  reset: () =>
    set({ documentId: null, numPages: 0, currentPage: 1, scale: 1.0 }),
}));
