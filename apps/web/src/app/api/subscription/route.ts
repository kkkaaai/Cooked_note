import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserPlan, getOrCreateUsageRecord } from "@/lib/quota";
import type { SubscriptionInfo, SubscriptionStatusValue, UsageInfo } from "@cookednote/shared/types";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      // New user — return free defaults
      const defaultResponse: { subscription: SubscriptionInfo; usage: UsageInfo } = {
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
      };
      return NextResponse.json(defaultResponse);
    }

    const [sub, usageRecord] = await Promise.all([
      db.subscription.findUnique({ where: { userId: user.id } }),
      getOrCreateUsageRecord(user.id),
    ]);

    const plan = await getUserPlan(user.id);

    const STATUS_MAP: Record<string, SubscriptionStatusValue> = {
      active: "active",
      canceled: "canceled",
      past_due: "past_due",
      expired: "expired",
    };

    const subscription: SubscriptionInfo = {
      plan,
      status: STATUS_MAP[sub?.status ?? ""] ?? "active",
      provider: (sub?.provider as "stripe" | "revenuecat") ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    };

    const usage: UsageInfo = {
      documentUploads: usageRecord.documentUploads,
      aiRequests: usageRecord.aiRequests,
      periodStart: usageRecord.periodStart.toISOString(),
    };

    return NextResponse.json({ subscription, usage });
  } catch (error) {
    console.error("[SUBSCRIPTION_STATUS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
