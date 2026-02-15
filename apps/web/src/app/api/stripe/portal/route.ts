import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const sub = await db.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!sub?.providerCustomerId) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.providerCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[STRIPE_PORTAL]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
