"use client";

import { useSubscriptionStore } from "@cookednote/shared/stores/subscription-store";
import { isPro, FREE_TIER_LIMITS } from "@cookednote/shared/types";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { PaywallDialog } from "./paywall-dialog";

export function UpgradeBanner() {
  const plan = useSubscriptionStore((s) => s.subscription.plan);
  const usage = useSubscriptionStore((s) => s.usage);
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);
  const [showPaywall, setShowPaywall] = useState(false);

  if (!isLoaded || isPro(plan)) return null;

  const docsUsed = usage.documentUploads;
  const docsLimit = FREE_TIER_LIMITS.maxDocuments;
  const aiUsed = usage.aiRequests;
  const aiLimit = FREE_TIER_LIMITS.maxAIRequestsPerMonth;

  const nearLimit = docsUsed >= docsLimit - 1 || aiUsed >= aiLimit - 2;
  if (!nearLimit) return null;

  return (
    <>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">
              Running low on your free plan
            </p>
            <p className="mt-1 text-sm text-blue-700">
              {docsUsed}/{docsLimit} documents uploaded, {aiUsed}/{aiLimit} AI
              requests used this month. Upgrade for unlimited access.
            </p>
          </div>
          <button
            onClick={() => setShowPaywall(true)}
            className="flex-shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Upgrade
          </button>
        </div>
      </div>

      <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} />
    </>
  );
}
