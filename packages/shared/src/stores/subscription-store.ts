import { create } from "zustand";
import type {
  SubscriptionInfo,
  SubscriptionPlan,
  UsageInfo,
  QuotaExceededError,
} from "../types";
import { getTierLimits } from "../types";

// Platform adapter for fetching subscription data
export interface SubscriptionFetchAdapter {
  fetchSubscription(): Promise<{
    subscription: SubscriptionInfo;
    usage: UsageInfo;
  }>;
}

let fetchAdapter: SubscriptionFetchAdapter | null = null;

export function configureSubscriptionStore(adapter: SubscriptionFetchAdapter) {
  fetchAdapter = adapter;
}

export function resetSubscriptionAdapter() {
  fetchAdapter = null;
}

interface SubscriptionState {
  subscription: SubscriptionInfo;
  usage: UsageInfo;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionActions {
  fetchSubscriptionStatus: () => Promise<void>;
  incrementUsage: (resource: "documentUploads" | "aiRequests") => void;
  canUploadDocument: () => boolean;
  canMakeAIRequest: () => boolean;
  getQuotaError: (
    resource: "documents" | "ai_requests"
  ) => QuotaExceededError | null;
  reset: () => void;
}

export type SubscriptionStore = SubscriptionState & SubscriptionActions;

const defaultSubscription: SubscriptionInfo = {
  plan: "free",
  status: "active",
  provider: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

const defaultUsage: UsageInfo = {
  documentUploads: 0,
  aiRequests: 0,
  periodStart: new Date().toISOString(),
};

const initialState: SubscriptionState = {
  subscription: defaultSubscription,
  usage: defaultUsage,
  isLoaded: false,
  isLoading: false,
  error: null,
};

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  ...initialState,

  fetchSubscriptionStatus: async () => {
    if (!fetchAdapter) return;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchAdapter.fetchSubscription();
      set({
        subscription: data.subscription,
        usage: data.usage,
        isLoaded: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ error: message, isLoading: false });
    }
  },

  incrementUsage: (resource) => {
    const { usage } = get();
    set({
      usage: {
        ...usage,
        [resource]: usage[resource] + 1,
      },
    });
  },

  canUploadDocument: () => {
    const { subscription, usage } = get();
    const limits = getTierLimits(subscription.plan);
    return usage.documentUploads < limits.maxDocuments;
  },

  canMakeAIRequest: () => {
    const { subscription, usage } = get();
    const limits = getTierLimits(subscription.plan);
    return usage.aiRequests < limits.maxAIRequestsPerMonth;
  },

  getQuotaError: (resource) => {
    const { subscription, usage } = get();
    const limits = getTierLimits(subscription.plan);
    if (
      resource === "documents" &&
      usage.documentUploads >= limits.maxDocuments
    ) {
      return {
        error: "quota_exceeded" as const,
        resource: "documents" as const,
        current: usage.documentUploads,
        limit: limits.maxDocuments,
        plan: subscription.plan,
      };
    }
    if (
      resource === "ai_requests" &&
      usage.aiRequests >= limits.maxAIRequestsPerMonth
    ) {
      return {
        error: "quota_exceeded" as const,
        resource: "ai_requests" as const,
        current: usage.aiRequests,
        limit: limits.maxAIRequestsPerMonth,
        plan: subscription.plan,
      };
    }
    return null;
  },

  reset: () => set(initialState),
}));
