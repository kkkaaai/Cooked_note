import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe, STRIPE_PRICES } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["pro_monthly", "pro_yearly"]),
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { plan } = checkoutSchema.parse(body);

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Find or create Stripe customer
    const existingSub = await db.subscription.findUnique({
      where: { userId: user.id },
    });

    let customerId = existingSub?.providerCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id, clerkId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICES[plan], quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/settings`,
      metadata: { userId: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid plan", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[STRIPE_CHECKOUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
