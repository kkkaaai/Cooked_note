"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { ConversationMeta, Screenshot } from "@/types";

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setConversations(
        data.map((c: Record<string, unknown>) => ({
          ...c,
          screenshots:
            typeof c.screenshots === "string"
              ? JSON.parse(c.screenshots as string)
              : c.screenshots,
        }))
      );
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleOpen = (conv: ConversationMeta) => {
    // Navigate to document with conversation query param
    router.push(
      `/document/${conv.documentId}?conversation=${conv.id}&page=${conv.pageNumber}`
    );
  };

  const filteredConversations = search
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          (c.document?.title || "").toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversation History</h1>
          <p className="mt-1 text-muted-foreground">
            Your saved AI conversations across all documents
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">
            {search ? "No matching conversations" : "No saved conversations yet"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {search
              ? "Try a different search term."
              : "Open a document, use the AI assistant, and save your conversations to see them here."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConversations.map((conv) => (
            <Card
              key={conv.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handleOpen(conv)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  {conv.screenshots &&
                  conv.screenshots.length > 0 &&
                  (conv.screenshots as Screenshot[])[0]?.base64 ? (
                    <img
                      src={(conv.screenshots as Screenshot[])[0].base64}
                      alt="Conversation thumbnail"
                      className="h-14 w-14 shrink-0 rounded border object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-medium leading-tight">
                        {conv.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDelete(conv.id, e)}
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    {conv.document && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {conv.document.title}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Page {conv.pageNumber}</span>
                      <span>&middot;</span>
                      <span>{formatDate(conv.createdAt)}</span>
                      {conv._count && (
                        <>
                          <span>&middot;</span>
                          <span>{conv._count.messages} msgs</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
