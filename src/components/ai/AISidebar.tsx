"use client";

import { useAIStore } from "@/stores/ai-store";
import { AIChat } from "./AIChat";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

export function AISidebar() {
  const isSidebarOpen = useAIStore((s) => s.isSidebarOpen);
  const selectedText = useAIStore((s) => s.selectedText);
  const closeSidebar = useAIStore((s) => s.closeSidebar);

  if (!isSidebarOpen) return null;

  return (
    <div className="flex h-full w-96 min-w-[384px] flex-col border-l bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">AI Assistant</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={closeSidebar} title="Close sidebar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected text preview */}
      {selectedText && (
        <div className="border-b px-4 py-3">
          <p className="mb-1 text-xs text-muted-foreground">Selected text</p>
          <p className="line-clamp-3 text-sm italic">
            &ldquo;{selectedText}&rdquo;
          </p>
        </div>
      )}

      {/* Chat area */}
      <AIChat />
    </div>
  );
}
