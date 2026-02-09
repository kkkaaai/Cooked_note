import { describe, it, expect, beforeEach } from "vitest";
import { useAIStore } from "./ai-store";
import { useAnnotationStore } from "./annotation-store";
import type { Screenshot } from "../types";

function makeScreenshot(overrides: Partial<Screenshot> = {}): Screenshot {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    base64: overrides.base64 ?? "data:image/png;base64,abc",
    pageNumber: overrides.pageNumber ?? 1,
    region: overrides.region ?? { x: 0.1, y: 0.1, width: 0.5, height: 0.3 },
    createdAt: overrides.createdAt ?? Date.now(),
  };
}

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

    it("has no pending screenshots", () => {
      expect(useAIStore.getState().pendingScreenshots).toEqual([]);
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

    it("has no documentId", () => {
      expect(useAIStore.getState().documentId).toBeNull();
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

  describe("setDocumentId", () => {
    it("sets document id", () => {
      useAIStore.getState().setDocumentId("doc-1");
      expect(useAIStore.getState().documentId).toBe("doc-1");
    });
  });

  describe("screenshots", () => {
    it("adds a screenshot", () => {
      const ss = makeScreenshot();
      useAIStore.getState().addScreenshot(ss);
      expect(useAIStore.getState().pendingScreenshots).toHaveLength(1);
      expect(useAIStore.getState().pendingScreenshots[0].id).toBe(ss.id);
    });

    it("opens sidebar when adding first screenshot", () => {
      useAIStore.getState().addScreenshot(makeScreenshot());
      expect(useAIStore.getState().isSidebarOpen).toBe(true);
    });

    it("supports multiple screenshots", () => {
      useAIStore.getState().addScreenshot(makeScreenshot({ id: "s1" }));
      useAIStore.getState().addScreenshot(makeScreenshot({ id: "s2" }));
      useAIStore.getState().addScreenshot(makeScreenshot({ id: "s3" }));
      expect(useAIStore.getState().pendingScreenshots).toHaveLength(3);
    });

    it("caps at 5 screenshots", () => {
      for (let i = 0; i < 6; i++) {
        useAIStore.getState().addScreenshot(makeScreenshot({ id: `s${i}` }));
      }
      expect(useAIStore.getState().pendingScreenshots).toHaveLength(5);
    });

    it("removes a screenshot by id", () => {
      useAIStore.getState().addScreenshot(makeScreenshot({ id: "s1" }));
      useAIStore.getState().addScreenshot(makeScreenshot({ id: "s2" }));
      useAIStore.getState().removeScreenshot("s1");
      expect(useAIStore.getState().pendingScreenshots).toHaveLength(1);
      expect(useAIStore.getState().pendingScreenshots[0].id).toBe("s2");
    });

    it("clears all screenshots", () => {
      useAIStore.getState().addScreenshot(makeScreenshot({ id: "s1" }));
      useAIStore.getState().addScreenshot(makeScreenshot({ id: "s2" }));
      useAIStore.getState().clearScreenshots();
      expect(useAIStore.getState().pendingScreenshots).toEqual([]);
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
    it("clears messages and pending screenshots", () => {
      useAIStore.getState().addMessage({ role: "assistant", content: "hi" });
      useAIStore.getState().addScreenshot(makeScreenshot());
      useAIStore.getState().clearConversation();
      expect(useAIStore.getState().messages).toEqual([]);
      expect(useAIStore.getState().pendingScreenshots).toEqual([]);
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
      useAIStore.getState().setDocumentId("doc-1");
      useAIStore.getState().addMessage({ role: "assistant", content: "hi" });
      useAIStore.getState().addScreenshot(makeScreenshot());
      useAIStore.getState().setError("error");
      useAIStore.getState().setAIMode(true);

      useAIStore.getState().reset();

      const state = useAIStore.getState();
      expect(state.isAIMode).toBe(false);
      expect(state.isSidebarOpen).toBe(false);
      expect(state.documentId).toBeNull();
      expect(state.pendingScreenshots).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.isStreaming).toBe(false);
      expect(state.streamingText).toBe("");
      expect(state.error).toBeNull();
    });
  });
});
