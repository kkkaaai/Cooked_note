import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import {
  configureSyncStore,
  useSyncStore,
} from "@cookednote/shared/stores/sync-store";
import { MobileSyncPersistence } from "@/lib/sync-persistence-mobile";
import { MobileSyncNetwork } from "@/lib/sync-network-mobile";
import { MobileSyncApi } from "@/lib/sync-api-mobile";

const FLUSH_INTERVAL_MS = 30_000;

/**
 * Initializes the sync system for mobile:
 * - Configures sync store with SQLite + NetInfo adapters
 * - Loads persisted queue from SQLite
 * - Periodic flush every 30s when pending actions exist
 */
export function useSync() {
  const { getToken } = useAuth();
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingActions.length);
  const isOnline = useSyncStore((s) => s.isOnline);
  const configuredRef = useRef(false);

  // Configure adapters once
  useEffect(() => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    configureSyncStore({
      persistence: new MobileSyncPersistence(),
      network: new MobileSyncNetwork(),
      api: new MobileSyncApi(),
    });

    useSyncStore.getState().loadPersistedQueue();
  }, []);

  // Periodic flush every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      const { pendingActions, isOnline: online } = useSyncStore.getState();
      if (online && pendingActions.length > 0) {
        const token = await getToken();
        useSyncStore.getState().flushQueue(token);
      }
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [getToken]);

  return { status, pendingCount, isOnline };
}
