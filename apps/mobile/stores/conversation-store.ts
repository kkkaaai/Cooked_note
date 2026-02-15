import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type {
  ConversationMeta,
  ConversationWithMessages,
  CreateConversationInput,
  Screenshot,
} from "@cookednote/shared/types";

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setConversationTokenProvider(
  fn: () => Promise<string | null>
) {
  tokenProvider = fn;
}

async function getToken(): Promise<string | null> {
  return tokenProvider ? tokenProvider() : null;
}

function parseScreenshots(raw: unknown): Screenshot[] {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as Screenshot[];
  return [];
}

interface ConversationState {
  conversations: ConversationMeta[];
  activeConversation: ConversationWithMessages | null;
  isLoading: boolean;
  error: string | null;
}

interface ConversationActions {
  fetchConversations: (documentId?: string) => Promise<void>;
  fetchConversation: (id: string) => Promise<ConversationWithMessages | null>;
  saveConversation: (
    input: CreateConversationInput
  ) => Promise<ConversationMeta | null>;
  addMessageToConversation: (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    screenshots?: Screenshot[]
  ) => Promise<void>;
  deleteConversation: (id: string) => Promise<boolean>;
  setActiveConversation: (conv: ConversationWithMessages | null) => void;
  getPageConversationCount: (
    documentId: string,
    pageNumber: number
  ) => number;
  reset: () => void;
}

type ConversationStore = ConversationState & ConversationActions;

const initialState: ConversationState = {
  conversations: [],
  activeConversation: null,
  isLoading: false,
  error: null,
};

export const useConversationStore = create<ConversationStore>((set, get) => ({
  ...initialState,

  fetchConversations: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      const url = documentId
        ? `/api/conversations?documentId=${documentId}`
        : "/api/conversations";
      const res = await apiFetch(url, token);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      const conversations = data.map((c: Record<string, unknown>) => ({
        ...c,
        screenshots: parseScreenshots(c.screenshots),
      }));
      set({ conversations, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchConversation: async (id) => {
    try {
      const token = await getToken();
      const res = await apiFetch(`/api/conversations/${id}`, token);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      const data = await res.json();
      const conv: ConversationWithMessages = {
        ...data,
        screenshots: parseScreenshots(data.screenshots),
        messages: data.messages.map((m: Record<string, unknown>) => ({
          ...m,
          screenshots: parseScreenshots(m.screenshots),
        })),
      };
      set({ activeConversation: conv });
      return conv;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  saveConversation: async (input) => {
    try {
      const token = await getToken();
      const res = await apiFetch("/api/conversations", token, {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to save conversation");
      const data = await res.json();
      const conv: ConversationMeta = {
        ...data,
        screenshots: parseScreenshots(data.screenshots),
      };
      set({ conversations: [conv, ...get().conversations] });
      return conv;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  addMessageToConversation: async (
    conversationId,
    role,
    content,
    screenshots
  ) => {
    try {
      const token = await getToken();
      const res = await apiFetch(`/api/conversations/${conversationId}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          message: {
            role,
            content,
            screenshots: screenshots ? JSON.stringify(screenshots) : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to add message");
      const data = await res.json();
      const conv: ConversationWithMessages = {
        ...data,
        screenshots: parseScreenshots(data.screenshots),
        messages: data.messages.map((m: Record<string, unknown>) => ({
          ...m,
          screenshots: parseScreenshots(m.screenshots),
        })),
      };
      set({ activeConversation: conv });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteConversation: async (id) => {
    try {
      const token = await getToken();
      const res = await apiFetch(`/api/conversations/${id}`, token, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
      set({
        conversations: get().conversations.filter((c) => c.id !== id),
        activeConversation:
          get().activeConversation?.id === id
            ? null
            : get().activeConversation,
      });
      return true;
    } catch (err) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  setActiveConversation: (conv) => set({ activeConversation: conv }),

  getPageConversationCount: (documentId, pageNumber) => {
    return get().conversations.filter(
      (c) => c.documentId === documentId && c.pageNumber === pageNumber
    ).length;
  },

  reset: () => set(initialState),
}));
