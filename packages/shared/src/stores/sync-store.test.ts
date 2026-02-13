import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useSyncStore,
  configureSyncStore,
  resetSyncAdapters,
  getRetryDelay,
} from "./sync-store";
import type {
  SyncPersistenceAdapter,
  SyncNetworkAdapter,
  SyncApiAdapter,
} from "../lib/sync-adapter";
import type { SyncAction, SyncStatus } from "../types";

function createMockPersistence(): SyncPersistenceAdapter {
  const store = new Map<string, SyncAction>();
  return {
    loadPendingActions: vi.fn(async () => Array.from(store.values())),
    savePendingAction: vi.fn(async (action: SyncAction) => {
      store.set(action.id, action);
    }),
    updateActionStatus: vi.fn(
      async (id: string, status: SyncAction["status"], error?: string) => {
        const action = store.get(id);
        if (action) {
          store.set(id, { ...action, status, error });
        }
      }
    ),
    removeAction: vi.fn(async (id: string) => {
      store.delete(id);
    }),
    clearAll: vi.fn(async () => {
      store.clear();
    }),
  };
}

interface MockNetwork extends SyncNetworkAdapter {
  _setOnline: (online: boolean) => void;
}

function createMockNetwork(online = true): MockNetwork {
  let _online = online;
  let _callback: ((online: boolean) => void) | null = null;
  return {
    isOnline: vi.fn(() => _online),
    onOnlineChange: vi.fn((cb: (online: boolean) => void) => {
      _callback = cb;
      return () => {
        _callback = null;
      };
    }),
    _setOnline(value: boolean) {
      _online = value;
      _callback?.(value);
    },
  };
}

type ApiResult = { success: boolean; statusCode?: number; serverEntity?: Record<string, unknown>; error?: string };

function createMockApi(
  handler?: (action: SyncAction) => ApiResult | Promise<ApiResult>
): SyncApiAdapter {
  return {
    executeAction: vi.fn(async (action: SyncAction) => {
      if (handler) return handler(action);
      return { success: true };
    }),
  };
}

