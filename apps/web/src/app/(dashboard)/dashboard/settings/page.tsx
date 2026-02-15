"use client";

import { useSubscriptionStore } from "@cookednote/shared/stores/subscription-store";
import {
  isPro,
  FREE_TIER_LIMITS,
  PLAN_PRICES,
} from "@cookednote/shared/types";
import { SubscriptionBadge } from "@/components/ui/subscription-badge";
import { PaywallDialog } from "@/components/ui/paywall-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, CreditCard, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const usage = useSubscriptionStore((s) => s.usage);
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { toast } = useToast();

  async function handleManageSubscription() {
    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: "Could not open billing portal.", variant: "destructive" });
        setIsPortalLoading(false);
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to billing service.", variant: "destructive" });
      setIsPortalLoading(false);
    }
  }

  const userIsPro = isPro(subscription.plan);
  const docsLimit = userIsPro ? "Unlimited" : FREE_TIER_LIMITS.maxDocuments;
  const aiLimit = userIsPro
    ? "Unlimited"
    : FREE_TIER_LIMITS.maxAIRequestsPerMonth;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {!isLoaded ? (
        <div className="mt-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Plan section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Subscription</h2>
            </div>

            <div className="rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Current Plan</span>
                    <SubscriptionBadge />
                  </div>
                  {userIsPro && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subscription.plan === "pro_monthly"
                        ? PLAN_PRICES.pro_monthly.label
                        : PLAN_PRICES.pro_yearly.label}
                      {subscription.cancelAtPeriodEnd && (
                        <span className="ml-2 text-amber-600">
                          Cancels at period end
                        </span>
                      )}
                      {subscription.currentPeriodEnd && (
                        <span className="ml-2">
                          {"\u00B7"} Renews{" "}
                          {new Date(
                            subscription.currentPeriodEnd
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {userIsPro ? (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={
                      isPortalLoading ||
                      subscription.provider !== "stripe"
                    }
                  >
                    {isPortalLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {subscription.provider === "stripe"
                      ? "Manage"
                      : "Manage in App Store"}
                  </Button>
                ) : (
                  <Button onClick={() => setShowPaywall(true)}>
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Usage section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Usage This Month</h2>
            </div>

            <div className="rounded-lg border p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Documents uploaded</span>
                  <span className="font-medium">
                    {usage.documentUploads} / {docsLimit}
                  </span>
                </div>
                {!userIsPro && (
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.min(
                          (usage.documentUploads /
                            FREE_TIER_LIMITS.maxDocuments) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>AI requests</span>
                  <span className="font-medium">
                    {usage.aiRequests} / {aiLimit}
                  </span>
                </div>
                {!userIsPro && (
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{
                        width: `${Math.min(
                          (usage.aiRequests /
                            FREE_TIER_LIMITS.maxAIRequestsPerMonth) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
