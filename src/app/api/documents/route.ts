import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const documents = await db.document.findMany({
      where: { user: { clerkId: userId } },
      orderBy: { lastOpenedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("[DOCUMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
