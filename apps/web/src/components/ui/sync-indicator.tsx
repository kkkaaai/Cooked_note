"use client";

import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import { useSyncStore } from "@cookednote/shared/stores/sync-store";

export function SyncIndicator() {
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingActions.length);
  const isOnline = useSyncStore((s) => s.isOnline);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CloudOff className="h-3.5 w-3.5" />
        <span>Offline{pendingCount > 0 ? ` (${pendingCount})` : ""}</span>
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Sync error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Cloud className="h-3.5 w-3.5" />
      <span>Saved</span>
    </div>
  );
}
