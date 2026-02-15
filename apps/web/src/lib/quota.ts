import { db } from "@/lib/db";
import {
  getTierLimits,
} from "@cookednote/shared/types";
import type {
  SubscriptionPlan,
  QuotaExceededError,
} from "@cookednote/shared/types";

function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
}

export async function getUserPlan(
  userId: string
): Promise<SubscriptionPlan> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== "active") return "free";
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
    return "free";
  }
  return sub.plan as SubscriptionPlan;
}

export async function getOrCreateUsageRecord(userId: string) {
  const periodStart = getMonthStart();
  return db.usageRecord.upsert({
    where: { userId_periodStart: { userId, periodStart } },
    create: { userId, periodStart },
    update: {},
  });
}

export async function checkDocumentQuota(
  userId: string
): Promise<QuotaExceededError | null> {
  const plan = await getUserPlan(userId);
  const limits = getTierLimits(plan);
  if (limits.maxDocuments === Infinity) return null;

  const usage = await getOrCreateUsageRecord(userId);
  if (usage.documentUploads >= limits.maxDocuments) {
    return {
      error: "quota_exceeded",
      resource: "documents",
      current: usage.documentUploads,
      limit: limits.maxDocuments,
      plan,
    };
  }
  return null;
}

export async function checkAIQuota(
  userId: string
): Promise<QuotaExceededError | null> {
  const plan = await getUserPlan(userId);
  const limits = getTierLimits(plan);
  if (limits.maxAIRequestsPerMonth === Infinity) return null;

  const usage = await getOrCreateUsageRecord(userId);
  if (usage.aiRequests >= limits.maxAIRequestsPerMonth) {
    return {
      error: "quota_exceeded",
      resource: "ai_requests",
      current: usage.aiRequests,
      limit: limits.maxAIRequestsPerMonth,
      plan,
    };
  }
  return null;
}

export async function incrementDocumentUsage(userId: string): Promise<void> {
  const periodStart = getMonthStart();
  await db.usageRecord.upsert({
    where: { userId_periodStart: { userId, periodStart } },
    create: { userId, periodStart, documentUploads: 1 },
    update: { documentUploads: { increment: 1 } },
  });
}

export async function decrementDocumentUsage(userId: string): Promise<void> {
  const periodStart = getMonthStart();
  await db.usageRecord.update({
    where: { userId_periodStart: { userId, periodStart } },
    data: { documentUploads: { decrement: 1 } },
  });
}

export async function incrementAIUsage(userId: string): Promise<void> {
  const periodStart = getMonthStart();
  await db.usageRecord.upsert({
    where: { userId_periodStart: { userId, periodStart } },
    create: { userId, periodStart, aiRequests: 1 },
    update: { aiRequests: { increment: 1 } },
  });
}
