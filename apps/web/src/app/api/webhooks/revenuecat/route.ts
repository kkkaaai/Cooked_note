import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  expiration_at_ms?: number;
}

interface RevenueCatWebhookBody {
  event: RevenueCatEvent;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function planFromProductId(productId: string | undefined): string {
  if (!productId) return "pro_monthly";
  if (productId.includes("yearly") || productId.includes("annual")) {
    return "pro_yearly";
  }
  return "pro_monthly";
}

function verifyAuth(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expectedSecret || !verifyAuth(authHeader, expectedSecret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: RevenueCatWebhookBody;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { event } = body;
  if (!event?.app_user_id) {
    return new NextResponse("Missing app_user_id", { status: 400 });
  }

  const userId = event.app_user_id;

  // Validate user ID format
  if (!UUID_REGEX.test(userId)) {
    console.error("[REVENUECAT_WEBHOOK] Invalid user ID format", { userId });
    return new NextResponse("Invalid user ID format", { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error("[REVENUECAT_WEBHOOK] User not found", { userId });
    return new NextResponse("User not found", { status: 400 });
  }

  try {
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "NON_RENEWING_PURCHASE": {
        const plan = planFromProductId(event.product_id);
        const periodEnd = event.expiration_at_ms
          ? new Date(event.expiration_at_ms)
          : null;

        await db.subscription.upsert({
          where: { userId },
          create: {
            userId,
            provider: "revenuecat",
            providerCustomerId: userId,
            plan,
            status: "active",
            currentPeriodEnd: periodEnd,
          },
          update: {
            provider: "revenuecat",
            plan,
            status: "active",
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      case "RENEWAL": {
        const sub = await db.subscription.findUnique({ where: { userId } });
        if (!sub) break;

        const periodEnd = event.expiration_at_ms
          ? new Date(event.expiration_at_ms)
          : null;

        await db.subscription.update({
          where: { userId },
          data: {
            status: "active",
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      case "CANCELLATION": {
        const sub = await db.subscription.findUnique({ where: { userId } });
        if (!sub) break;

        await db.subscription.update({
          where: { userId },
          data: { cancelAtPeriodEnd: true },
        });
        break;
      }

      case "EXPIRATION": {
        const sub = await db.subscription.findUnique({ where: { userId } });
        if (!sub) break;

        await db.subscription.update({
          where: { userId },
          data: { status: "expired" },
        });
        break;
      }
    }
  } catch (error) {
    console.error("[REVENUECAT_WEBHOOK]", error);
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
