"use client";

import { useRef, useEffect, useState } from "react";
import { useAIStore } from "@/stores/ai-store";
import { useAIChat } from "@/hooks/use-ai-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, AlertCircle, X } from "lucide-react";
import type { Screenshot } from "@/types";

function MessageBubble({
  role,
  content,
  screenshots,
  isStreaming = false,
}: {
  role: "user" | "assistant";
  content: string;
  screenshots?: Screenshot[];
  isStreaming?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {screenshots && screenshots.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {screenshots.map((ss) => (
              <img
                key={ss.id}
                src={ss.base64}
                alt={`Page ${ss.pageNumber} capture`}
                className="h-16 w-auto rounded"
              />
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap">{content}</div>
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/70" />
        )}
      </div>
    </div>
  );
}

export function AIChat() {
  const messages = useAIStore((s) => s.messages);
  const isStreaming = useAIStore((s) => s.isStreaming);
  const streamingText = useAIStore((s) => s.streamingText);
  const error = useAIStore((s) => s.error);
  const pendingScreenshots = useAIStore((s) => s.pendingScreenshots);
  const removeScreenshot = useAIStore((s) => s.removeScreenshot);

  const { sendMessage } = useAIChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages/streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && pendingScreenshots.length === 0) || isStreaming) return;
    sendMessage(text, pendingScreenshots);
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages list */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-sm">
              Draw a region on the PDF to capture a screenshot, then ask your question here.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            screenshots={msg.screenshots}
          />
        ))}

        {/* Streaming message (in progress) */}
        {isStreaming && streamingText && (
          <MessageBubble role="assistant" content={streamingText} isStreaming />
        )}

        {/* Loading indicator (before first text arrives) */}
        {isStreaming && !streamingText && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t px-4 py-3">
        {/* Inline pending screenshots preview */}
        {pendingScreenshots.length > 0 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto">
            {pendingScreenshots.map((ss) => (
              <div key={ss.id} className="group relative shrink-0">
                <img
                  src={ss.base64}
                  alt={`Page ${ss.pageNumber}`}
                  className="h-12 w-auto rounded border"
                />
                <button
                  onClick={() => removeScreenshot(ss.id)}
                  className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-2 w-2" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pendingScreenshots.length > 0
                ? "Ask about the selected regions..."
                : "Capture a region first, then ask..."
            }
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!input.trim() && pendingScreenshots.length === 0) || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
