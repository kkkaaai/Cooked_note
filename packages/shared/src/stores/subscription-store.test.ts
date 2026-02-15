import { describe, it, expect, beforeEach } from "vitest";
import {
  useSubscriptionStore,
  configureSubscriptionStore,
  resetSubscriptionAdapter,
} from "./subscription-store";
import { isPro, getTierLimits, FREE_TIER_LIMITS, PRO_TIER_LIMITS } from "../types";
import type { SubscriptionInfo, UsageInfo } from "../types";

function resetStore() {
  useSubscriptionStore.setState({
    subscription: {
      plan: "free",
      status: "active",
      provider: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    usage: {
      documentUploads: 0,
      aiRequests: 0,
      periodStart: new Date().toISOString(),
    },
    isLoaded: false,
    isLoading: false,
    error: null,
  });
}

describe("subscription-store", () => {
  beforeEach(() => {
    resetStore();
    resetSubscriptionAdapter();
  });

  describe("canUploadDocument", () => {
    it("returns true when under free tier limit", () => {
      useSubscriptionStore.setState({
        usage: { documentUploads: 2, aiRequests: 0, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().canUploadDocument()).toBe(true);
    });

    it("returns false when at free tier limit", () => {
      useSubscriptionStore.setState({
        usage: { documentUploads: 3, aiRequests: 0, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().canUploadDocument()).toBe(false);
    });

    it("returns true for pro users regardless of count", () => {
      useSubscriptionStore.setState({
        subscription: {
          plan: "pro_monthly",
          status: "active",
          provider: "stripe",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        usage: { documentUploads: 100, aiRequests: 0, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().canUploadDocument()).toBe(true);
    });
  });

  describe("canMakeAIRequest", () => {
    it("returns true when under free tier limit", () => {
      useSubscriptionStore.setState({
        usage: { documentUploads: 0, aiRequests: 9, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().canMakeAIRequest()).toBe(true);
    });

    it("returns false when at free tier limit", () => {
      useSubscriptionStore.setState({
        usage: { documentUploads: 0, aiRequests: 10, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().canMakeAIRequest()).toBe(false);
    });

    it("returns true for pro yearly users", () => {
      useSubscriptionStore.setState({
        subscription: {
          plan: "pro_yearly",
          status: "active",
          provider: "revenuecat",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        usage: { documentUploads: 0, aiRequests: 500, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().canMakeAIRequest()).toBe(true);
    });
  });

  describe("incrementUsage", () => {
    it("increments document uploads", () => {
      useSubscriptionStore.getState().incrementUsage("documentUploads");
      expect(useSubscriptionStore.getState().usage.documentUploads).toBe(1);
      useSubscriptionStore.getState().incrementUsage("documentUploads");
      expect(useSubscriptionStore.getState().usage.documentUploads).toBe(2);
    });

    it("increments AI requests", () => {
      useSubscriptionStore.getState().incrementUsage("aiRequests");
      useSubscriptionStore.getState().incrementUsage("aiRequests");
      useSubscriptionStore.getState().incrementUsage("aiRequests");
      expect(useSubscriptionStore.getState().usage.aiRequests).toBe(3);
    });
  });

  describe("getQuotaError", () => {
    it("returns null when under document limit", () => {
      useSubscriptionStore.setState({
        usage: { documentUploads: 2, aiRequests: 0, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().getQuotaError("documents")).toBeNull();
    });

    it("returns structured error when at document limit", () => {
      useSubscriptionStore.setState({
        usage: { documentUploads: 3, aiRequests: 0, periodStart: "" },
      });
      const error = useSubscriptionStore.getState().getQuotaError("documents");
      expect(error).toEqual({
        error: "quota_exceeded",
        resource: "documents",
        current: 3,
        limit: 3,
        plan: "free",
      });
    });

    it("returns structured error when at AI limit", () => {
      useSubscriptionStore.setState({
        usage: { documentUploads: 0, aiRequests: 10, periodStart: "" },
      });
      const error = useSubscriptionStore.getState().getQuotaError("ai_requests");
      expect(error).toEqual({
        error: "quota_exceeded",
        resource: "ai_requests",
        current: 10,
        limit: 10,
        plan: "free",
      });
    });

    it("returns null for pro users even at high usage", () => {
      useSubscriptionStore.setState({
        subscription: {
          plan: "pro_monthly",
          status: "active",
          provider: "stripe",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        usage: { documentUploads: 100, aiRequests: 1000, periodStart: "" },
      });
      expect(useSubscriptionStore.getState().getQuotaError("documents")).toBeNull();
      expect(useSubscriptionStore.getState().getQuotaError("ai_requests")).toBeNull();
    });
  });

  describe("fetchSubscriptionStatus", () => {
    it("does nothing without adapter", async () => {
      await useSubscriptionStore.getState().fetchSubscriptionStatus();
      expect(useSubscriptionStore.getState().isLoaded).toBe(false);
    });

    it("fetches and sets subscription data", async () => {
      const mockSub: SubscriptionInfo = {
        plan: "pro_monthly",
        status: "active",
        provider: "stripe",
        currentPeriodEnd: "2026-03-15T00:00:00Z",
        cancelAtPeriodEnd: false,
      };
      const mockUsage: UsageInfo = {
        documentUploads: 5,
        aiRequests: 20,
        periodStart: "2026-02-01T00:00:00Z",
      };

      configureSubscriptionStore({
        fetchSubscription: async () => ({
          subscription: mockSub,
          usage: mockUsage,
        }),
      });

      await useSubscriptionStore.getState().fetchSubscriptionStatus();
      const state = useSubscriptionStore.getState();
      expect(state.subscription).toEqual(mockSub);
      expect(state.usage).toEqual(mockUsage);
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("sets error on fetch failure", async () => {
      configureSubscriptionStore({
        fetchSubscription: async () => {
          throw new Error("Network error");
        },
      });

      await useSubscriptionStore.getState().fetchSubscriptionStatus();
      expect(useSubscriptionStore.getState().error).toBe("Network error");
      expect(useSubscriptionStore.getState().isLoading).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets to initial state", () => {
      useSubscriptionStore.setState({
        subscription: {
          plan: "pro_monthly",
          status: "active",
          provider: "stripe",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        usage: { documentUploads: 10, aiRequests: 50, periodStart: "" },
        isLoaded: true,
      });
      useSubscriptionStore.getState().reset();
      expect(useSubscriptionStore.getState().subscription.plan).toBe("free");
      expect(useSubscriptionStore.getState().usage.documentUploads).toBe(0);
      expect(useSubscriptionStore.getState().isLoaded).toBe(false);
    });
  });
});

describe("type utilities", () => {
  it("isPro returns true for pro plans", () => {
    expect(isPro("pro_monthly")).toBe(true);
    expect(isPro("pro_yearly")).toBe(true);
    expect(isPro("free")).toBe(false);
  });

  it("getTierLimits returns correct limits", () => {
    expect(getTierLimits("free")).toBe(FREE_TIER_LIMITS);
    expect(getTierLimits("pro_monthly")).toBe(PRO_TIER_LIMITS);
    expect(getTierLimits("pro_yearly")).toBe(PRO_TIER_LIMITS);
  });

  it("free tier has correct limits", () => {
    expect(FREE_TIER_LIMITS.maxDocuments).toBe(3);
    expect(FREE_TIER_LIMITS.maxAIRequestsPerMonth).toBe(10);
  });

  it("pro tier has unlimited limits", () => {
    expect(PRO_TIER_LIMITS.maxDocuments).toBe(Infinity);
    expect(PRO_TIER_LIMITS.maxAIRequestsPerMonth).toBe(Infinity);
  });
});
