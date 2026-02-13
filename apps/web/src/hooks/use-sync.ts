"use client";

import { useEffect, useRef } from "react";
import {
  configureSyncStore,
  useSyncStore,
} from "@cookednote/shared/stores/sync-store";
import { useAnnotationStore } from "@cookednote/shared/stores/annotation-store";
import { WebSyncPersistence } from "@/lib/sync-persistence-web";
import { WebSyncNetwork } from "@/lib/sync-network-web";
import { WebSyncApi } from "@/lib/sync-api-web";
import { supabaseClient } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Annotation } from "@cookednote/shared/types";

const FLUSH_INTERVAL_MS = 30_000;

/**
 * Initializes the sync system for web:
 * - Configures sync store with IndexedDB + browser network adapters
 * - Loads persisted queue from IndexedDB
 * - Subscribes to Supabase Realtime for annotation changes
 * - Periodic flush every 30s when pending actions exist
 */
export function useSync(documentId: string | null) {
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingActions.length);
  const isOnline = useSyncStore((s) => s.isOnline);
  const configuredRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Configure adapters once
  useEffect(() => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    configureSyncStore({
      persistence: new WebSyncPersistence(),
      network: new WebSyncNetwork(),
      api: new WebSyncApi(),
    });

    // Load any persisted pending actions from IndexedDB
    useSyncStore.getState().loadPersistedQueue();
  }, []);

  // Subscribe to Supabase Realtime for annotation changes on current document
  useEffect(() => {
    if (!documentId) return;

    const channel = supabaseClient
      .channel(`doc-${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Annotation",
          filter: `documentId=eq.${documentId}`,
        },
        (payload) => {
          const { eventType } = payload;
          const record = (payload.new ?? payload.old) as Record<string, unknown> | undefined;
          if (!record) return;

          const store = useAnnotationStore.getState();

          if (eventType === "DELETE") {
            store.removeAnnotation(record.id as string);
          } else {
            // INSERT or UPDATE — mergeAnnotation handles LWW comparison
            store.mergeAnnotation(record as unknown as Annotation);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabaseClient.removeChannel(channel);
      channelRef.current = null;
    };
  }, [documentId]);

  // Periodic flush every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const { pendingActions, isOnline: online } = useSyncStore.getState();
      if (online && pendingActions.length > 0) {
        useSyncStore.getState().flushQueue(null);
      }
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return { status, pendingCount, isOnline };
}
