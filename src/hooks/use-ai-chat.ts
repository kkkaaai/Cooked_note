"use client";

import { useCallback, useRef } from "react";
import { useAIStore } from "@/stores/ai-store";
import { streamChat } from "@/lib/ai-client";
import { dataUrlToBase64 } from "@/lib/screenshot";
import type { AIMessage, ContentBlock, Screenshot } from "@/types";

export function useAIChat() {
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, screenshots: Screenshot[]) => {
      const { documentId } = useAIStore.getState();
      if (!documentId) return;
      if (!text && screenshots.length === 0) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Build content blocks for API
      const contentBlocks: ContentBlock[] = [];
      for (const ss of screenshots) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: dataUrlToBase64(ss.base64),
          },
        });
      }
      if (text) {
        contentBlocks.push({ type: "text", text });
      }

      // Build the user message for display and API
      const userMessage: AIMessage = {
        role: "user",
        content: text || "(screenshots attached)",
        contentBlocks,
        screenshots: screenshots.length > 0 ? [...screenshots] : undefined,
      };

      useAIStore.getState().addMessage(userMessage);
      useAIStore.getState().clearScreenshots();
      useAIStore.getState().setStreaming(true);
      useAIStore.getState().setError(null);

      const allMessages = useAIStore.getState().messages;

      await streamChat(
        { documentId, messages: allMessages },
        (delta) => useAIStore.getState().appendStreamingText(delta),
        () => useAIStore.getState().finalizeStreaming(),
        (error) => {
          useAIStore.getState().setError(error);
          useAIStore.getState().setStreaming(false);
        },
        abortRef.current.signal
      );
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (useAIStore.getState().isStreaming) {
      useAIStore.getState().finalizeStreaming();
    }
  }, []);

  return { sendMessage, cancel };
}
