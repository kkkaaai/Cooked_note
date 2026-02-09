"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAIStore } from "@/stores/ai-store";
import { useConversationStore } from "@/stores/conversation-store";
import { usePDFStore } from "@/stores/pdf-store";
import { AIChat } from "./AIChat";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Save, History, ArrowLeft } from "lucide-react";
import { ConversationHistoryPanel } from "@/components/history/ConversationHistoryPanel";
import type { Screenshot, ConversationWithMessages } from "@/types";

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 384;

function ScreenshotThumbnail({
  screenshot,
  onRemove,
}: {
  screenshot: Screenshot;
  onRemove?: () => void;
}) {
  return (
    <div className="group relative shrink-0">
      <img
        src={screenshot.base64}
        alt={`Page ${screenshot.pageNumber} capture`}
        className="h-16 w-auto rounded border object-cover"
      />
      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
        p.{screenshot.pageNumber}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
          title="Remove screenshot"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

export function AISidebar() {
  const isSidebarOpen = useAIStore((s) => s.isSidebarOpen);
  const pendingScreenshots = useAIStore((s) => s.pendingScreenshots);
  const messages = useAIStore((s) => s.messages);
  const documentId = useAIStore((s) => s.documentId);
  const isStreaming = useAIStore((s) => s.isStreaming);
  const closeSidebar = useAIStore((s) => s.closeSidebar);
  const removeScreenshot = useAIStore((s) => s.removeScreenshot);
  const clearConversation = useAIStore((s) => s.clearConversation);
  const currentPage = usePDFStore((s) => s.currentPage);
  const saveConversation = useConversationStore((s) => s.saveConversation);
  const activeConversation = useConversationStore((s) => s.activeConversation);
  const setActiveConversation = useConversationStore(
    (s) => s.setActiveConversation
  );

  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Drag left = increase width (sidebar is on the right)
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidthRef.current + delta)
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  if (!isSidebarOpen) return null;

  const canSave =
    messages.length >= 2 && !isStreaming && !activeConversation;

  const handleSave = async () => {
    if (!documentId || !canSave) return;
    setSaving(true);

    // Collect all screenshots from messages
    const allScreenshots: Screenshot[] = [];
    for (const msg of messages) {
      if (msg.screenshots) {
        for (const ss of msg.screenshots) {
          if (!allScreenshots.find((s) => s.id === ss.id)) {
            allScreenshots.push(ss);
          }
        }
      }
    }

    // Use first user message as title (truncated)
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 100) || "Screenshot question"
      : "AI Conversation";

    const result = await saveConversation({
      documentId,
      pageNumber: currentPage,
      title,
      screenshots: allScreenshots,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        screenshots: m.screenshots,
      })),
    });

    setSaving(false);
    if (result) {
      // Mark as saved by setting active conversation
      const conv = await useConversationStore
        .getState()
        .fetchConversation(result.id);
      if (conv) {
        setActiveConversation(conv);
      }
    }
  };

  const handleLoadConversation = (conv: ConversationWithMessages) => {
    // Load conversation into AI store
    clearConversation();
    for (const msg of conv.messages) {
      useAIStore.getState().addMessage({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        screenshots: msg.screenshots || undefined,
      });
    }
    setActiveConversation(conv);
    setShowHistory(false);
  };

  const handleNewConversation = () => {
    clearConversation();
    setActiveConversation(null);
  };

  return (
    <div
      className="relative flex h-full flex-col border-l bg-background"
      style={{ width: `${width}px`, minWidth: `${MIN_WIDTH}px` }}
    >
      {/* Resize handle */}
      <div
        className={`absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/30 ${
          isResizing ? "bg-primary/40" : ""
        }`}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          {showHistory && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowHistory(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">
            {showHistory
              ? "Conversation History"
              : activeConversation
                ? "Saved Conversation"
                : "AI Assistant"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {!showHistory && (
            <>
              {activeConversation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewConversation}
                  className="text-xs"
                >
                  New Chat
                </Button>
              )}
              {canSave && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  disabled={saving}
                  title="Save conversation"
                  className="h-8 w-8"
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(true)}
                title="Conversation history"
                className="h-8 w-8"
              >
                <History className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSidebar}
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showHistory ? (
        <ConversationHistoryPanel
          documentId={documentId}
          onSelectConversation={handleLoadConversation}
        />
      ) : (
        <>
          {/* Pending screenshots preview */}
          {pendingScreenshots.length > 0 && (
            <div className="border-b px-4 py-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Attached screenshots ({pendingScreenshots.length}/5)
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingScreenshots.map((ss) => (
                  <ScreenshotThumbnail
                    key={ss.id}
                    screenshot={ss}
                    onRemove={() => removeScreenshot(ss.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Chat area */}
          <AIChat />
        </>
      )}

      {/* Overlay to prevent iframe/text selection interference during resize */}
      {isResizing && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </div>
  );
}
