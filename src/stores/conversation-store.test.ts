import { describe, it, expect, beforeEach, vi } from "vitest";
import { useConversationStore } from "./conversation-store";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockConversation = {
  id: "conv-1",
  userId: "user-1",
  documentId: "doc-1",
  pageNumber: 3,
  title: "What is this formula?",
  screenshots: JSON.stringify([
    {
      id: "ss-1",
      base64: "data:image/png;base64,abc",
      pageNumber: 3,
      region: { x: 0.1, y: 0.2, width: 0.3, height: 0.2 },
      createdAt: 1000,
    },
  ]),
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
  document: { title: "Calculus Textbook", fileName: "calc.pdf" },
  _count: { messages: 4 },
};

const mockConversationWithMessages = {
  ...mockConversation,
  messages: [
    {
      id: "msg-1",
      conversationId: "conv-1",
      role: "user",
      content: "What is this formula?",
      screenshots: null,
      createdAt: "2026-01-15T00:00:00.000Z",
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      role: "assistant",
      content: "This is the quadratic formula...",
      screenshots: null,
      createdAt: "2026-01-15T00:00:01.000Z",
    },
  ],
};

describe("useConversationStore", () => {
  beforeEach(() => {
    useConversationStore.getState().reset();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("has empty state", () => {
      const state = useConversationStore.getState();
      expect(state.conversations).toEqual([]);
      expect(state.activeConversation).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchConversations", () => {
    it("fetches all conversations", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockConversation]),
      });

      await useConversationStore.getState().fetchConversations();

      const state = useConversationStore.getState();
      expect(state.conversations).toHaveLength(1);
      expect(state.conversations[0].title).toBe("What is this formula?");
      expect(state.conversations[0].screenshots).toHaveLength(1);
    });

    it("fetches by documentId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockConversation]),
      });

      await useConversationStore.getState().fetchConversations("doc-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/conversations?documentId=doc-1"
      );
    });

    it("handles error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await useConversationStore.getState().fetchConversations();

      expect(useConversationStore.getState().error).toBeTruthy();
    });
  });

  describe("fetchConversation", () => {
    it("fetches single conversation with messages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConversationWithMessages),
      });

      const result = await useConversationStore
        .getState()
        .fetchConversation("conv-1");

      expect(result).toBeTruthy();
      expect(result!.messages).toHaveLength(2);
      expect(result!.messages[0].role).toBe("user");
      expect(useConversationStore.getState().activeConversation).toBeTruthy();
    });
  });

  describe("saveConversation", () => {
    it("saves and adds to store", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConversation),
      });

      const result = await useConversationStore.getState().saveConversation({
        documentId: "doc-1",
        pageNumber: 3,
        title: "What is this formula?",
        screenshots: [],
        messages: [
          { role: "user", content: "What is this formula?" },
          { role: "assistant", content: "This is the quadratic formula..." },
        ],
      });

      expect(result).toBeTruthy();
      expect(useConversationStore.getState().conversations).toHaveLength(1);
    });
  });

  describe("deleteConversation", () => {
    it("removes from store", async () => {
      useConversationStore.setState({
        conversations: [
          {
            id: "conv-1",
            userId: "u1",
            documentId: "doc-1",
            pageNumber: 3,
            title: "Test",
            screenshots: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await useConversationStore
        .getState()
        .deleteConversation("conv-1");

      expect(result).toBe(true);
      expect(useConversationStore.getState().conversations).toHaveLength(0);
    });

    it("clears activeConversation if deleted", async () => {
      useConversationStore.setState({
        conversations: [
          {
            id: "conv-1",
            userId: "u1",
            documentId: "doc-1",
            pageNumber: 3,
            title: "Test",
            screenshots: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
        activeConversation: {
          id: "conv-1",
          userId: "u1",
          documentId: "doc-1",
          pageNumber: 3,
          title: "Test",
          screenshots: [],
          createdAt: "",
          updatedAt: "",
          messages: [],
        },
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await useConversationStore.getState().deleteConversation("conv-1");

      expect(useConversationStore.getState().activeConversation).toBeNull();
    });
  });

  describe("getPageConversationCount", () => {
    it("counts conversations on a specific page", () => {
      useConversationStore.setState({
        conversations: [
          {
            id: "c1",
            userId: "u1",
            documentId: "doc-1",
            pageNumber: 3,
            title: "Q1",
            screenshots: [],
            createdAt: "",
            updatedAt: "",
          },
          {
            id: "c2",
            userId: "u1",
            documentId: "doc-1",
            pageNumber: 3,
            title: "Q2",
            screenshots: [],
            createdAt: "",
            updatedAt: "",
          },
          {
            id: "c3",
            userId: "u1",
            documentId: "doc-1",
            pageNumber: 5,
            title: "Q3",
            screenshots: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
      });

      expect(
        useConversationStore.getState().getPageConversationCount("doc-1", 3)
      ).toBe(2);
      expect(
        useConversationStore.getState().getPageConversationCount("doc-1", 5)
      ).toBe(1);
      expect(
        useConversationStore.getState().getPageConversationCount("doc-1", 1)
      ).toBe(0);
    });
  });

  describe("setActiveConversation", () => {
    it("sets active conversation", () => {
      const conv = {
        id: "conv-1",
        userId: "u1",
        documentId: "doc-1",
        pageNumber: 3,
        title: "Test",
        screenshots: [],
        createdAt: "",
        updatedAt: "",
        messages: [],
      };

      useConversationStore.getState().setActiveConversation(conv);

      expect(useConversationStore.getState().activeConversation).toEqual(conv);
    });

    it("clears active conversation with null", () => {
      useConversationStore.setState({
        activeConversation: {
          id: "conv-1",
          userId: "u1",
          documentId: "doc-1",
          pageNumber: 3,
          title: "Test",
          screenshots: [],
          createdAt: "",
          updatedAt: "",
          messages: [],
        },
      });

      useConversationStore.getState().setActiveConversation(null);

      expect(useConversationStore.getState().activeConversation).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets to initial state", () => {
      useConversationStore.setState({
        conversations: [
          {
            id: "c1",
            userId: "u1",
            documentId: "doc-1",
            pageNumber: 1,
            title: "Test",
            screenshots: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
        activeConversation: {
          id: "c1",
          userId: "u1",
          documentId: "doc-1",
          pageNumber: 1,
          title: "Test",
          screenshots: [],
          createdAt: "",
          updatedAt: "",
          messages: [],
        },
        error: "some error",
      });

      useConversationStore.getState().reset();

      const state = useConversationStore.getState();
      expect(state.conversations).toEqual([]);
      expect(state.activeConversation).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});
