import { create } from "zustand";
import type {
  SyncStatus,
  SyncAction,
  SyncEntityType,
  SyncActionType,
} from "../types";
import type {
  SyncPersistenceAdapter,
  SyncNetworkAdapter,
  SyncApiAdapter,
} from "../lib/sync-adapter";

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// Platform adapters — injected via configureSyncStore()
let persistenceAdapter: SyncPersistenceAdapter | null = null;
let networkAdapter: SyncNetworkAdapter | null = null;
let apiAdapter: SyncApiAdapter | null = null;

let networkUnsubscribe: (() => void) | null = null;

export function configureSyncStore(config: {
  persistence: SyncPersistenceAdapter;
  network: SyncNetworkAdapter;
  api: SyncApiAdapter;
}) {
  persistenceAdapter = config.persistence;
  networkAdapter = config.network;
  apiAdapter = config.api;

  // Subscribe to network changes
  if (networkUnsubscribe) networkUnsubscribe();
  networkUnsubscribe = networkAdapter.onOnlineChange((online) => {
    useSyncStore.getState().setOnline(online);
  });

  // Set initial online state
  useSyncStore.setState({ isOnline: networkAdapter.isOnline() });
}

/** Reset adapters (for testing). */
export function resetSyncAdapters() {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  persistenceAdapter = null;
  networkAdapter = null;
  apiAdapter = null;
}

interface SyncState {
  status: SyncStatus;
  pendingActions: SyncAction[];
  lastSyncedAt: number | null;
  isOnline: boolean;
}

interface SyncActions {
  enqueueAction: (
    entityType: SyncEntityType,
    entityId: string,
    actionType: SyncActionType,
    payload: Record<string, unknown>
  ) => Promise<void>;
  flushQueue: (authToken: string | null) => Promise<void>;
  setOnline: (online: boolean) => void;
  handleRemoteChange: (
    entityType: SyncEntityType,
    entityId: string,
    data: Record<string, unknown>
  ) => void;
  loadPersistedQueue: () => Promise<void>;
  reset: () => void;
}

export type SyncStore = SyncState & SyncActions;

const initialState: SyncState = {
  status: "idle",
  pendingActions: [],
  lastSyncedAt: null,
  isOnline: true,
};

export const useSyncStore = create<SyncStore>((set, get) => ({
  ...initialState,

  enqueueAction: async (entityType, entityId, actionType, payload) => {
    const action: SyncAction = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      entityType,
      entityId,
      actionType,
      payload,
      timestamp: Date.now(),
      status: "pending",
      retryCount: 0,
    };

    set({ pendingActions: [...get().pendingActions, action] });

    if (persistenceAdapter) {
      await persistenceAdapter.savePendingAction(action);
    }
  },

  flushQueue: async (authToken) => {
    const { pendingActions, isOnline } = get();
    if (!isOnline || pendingActions.length === 0) return;
    if (!apiAdapter) return;

    set({ status: "syncing" });

    const pending = pendingActions.filter((a) => a.status === "pending");
    if (pending.length === 0) {
      set({ status: "idle" });
      return;
    }

    // Mark all pending as in_flight
    const inFlightIds = new Set(pending.map((a) => a.id));
    set({
      pendingActions: get().pendingActions.map((a) =>
        inFlightIds.has(a.id) ? { ...a, status: "in_flight" as const } : a
      ),
    });

    let hasErrors = false;

    for (const action of pending) {
      try {
        const result = await apiAdapter.executeAction(action, authToken);

        if (result.success) {
          // Remove from queue
          set({
            pendingActions: get().pendingActions.filter(
              (a) => a.id !== action.id
            ),
          });
          if (persistenceAdapter) {
            await persistenceAdapter.removeAction(action.id);
          }
        } else if (result.statusCode === 409 && result.serverEntity) {
          // Conflict — accept server version (LWW)
          get().handleRemoteChange(
            action.entityType,
            action.entityId,
            result.serverEntity
          );
          set({
            pendingActions: get().pendingActions.filter(
              (a) => a.id !== action.id
            ),
          });
          if (persistenceAdapter) {
            await persistenceAdapter.removeAction(action.id);
          }
        } else {
          // Failure — increment retry
          const newRetryCount = action.retryCount + 1;
          if (newRetryCount >= MAX_RETRIES) {
            // Mark as failed
            set({
              pendingActions: get().pendingActions.map((a) =>
                a.id === action.id
                  ? {
                      ...a,
                      status: "failed" as const,
                      retryCount: newRetryCount,
                      error: result.error || "Max retries exceeded",
                    }
                  : a
              ),
            });
            if (persistenceAdapter) {
              await persistenceAdapter.updateActionStatus(
                action.id,
                "failed",
                result.error
              );
            }
            hasErrors = true;
          } else {
            // Back to pending for next flush
            set({
              pendingActions: get().pendingActions.map((a) =>
                a.id === action.id
                  ? {
                      ...a,
                      status: "pending" as const,
                      retryCount: newRetryCount,
                      error: result.error,
                    }
                  : a
              ),
            });
            if (persistenceAdapter) {
              await persistenceAdapter.updateActionStatus(
                action.id,
                "pending",
                result.error
              );
            }
            hasErrors = true;
          }
        }
      } catch (err) {
        // Network or unexpected error
        const newRetryCount = action.retryCount + 1;
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        set({
          pendingActions: get().pendingActions.map((a) =>
            a.id === action.id
              ? {
                  ...a,
                  status:
                    newRetryCount >= MAX_RETRIES
                      ? ("failed" as const)
                      : ("pending" as const),
                  retryCount: newRetryCount,
                  error: errorMsg,
                }
              : a
          ),
        });
        if (persistenceAdapter) {
          await persistenceAdapter.updateActionStatus(
            action.id,
            newRetryCount >= MAX_RETRIES ? "failed" : "pending",
            errorMsg
          );
        }
        hasErrors = true;
      }
    }

    set({
      status: hasErrors ? "error" : "idle",
      lastSyncedAt: hasErrors ? get().lastSyncedAt : Date.now(),
    });
  },

  setOnline: (online) => {
    const prev = get().isOnline;
    set({
      isOnline: online,
      status: online ? get().status : "offline",
    });
    // Trigger flush when coming back online
    if (!prev && online && get().pendingActions.length > 0) {
      get().flushQueue(null);
    }
  },

  handleRemoteChange: (_entityType, _entityId, _data) => {
    // Dispatch to appropriate stores.
    // This is a no-op in the base implementation.
    // Platform-specific hooks (use-sync.ts) override this behavior
    // by listening to Supabase Realtime and updating stores directly.
  },

  loadPersistedQueue: async () => {
    if (!persistenceAdapter) return;
    const actions = await persistenceAdapter.loadPendingActions();
    if (actions.length > 0) {
      set({ pendingActions: actions });
    }
  },

  reset: () => {
    set({
      ...initialState,
      pendingActions: [],
    });
  },
}));

/** Get the retry delay for a given retry count (exponential backoff). */
export function getRetryDelay(retryCount: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}
