import * as SQLite from "expo-sqlite";
import type { SyncPersistenceAdapter } from "@cookednote/shared/lib/sync-adapter";
import type { SyncAction } from "@cookednote/shared/types";

const DB_NAME = "cookednote_sync.db";

export class MobileSyncPersistence implements SyncPersistenceAdapter {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync(DB_NAME);
    this.db.execSync(
      `CREATE TABLE IF NOT EXISTS sync_actions (
        id TEXT PRIMARY KEY,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        actionType TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retryCount INTEGER NOT NULL DEFAULT 0,
        error TEXT
      )`
    );
  }

  async loadPendingActions(): Promise<SyncAction[]> {
    const rows = this.db.getAllSync(
      "SELECT * FROM sync_actions WHERE status != 'failed' ORDER BY timestamp ASC"
    ) as Array<{
      id: string;
      entityType: string;
      entityId: string;
      actionType: string;
      payload: string;
      timestamp: number;
      status: string;
      retryCount: number;
      error: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entityType as SyncAction["entityType"],
      entityId: row.entityId,
      actionType: row.actionType as SyncAction["actionType"],
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
      status: row.status as SyncAction["status"],
      retryCount: row.retryCount,
      error: row.error ?? undefined,
    }));
  }

  async savePendingAction(action: SyncAction): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO sync_actions (id, entityType, entityId, actionType, payload, timestamp, status, retryCount, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action.id,
        action.entityType,
        action.entityId,
        action.actionType,
        JSON.stringify(action.payload),
        action.timestamp,
        action.status,
        action.retryCount,
        action.error ?? null,
      ]
    );
  }

  async updateActionStatus(
    id: string,
    status: SyncAction["status"],
    error?: string
  ): Promise<void> {
    this.db.runSync(
      "UPDATE sync_actions SET status = ?, error = ? WHERE id = ?",
      [status, error ?? null, id]
    );
  }

  async removeAction(id: string): Promise<void> {
    this.db.runSync("DELETE FROM sync_actions WHERE id = ?", [id]);
  }

  async clearAll(): Promise<void> {
    this.db.runSync("DELETE FROM sync_actions");
  }
}
