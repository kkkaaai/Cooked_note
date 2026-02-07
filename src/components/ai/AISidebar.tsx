"use client";

import { useAIStore } from "@/stores/ai-store";
import { AIChat } from "./AIChat";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import type { Screenshot } from "@/types";

function ScreenshotThumbnail({
  screenshot,
  onRemove,
}: {
  screenshot: Screenshot;
  onRemove: () => void;
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
      <button
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
        title="Remove screenshot"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

export function AISidebar() {
  const isSidebarOpen = useAIStore((s) => s.isSidebarOpen);
  const pendingScreenshots = useAIStore((s) => s.pendingScreenshots);
  const closeSidebar = useAIStore((s) => s.closeSidebar);
  const removeScreenshot = useAIStore((s) => s.removeScreenshot);

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
    </div>
  );
}
