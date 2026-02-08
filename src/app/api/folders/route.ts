import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const folders = await db.folder.findMany({
      where: { user: { clerkId: userId } },
      orderBy: { name: "asc" },
      include: { _count: { select: { documents: true } } },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error("[FOLDERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const parsed = createFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Validate parent folder if provided
    if (parsed.data.parentId) {
      const parent = await db.folder.findFirst({
        where: { id: parsed.data.parentId, userId: user.id },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    const folder = await db.folder.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color || "#3B82F6",
        parentId: parsed.data.parentId || null,
        userId: user.id,
      },
      include: { _count: { select: { documents: true } } },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("[FOLDERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
