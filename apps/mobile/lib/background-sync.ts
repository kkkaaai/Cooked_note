import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { useSyncStore } from "@cookednote/shared/stores/sync-store";

const BACKGROUND_SYNC_TASK = "cookednote-background-sync";

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const { pendingActions } = useSyncStore.getState();
    if (pendingActions.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // TODO: Background tasks don't have active auth context.
    // Flushing with null token will fail on authenticated endpoints (401).
    // To fix: retrieve stored Clerk session token from SecureStore here.
    await useSyncStore.getState().flushQueue(null);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.warn("Background sync registration failed:", err);
  }
}
