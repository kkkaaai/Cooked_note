"use client";

import { useEffect, useState } from "react";
import { useConversationStore } from "@/stores/conversation-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Trash2, Search } from "lucide-react";
import type { ConversationMeta, ConversationWithMessages } from "@cookednote/shared/types";

interface ConversationHistoryPanelProps {
  documentId: string | null;
  onSelectConversation: (conv: ConversationWithMessages) => void;
}

function ConversationItem({
  conversation,
  onSelect,
  onDelete,
}: {
  conversation: ConversationMeta;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
      onClick={onSelect}
    >
      {/* Thumbnail from first screenshot */}
      {conversation.screenshots && conversation.screenshots.length > 0 ? (
        <img
          src={conversation.screenshots[0].base64}
          alt="Conversation thumbnail"
          className="h-12 w-12 shrink-0 rounded border object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{conversation.title}</p>
        {conversation.document && (
          <p className="truncate text-xs text-muted-foreground">
            {conversation.document.title} &middot; p.{conversation.pageNumber}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(conversation.createdAt)}</span>
          {conversation._count && (
            <>
              <span>&middot;</span>
              <span>{conversation._count.messages} messages</span>
            </>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm("Delete this conversation?")) {
            onDelete();
          }
        }}
        title="Delete conversation"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

export function ConversationHistoryPanel({
  documentId,
  onSelectConversation,
}: ConversationHistoryPanelProps) {
  const conversations = useConversationStore((s) => s.conversations);
  const isLoading = useConversationStore((s) => s.isLoading);
  const fetchConversations = useConversationStore((s) => s.fetchConversations);
  const fetchConversation = useConversationStore((s) => s.fetchConversation);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchConversations(documentId || undefined);
  }, [documentId, fetchConversations]);

  const filteredConversations = search
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          (c.document?.title || "").toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const handleSelect = async (conv: ConversationMeta) => {
    const full = await fetchConversation(conv.id);
    if (full) {
      onSelectConversation(full);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search */}
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {search
              ? "No conversations match your search."
              : "No saved conversations yet."}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              onSelect={() => handleSelect(conv)}
              onDelete={() => deleteConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
