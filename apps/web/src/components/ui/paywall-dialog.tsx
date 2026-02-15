"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLAN_PRICES, FREE_TIER_LIMITS } from "@cookednote/shared/types";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallDialog({ open, onOpenChange }: PaywallDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<
    "pro_monthly" | "pro_yearly"
  >("pro_yearly");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleUpgrade() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Checkout failed", description: "Please try again.", variant: "destructive" });
        setIsLoading(false);
      }
    } catch {
      toast({ title: "Checkout failed", description: "Could not connect to payment service.", variant: "destructive" });
      setIsLoading(false);
    }
  }

  const monthlySaving = Math.round(
    ((PLAN_PRICES.pro_monthly.amount * 12 - PLAN_PRICES.pro_yearly.amount) /
      (PLAN_PRICES.pro_monthly.amount * 12)) *
      100
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited documents and AI requests
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Plan comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Free tier */}
            <div className="rounded-lg border p-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Free
              </h3>
              <p className="mt-1 text-2xl font-bold">$0</p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4" />
                  {FREE_TIER_LIMITS.maxDocuments} documents
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4" />
                  {FREE_TIER_LIMITS.maxAIRequestsPerMonth} AI requests/mo
                </li>
              </ul>
            </div>

            {/* Pro tier */}
            <div className="rounded-lg border-2 border-blue-500 p-4 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white">
                Recommended
              </div>
              <h3 className="font-medium text-sm text-blue-600">Pro</h3>
              <p className="mt-1 text-2xl font-bold">
                {selectedPlan === "pro_yearly"
                  ? PLAN_PRICES.pro_yearly.label
                  : PLAN_PRICES.pro_monthly.label}
              </p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600" />
                  Unlimited documents
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600" />
                  Unlimited AI requests
                </li>
              </ul>
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setSelectedPlan("pro_monthly")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                selectedPlan === "pro_monthly"
                  ? "bg-gray-900 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan("pro_yearly")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                selectedPlan === "pro_yearly"
                  ? "bg-gray-900 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600 font-medium">
                Save {monthlySaving}%
              </span>
            </button>
          </div>

          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              `Upgrade to Pro — ${
                selectedPlan === "pro_yearly"
                  ? PLAN_PRICES.pro_yearly.label
                  : PLAN_PRICES.pro_monthly.label
              }`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
