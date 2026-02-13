import type { SyncAction } from "../types";

/**
 * Platform-agnostic interface for persisting the sync queue.
 * Implemented by IndexedDB (web) and SQLite (mobile).
 */
export interface SyncPersistenceAdapter {
  loadPendingActions(): Promise<SyncAction[]>;
  savePendingAction(action: SyncAction): Promise<void>;
  updateActionStatus(
    id: string,
    status: SyncAction["status"],
    error?: string
  ): Promise<void>;
  removeAction(id: string): Promise<void>;
  clearAll(): Promise<void>;
}

/**
 * Platform-agnostic interface for network connectivity detection.
 * Implemented by navigator.onLine (web) and NetInfo (mobile).
 */
export interface SyncNetworkAdapter {
  isOnline(): boolean;
  /** Subscribe to online/offline changes. Returns an unsubscribe function. */
  onOnlineChange(callback: (online: boolean) => void): () => void;
}

/** Result of executing a single sync action against the server. */
export interface SyncApiResult {
  success: boolean;
  serverEntity?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}

/**
 * Platform-agnostic interface for executing sync actions against the API.
 * Implemented by direct fetch (web) and apiFetch (mobile).
 */
export interface SyncApiAdapter {
  executeAction(
    action: SyncAction,
    authToken: string | null
  ): Promise<SyncApiResult>;
}

/** Resolved endpoint info for a sync action. */
export interface SyncEndpoint {
  path: string;
  method: string;
  body?: string;
}

/**
 * Maps a SyncAction to its REST endpoint.
 * Shared across web and mobile API adapters.
 */
export function getEndpointForAction(action: SyncAction): SyncEndpoint {
  const { entityType, entityId, actionType, payload } = action;

  switch (entityType) {
    case "annotation":
      switch (actionType) {
        case "create":
          return { path: "/api/annotations", method: "POST", body: JSON.stringify(payload) };
        case "update":
          return { path: `/api/annotations/${entityId}`, method: "PATCH", body: JSON.stringify(payload) };
        case "delete":
          return { path: `/api/annotations/${entityId}`, method: "DELETE" };
      }
      break;
    case "document":
      switch (actionType) {
        case "update":
          return { path: `/api/documents/${entityId}`, method: "PATCH", body: JSON.stringify(payload) };
        case "delete":
          return { path: `/api/documents/${entityId}`, method: "DELETE" };
        default:
          break;
      }
      break;
    case "folder":
      switch (actionType) {
        case "create":
          return { path: "/api/folders", method: "POST", body: JSON.stringify(payload) };
        case "update":
          return { path: `/api/folders/${entityId}`, method: "PATCH", body: JSON.stringify(payload) };
        case "delete":
          return { path: `/api/folders/${entityId}`, method: "DELETE" };
      }
      break;
  }

  throw new Error(`Unsupported sync action: ${entityType}/${actionType}`);
}
