"use client";

import { useSubscriptionStore } from "@cookednote/shared/stores/subscription-store";
import { isPro } from "@cookednote/shared/types";

export function SubscriptionBadge() {
  const plan = useSubscriptionStore((s) => s.subscription.plan);

  if (isPro(plan)) {
    return (
      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2.5 py-0.5 text-xs font-medium text-white">
        Pro
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      Free
    </span>
  );
}
