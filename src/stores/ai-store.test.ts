import { describe, it, expect, beforeEach } from "vitest";
import { useAIStore } from "./ai-store";
import { useAnnotationStore } from "./annotation-store";

describe("ai-store", () => {
  beforeEach(() => {
    useAIStore.getState().reset();
    useAnnotationStore.getState().reset();
  });

  describe("initial state", () => {
    it("has AI mode off", () => {
      expect(useAIStore.getState().isAIMode).toBe(false);
    });

    it("has sidebar closed", () => {
      expect(useAIStore.getState().isSidebarOpen).toBe(false);
    });

    it("has no selected text", () => {
      expect(useAIStore.getState().selectedText).toBeNull();
    });

    it("has empty messages", () => {
      expect(useAIStore.getState().messages).toEqual([]);
    });

    it("is not streaming", () => {
      expect(useAIStore.getState().isStreaming).toBe(false);
    });

    it("has no error", () => {
      expect(useAIStore.getState().error).toBeNull();
    });

    it("has empty streaming text", () => {
      expect(useAIStore.getState().streamingText).toBe("");
    });
  });

  describe("toggleAIMode", () => {
    it("toggles from off to on", () => {
      useAIStore.getState().toggleAIMode();
      expect(useAIStore.getState().isAIMode).toBe(true);
    });

    it("toggles from on to off", () => {
      useAIStore.getState().setAIMode(true);
      useAIStore.getState().toggleAIMode();
      expect(useAIStore.getState().isAIMode).toBe(false);
    });

    it("turns off highlight mode when activating AI mode", () => {
      useAnnotationStore.getState().setHighlightMode(true);
      useAIStore.getState().toggleAIMode();
      expect(useAIStore.getState().isAIMode).toBe(true);
      expect(useAnnotationStore.getState().isHighlightMode).toBe(false);
    });

    it("does not affect highlight mode when deactivating AI mode", () => {
      useAIStore.getState().setAIMode(true);
      useAnnotationStore.getState().setHighlightMode(true);
      useAIStore.getState().toggleAIMode();
      expect(useAnnotationStore.getState().isHighlightMode).toBe(true);
    });
  });

  describe("setAIMode", () => {
    it("sets AI mode directly", () => {
      useAIStore.getState().setAIMode(true);
      expect(useAIStore.getState().isAIMode).toBe(true);
    });

    it("turns off highlight mode when setting AI mode on", () => {
      useAnnotationStore.getState().setHighlightMode(true);
      useAIStore.getState().setAIMode(true);
      expect(useAnnotationStore.getState().isHighlightMode).toBe(false);
    });
  });

  describe("sidebar", () => {
    it("opens sidebar", () => {
      useAIStore.getState().openSidebar();
      expect(useAIStore.getState().isSidebarOpen).toBe(true);
    });

    it("closes sidebar", () => {
      useAIStore.getState().openSidebar();
      useAIStore.getState().closeSidebar();
      expect(useAIStore.getState().isSidebarOpen).toBe(false);
    });
  });

  describe("startExplanation", () => {
    it("sets documentId, selectedText, and pageNumber", () => {
      useAIStore.getState().startExplanation("doc-1", "test text", 3);
      const state = useAIStore.getState();
      expect(state.documentId).toBe("doc-1");
      expect(state.selectedText).toBe("test text");
      expect(state.pageNumber).toBe(3);
    });

    it("clears previous messages", () => {
      useAIStore.getState().addMessage({ role: "user", content: "old" });
      useAIStore.getState().startExplanation("doc-1", "text", 1);
      expect(useAIStore.getState().messages).toEqual([]);
    });

    it("opens sidebar", () => {
      useAIStore.getState().startExplanation("doc-1", "text", 1);
      expect(useAIStore.getState().isSidebarOpen).toBe(true);
    });

    it("sets streaming to true", () => {
      useAIStore.getState().startExplanation("doc-1", "text", 1);
      expect(useAIStore.getState().isStreaming).toBe(true);
    });

    it("clears previous error", () => {
      useAIStore.getState().setError("previous error");
      useAIStore.getState().startExplanation("doc-1", "text", 1);
      expect(useAIStore.getState().error).toBeNull();
    });
  });

  describe("appendStreamingText", () => {
    it("appends text to streamingText", () => {
      useAIStore.getState().appendStreamingText("Hello");
      expect(useAIStore.getState().streamingText).toBe("Hello");
    });

    it("accumulates across multiple calls", () => {
      useAIStore.getState().appendStreamingText("Hello");
      useAIStore.getState().appendStreamingText(" world");
      expect(useAIStore.getState().streamingText).toBe("Hello world");
    });
  });

  describe("finalizeStreaming", () => {
    it("adds assistant message with streamingText content", () => {
      useAIStore.getState().appendStreamingText("AI response");
      useAIStore.getState().finalizeStreaming();
      const messages = useAIStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: "assistant", content: "AI response" });
    });

    it("clears streamingText", () => {
      useAIStore.getState().appendStreamingText("text");
      useAIStore.getState().finalizeStreaming();
      expect(useAIStore.getState().streamingText).toBe("");
    });

    it("sets streaming to false", () => {
      useAIStore.getState().setStreaming(true);
      useAIStore.getState().appendStreamingText("text");
      useAIStore.getState().finalizeStreaming();
      expect(useAIStore.getState().isStreaming).toBe(false);
    });

    it("does not add empty message if no streaming text", () => {
      useAIStore.getState().setStreaming(true);
      useAIStore.getState().finalizeStreaming();
      expect(useAIStore.getState().messages).toEqual([]);
      expect(useAIStore.getState().isStreaming).toBe(false);
    });
  });

  describe("addMessage", () => {
    it("appends message to messages array", () => {
      useAIStore.getState().addMessage({ role: "user", content: "question" });
      expect(useAIStore.getState().messages).toEqual([
        { role: "user", content: "question" },
      ]);
    });

    it("preserves existing messages", () => {
      useAIStore.getState().addMessage({ role: "user", content: "q1" });
      useAIStore.getState().addMessage({ role: "assistant", content: "a1" });
      expect(useAIStore.getState().messages).toHaveLength(2);
    });
  });

  describe("clearConversation", () => {
    it("clears messages and selectedText", () => {
      useAIStore.getState().startExplanation("doc-1", "text", 1);
      useAIStore.getState().addMessage({ role: "assistant", content: "hi" });
      useAIStore.getState().clearConversation();
      expect(useAIStore.getState().messages).toEqual([]);
      expect(useAIStore.getState().selectedText).toBeNull();
    });

    it("clears streaming state", () => {
      useAIStore.getState().setStreaming(true);
      useAIStore.getState().appendStreamingText("partial");
      useAIStore.getState().clearConversation();
      expect(useAIStore.getState().isStreaming).toBe(false);
      expect(useAIStore.getState().streamingText).toBe("");
    });

    it("clears error", () => {
      useAIStore.getState().setError("some error");
      useAIStore.getState().clearConversation();
      expect(useAIStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      useAIStore.getState().startExplanation("doc-1", "text", 1);
      useAIStore.getState().addMessage({ role: "assistant", content: "hi" });
      useAIStore.getState().setError("error");
      useAIStore.getState().setAIMode(true);

      useAIStore.getState().reset();

      const state = useAIStore.getState();
      expect(state.isAIMode).toBe(false);
      expect(state.isSidebarOpen).toBe(false);
      expect(state.selectedText).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.isStreaming).toBe(false);
      expect(state.streamingText).toBe("");
      expect(state.error).toBeNull();
    });
  });
});
