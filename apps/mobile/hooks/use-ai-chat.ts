import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useAIStore } from "@cookednote/shared/stores/ai-store";
import { streamChatMobile } from "@/lib/ai-client";
import type { AIMessage, ContentBlock, Screenshot } from "@cookednote/shared/types";

export function useAIChat() {
  const { getToken } = useAuth();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, screenshots: Screenshot[]) => {
      const { documentId } = useAIStore.getState();
      if (!documentId) return;
      if (!text && screenshots.length === 0) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const token = await getToken();

      const contentBlocks: ContentBlock[] = [];
      for (const ss of screenshots) {
        const base64Data = ss.base64.includes(",")
          ? ss.base64.split(",")[1]!
          : ss.base64;
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64Data,
          },
        });
      }
      if (text) {
        contentBlocks.push({ type: "text", text });
      }

      const userMessage: AIMessage = {
        role: "user",
        content: text || "(screenshots attached)",
        contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
        screenshots: screenshots.length > 0 ? [...screenshots] : undefined,
      };

      useAIStore.getState().addMessage(userMessage);
      useAIStore.getState().clearScreenshots();
      useAIStore.getState().setStreaming(true);
      useAIStore.getState().setError(null);

      const allMessages = useAIStore.getState().messages;

      await streamChatMobile(
        { documentId, messages: allMessages },
        token,
        (delta) => useAIStore.getState().appendStreamingText(delta),
        () => useAIStore.getState().finalizeStreaming(),
        (error) => {
          useAIStore.getState().setError(error);
          useAIStore.getState().setStreaming(false);
        },
        abortRef.current.signal
      );
    },
    [getToken]
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
