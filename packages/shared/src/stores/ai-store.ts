import { create } from "zustand";
import type { AIMessage, Screenshot } from "../types";
import { useAnnotationStore, setOnHighlightModeActivated } from "./annotation-store";
import { useDrawingStore, setOnDrawingModeActivated } from "./drawing-store";

const MAX_SCREENSHOTS = 5;

interface AIState {
  isAIMode: boolean;
  isSidebarOpen: boolean;
  documentId: string | null;
  pendingScreenshots: Screenshot[];
  messages: AIMessage[];
  isStreaming: boolean;
  streamingText: string;
  error: string | null;
}

interface AIActions {
  toggleAIMode: () => void;
  setAIMode: (mode: boolean) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setDocumentId: (documentId: string) => void;
  addScreenshot: (screenshot: Screenshot) => void;
  removeScreenshot: (id: string) => void;
  clearScreenshots: () => void;
  addMessage: (message: AIMessage) => void;
  appendStreamingText: (text: string) => void;
  finalizeStreaming: () => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  clearConversation: () => void;
  reset: () => void;
}

export type AIStore = AIState & AIActions;

const initialState: AIState = {
  isAIMode: false,
  isSidebarOpen: false,
  documentId: null,
  pendingScreenshots: [],
  messages: [],
  isStreaming: false,
  streamingText: "",
  error: null,
};

export const useAIStore = create<AIStore>((set, get) => ({
  ...initialState,

  toggleAIMode: () => {
    const newMode = !get().isAIMode;
    set({ isAIMode: newMode });
    if (newMode) {
      useAnnotationStore.getState().setHighlightMode(false);
      useDrawingStore.getState().setDrawingMode(false);
    }
  },

  setAIMode: (mode) => {
    set({ isAIMode: mode });
    if (mode) {
      useAnnotationStore.getState().setHighlightMode(false);
      useDrawingStore.getState().setDrawingMode(false);
    }
  },

  openSidebar: () => set({ isSidebarOpen: true }),

  closeSidebar: () => set({ isSidebarOpen: false }),

  setDocumentId: (documentId) => set({ documentId }),

  addScreenshot: (screenshot) => {
    const { pendingScreenshots } = get();
    if (pendingScreenshots.length >= MAX_SCREENSHOTS) return;
    set({
      pendingScreenshots: [...pendingScreenshots, screenshot],
      isSidebarOpen: true,
    });
  },

  removeScreenshot: (id) => {
    set({
      pendingScreenshots: get().pendingScreenshots.filter((s) => s.id !== id),
    });
  },

  clearScreenshots: () => set({ pendingScreenshots: [] }),

  addMessage: (message) => {
    set({ messages: [...get().messages, message] });
  },

  appendStreamingText: (text) => {
    set({ streamingText: get().streamingText + text });
  },

  finalizeStreaming: () => {
    const { streamingText } = get();
    if (streamingText) {
      set({
        messages: [...get().messages, { role: "assistant", content: streamingText }],
        streamingText: "",
        isStreaming: false,
      });
    } else {
      set({ isStreaming: false });
    }
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setError: (error) => set({ error }),

  clearConversation: () => {
    set({
      messages: [],
      pendingScreenshots: [],
      streamingText: "",
      isStreaming: false,
      error: null,
    });
  },

  reset: () => set(initialState),
}));

// Register callback so annotation-store can turn off AI mode when highlight mode activates
setOnHighlightModeActivated(() => {
  useAIStore.getState().setAIMode(false);
});

// Register callback so drawing-store can turn off AI + highlight when drawing mode activates
setOnDrawingModeActivated(() => {
  useAIStore.getState().setAIMode(false);
  useAnnotationStore.getState().setHighlightMode(false);
});
