import type { SyncApiAdapter, SyncApiResult } from "@cookednote/shared/lib/sync-adapter";
import { getEndpointForAction } from "@cookednote/shared/lib/sync-adapter";
import type { SyncAction } from "@cookednote/shared/types";

export class WebSyncApi implements SyncApiAdapter {
  async executeAction(
    action: SyncAction,
    // Web uses cookie-based auth (Clerk), so token is not needed
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _authToken: string | null
  ): Promise<SyncApiResult> {
    const { path, method, body } = getEndpointForAction(action);

    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });

      if (res.ok) {
        const data = method === "DELETE" ? {} : await res.json();
        return { success: true, serverEntity: data, statusCode: res.status };
      }

      if (res.status === 409) {
        const data = await res.json();
        return {
          success: false,
          statusCode: 409,
          serverEntity: data.serverEntity ?? data,
          error: "Conflict",
        };
      }

      const errorText = await res.text().catch(() => "Unknown error");
      return {
        success: false,
        statusCode: res.status,
        error: errorText,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}
