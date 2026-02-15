import { configureSubscriptionStore } from "@cookednote/shared/stores/subscription-store";
import { apiFetch } from "./api";

export function initSubscriptionAdapter(token: string | null) {
  configureSubscriptionStore({
    fetchSubscription: async () => {
      const res = await apiFetch("/api/subscription", token);
      if (!res.ok) {
        throw new Error("Failed to fetch subscription status");
      }
      return res.json();
    },
  });
}
