import { configureSubscriptionStore } from "@cookednote/shared/stores/subscription-store";
import type { SubscriptionInfo, UsageInfo } from "@cookednote/shared/types";

export function initSubscriptionAdapter() {
  configureSubscriptionStore({
    fetchSubscription: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        throw new Error("Failed to fetch subscription status");
      }
      return res.json() as Promise<{ subscription: SubscriptionInfo; usage: UsageInfo }>;
    },
  });
}
