import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE_WEBHOOK_INVALID_SIG]", err instanceof Error ? err.message : "Unknown");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }
  } catch (error) {
    console.error("[STRIPE_WEBHOOK]", error);
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items?.data?.[0];
  if (!item) return { start: null, end: null };
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

const STRIPE_STATUS_MAP: Record<string, string> = {
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
};

function mapStripeStatus(stripeStatus: string): string {
  return STRIPE_STATUS_MAP[stripeStatus] ?? "expired";
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId || !session.subscription) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  const stripeSubscription =
    await stripe.subscriptions.retrieve(subscriptionId);

  const period = getSubscriptionPeriod(stripeSubscription);
  const plan = session.metadata?.plan ?? "pro_monthly";
  const customerId = getCustomerId(session.customer);

  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      provider: "stripe",
      providerCustomerId: customerId,
      providerSubId: subscriptionId,
      plan,
      status: "active",
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
    update: {
      provider: "stripe",
      providerCustomerId: customerId,
      providerSubId: subscriptionId,
      plan,
      status: "active",
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const sub = await db.subscription.findFirst({
    where: { providerSubId: subscription.id },
  });
  if (!sub) return;

  const status = mapStripeStatus(subscription.status);

  const period = getSubscriptionPeriod(subscription);

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const sub = await db.subscription.findFirst({
    where: { providerSubId: subscription.id },
  });
  if (!sub) return;

  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "expired" },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In Stripe v20, subscription is under parent.subscription_details
  const parent = invoice.parent as { subscription_details?: { subscription?: string | Stripe.Subscription } } | null;
  const subRef = parent?.subscription_details?.subscription;
  if (!subRef) return;

  const subscriptionId = typeof subRef === "string" ? subRef : subRef.id;

  const sub = await db.subscription.findFirst({
    where: { providerSubId: subscriptionId },
  });
  if (!sub) return;

  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "past_due" },
  });
}
