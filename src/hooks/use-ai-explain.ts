"use client";

import { useCallback, useRef } from "react";
import { useAIStore } from "@/stores/ai-store";
import { streamExplanation, streamChat } from "@/lib/ai-client";

export function useAIExplain() {
  const abortRef = useRef<AbortController | null>(null);

  const explain = useCallback(
    async (docId: string, text: string, page: number) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      useAIStore.getState().startExplanation(docId, text, page);

      await streamExplanation(
        { documentId: docId, selectedText: text, pageNumber: page },
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

  const sendFollowUp = useCallback(async (question: string) => {
    const { documentId, selectedText, pageNumber } = useAIStore.getState();
    if (!documentId || !selectedText || !pageNumber) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Add user message to store
    useAIStore.getState().addMessage({ role: "user", content: question });
    useAIStore.getState().setStreaming(true);
    useAIStore.getState().setError(null);

    const allMessages = useAIStore.getState().messages;

    await streamChat(
      { documentId, selectedText, pageNumber, messages: allMessages },
      (delta) => useAIStore.getState().appendStreamingText(delta),
      () => useAIStore.getState().finalizeStreaming(),
      (error) => {
        useAIStore.getState().setError(error);
        useAIStore.getState().setStreaming(false);
      },
      abortRef.current.signal
    );
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const { isStreaming } = useAIStore.getState();
    if (isStreaming) {
      useAIStore.getState().finalizeStreaming();
    }
  }, []);

  return { explain, sendFollowUp, cancel };
}
