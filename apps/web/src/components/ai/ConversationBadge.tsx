"use client";

import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { useAIStore } from "@/stores/ai-store";
import type { ConversationWithMessages } from "@/types";

interface ConversationBadgeProps {
  documentId: string;
  pageNumber: number;
}

export function ConversationBadge({
  documentId,
  pageNumber,
}: ConversationBadgeProps) {
  const conversations = useConversationStore((s) => s.conversations);
  const fetchConversation = useConversationStore((s) => s.fetchConversation);
  const setActiveConversation = useConversationStore(
    (s) => s.setActiveConversation
  );
  const openSidebar = useAIStore((s) => s.openSidebar);
  const clearConversation = useAIStore((s) => s.clearConversation);

  const count = useMemo(
    () =>
      conversations.filter(
        (c) => c.documentId === documentId && c.pageNumber === pageNumber
      ).length,
    [conversations, documentId, pageNumber]
  );

  if (count === 0) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // If only one conversation, load it directly
    const pageConvs = conversations.filter(
      (c) => c.documentId === documentId && c.pageNumber === pageNumber
    );
    if (pageConvs.length === 1) {
      const full = await fetchConversation(pageConvs[0].id);
      if (full) {
        loadConversation(full);
      }
    } else {
      // Open sidebar to history view
      openSidebar();
    }
  };

  const loadConversation = (conv: ConversationWithMessages) => {
    clearConversation();
    for (const msg of conv.messages) {
      useAIStore.getState().addMessage({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        screenshots: msg.screenshots || undefined,
      });
    }
    setActiveConversation(conv);
    openSidebar();
  };

  return (
    <button
      onClick={handleClick}
      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md transition-transform hover:scale-105"
      title={`${count} saved conversation${count !== 1 ? "s" : ""}`}
    >
      <MessageSquare className="h-3 w-3" />
      <span>{count}</span>
    </button>
  );
}
