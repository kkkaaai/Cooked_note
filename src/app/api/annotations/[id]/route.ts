import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const annotation = await db.annotation.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!annotation || annotation.user.clerkId !== userId) {
      return new NextResponse("Not found", { status: 404 });
    }

    const updated = await db.annotation.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ANNOTATION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const annotation = await db.annotation.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!annotation || annotation.user.clerkId !== userId) {
      return new NextResponse("Not found", { status: 404 });
    }

    await db.annotation.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[ANNOTATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
