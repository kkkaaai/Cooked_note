import { create } from "zustand";
import type { AIMessage } from "@/types";
import { useAnnotationStore, setOnHighlightModeActivated } from "@/stores/annotation-store";

interface AIState {
  isAIMode: boolean;
  isSidebarOpen: boolean;
  selectedText: string | null;
  pageNumber: number | null;
  documentId: string | null;
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
  startExplanation: (documentId: string, selectedText: string, pageNumber: number) => void;
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
  selectedText: null,
  pageNumber: null,
  documentId: null,
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
      // AI mode and highlight mode are mutually exclusive
      useAnnotationStore.getState().setHighlightMode(false);
    }
  },

  setAIMode: (mode) => {
    set({ isAIMode: mode });
    if (mode) {
      useAnnotationStore.getState().setHighlightMode(false);
    }
  },

  openSidebar: () => set({ isSidebarOpen: true }),

  closeSidebar: () => set({ isSidebarOpen: false }),

  startExplanation: (documentId, selectedText, pageNumber) => {
    set({
      documentId,
      selectedText,
      pageNumber,
      messages: [],
      streamingText: "",
      isStreaming: true,
      isSidebarOpen: true,
      error: null,
    });
  },

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
      selectedText: null,
      pageNumber: null,
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