describe("sync-store", () => {
  let mockPersistence: SyncPersistenceAdapter;
  let mockNetwork: MockNetwork;
  let mockApi: SyncApiAdapter;

  beforeEach(() => {
    resetSyncAdapters();
    useSyncStore.getState().reset();
    mockPersistence = createMockPersistence();
    mockNetwork = createMockNetwork(true);
    mockApi = createMockApi();
    configureSyncStore({
      persistence: mockPersistence,
      network: mockNetwork,
      api: mockApi,
    });
  });

  describe("configureSyncStore", () => {
    it("sets initial online state from network adapter", () => {
      expect(useSyncStore.getState().isOnline).toBe(true);
    });

    it("subscribes to network changes", () => {
      expect(mockNetwork.onOnlineChange).toHaveBeenCalledOnce();
    });
  });

  describe("enqueueAction", () => {
    it("adds action to pending queue", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "ann-1", "create", { text: "hello" });

      const actions = useSyncStore.getState().pendingActions;
      expect(actions).toHaveLength(1);
      expect(actions[0].entityType).toBe("annotation");
      expect(actions[0].entityId).toBe("ann-1");
      expect(actions[0].actionType).toBe("create");
      expect(actions[0].status).toBe("pending");
      expect(actions[0].retryCount).toBe(0);
    });

    it("persists action via adapter", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("folder", "f-1", "update", { name: "test" });

      expect(mockPersistence.savePendingAction).toHaveBeenCalledOnce();
    });

    it("generates unique IDs for each action", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a2", "create", {});

      const actions = useSyncStore.getState().pendingActions;
      expect(actions[0].id).not.toBe(actions[1].id);
    });

    it("preserves FIFO order", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a2", "update", {});
      await useSyncStore
        .getState()
        .enqueueAction("folder", "f1", "delete", {});

      const actions = useSyncStore.getState().pendingActions;
      expect(actions[0].entityId).toBe("a1");
      expect(actions[1].entityId).toBe("a2");
      expect(actions[2].entityId).toBe("f1");
    });
  });

  describe("flushQueue", () => {
    it("processes all pending actions", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a2", "update", {});

      await useSyncStore.getState().flushQueue("token-123");

      expect(useSyncStore.getState().pendingActions).toHaveLength(0);
      expect(useSyncStore.getState().status).toBe("idle");
      expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
    });

    it("passes auth token to API adapter", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});

      await useSyncStore.getState().flushQueue("my-token");

      expect(mockApi.executeAction).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: "a1" }),
        "my-token"
      );
    });

    it("removes action from persistence on success", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});

      await useSyncStore.getState().flushQueue(null);

      expect(mockPersistence.removeAction).toHaveBeenCalledOnce();
    });

    it("does nothing when offline", async () => {
      mockNetwork._setOnline(false);
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});

      await useSyncStore.getState().flushQueue(null);

      expect(mockApi.executeAction).not.toHaveBeenCalled();
      expect(useSyncStore.getState().pendingActions).toHaveLength(1);
    });

    it("does nothing when queue is empty", async () => {
      await useSyncStore.getState().flushQueue(null);
      expect(mockApi.executeAction).not.toHaveBeenCalled();
    });

    it("handles 409 conflict — accepts server version", async () => {
      const conflictApi = createMockApi(() => ({
        success: false,
        statusCode: 409,
        serverEntity: { id: "a1", content: "server-version" },
      }));
      configureSyncStore({
        persistence: mockPersistence,
        network: mockNetwork,
        api: conflictApi,
      });

      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "update", { content: "local" });

      await useSyncStore.getState().flushQueue(null);

      // Action removed from queue (conflict resolved by accepting server)
      expect(useSyncStore.getState().pendingActions).toHaveLength(0);
    });

    it("retries failed actions up to MAX_RETRIES", async () => {
      let callCount = 0;
      const failApi = createMockApi(() => {
        callCount++;
        return { success: false, error: "Server error", statusCode: 500 };
      });
      configureSyncStore({
        persistence: mockPersistence,
        network: mockNetwork,
        api: failApi,
      });

      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});

      // Flush 3 times
      await useSyncStore.getState().flushQueue(null);
      await useSyncStore.getState().flushQueue(null);
      await useSyncStore.getState().flushQueue(null);

      expect(callCount).toBe(3);
      const actions = useSyncStore.getState().pendingActions;
      expect(actions).toHaveLength(1);
      expect(actions[0].status).toBe("failed");
      expect(actions[0].retryCount).toBe(3);
      expect(useSyncStore.getState().status).toBe("error");
    });

    it("sets status to syncing during flush", async () => {
      let statusDuringFlush: SyncStatus | null = null;
      const slowApi = createMockApi(() => {
        statusDuringFlush = useSyncStore.getState().status;
        return { success: true };
      });
      configureSyncStore({
        persistence: mockPersistence,
        network: mockNetwork,
        api: slowApi,
      });

      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});
      await useSyncStore.getState().flushQueue(null);

      expect(statusDuringFlush).toBe("syncing");
      expect(useSyncStore.getState().status).toBe("idle");
    });
  });

  describe("setOnline", () => {
    it("updates isOnline state", () => {
      useSyncStore.getState().setOnline(false);
      expect(useSyncStore.getState().isOnline).toBe(false);
      expect(useSyncStore.getState().status).toBe("offline");
    });

    it("triggers flush when coming back online with pending actions", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});

      useSyncStore.getState().setOnline(false);
      expect(useSyncStore.getState().pendingActions).toHaveLength(1);

      // Coming back online triggers flush
      useSyncStore.getState().setOnline(true);
      // Wait for async flush
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.executeAction).toHaveBeenCalled();
    });

    it("responds to network adapter changes", () => {
      mockNetwork._setOnline(false);
      expect(useSyncStore.getState().isOnline).toBe(false);

      mockNetwork._setOnline(true);
      expect(useSyncStore.getState().isOnline).toBe(true);
    });
  });

  describe("loadPersistedQueue", () => {
    it("loads actions from persistence adapter", async () => {
      const actions: SyncAction[] = [
        {
          id: "persisted-1",
          entityType: "annotation",
          entityId: "a1",
          actionType: "create",
          payload: {},
          timestamp: Date.now(),
          status: "pending",
          retryCount: 0,
        },
      ];
      (mockPersistence.loadPendingActions as ReturnType<typeof vi.fn>).mockResolvedValue(actions);

      await useSyncStore.getState().loadPersistedQueue();

      expect(useSyncStore.getState().pendingActions).toHaveLength(1);
      expect(useSyncStore.getState().pendingActions[0].id).toBe("persisted-1");
    });
  });

  describe("reset", () => {
    it("clears all state", async () => {
      await useSyncStore
        .getState()
        .enqueueAction("annotation", "a1", "create", {});
      useSyncStore.getState().setOnline(false);

      useSyncStore.getState().reset();

      expect(useSyncStore.getState().pendingActions).toHaveLength(0);
      expect(useSyncStore.getState().status).toBe("idle");
      expect(useSyncStore.getState().lastSyncedAt).toBeNull();
      expect(useSyncStore.getState().isOnline).toBe(true);
    });
  });

  describe("getRetryDelay", () => {
    it("returns exponential backoff delays", () => {
      expect(getRetryDelay(0)).toBe(1000);
      expect(getRetryDelay(1)).toBe(2000);
      expect(getRetryDelay(2)).toBe(4000);
    });
  });
});
