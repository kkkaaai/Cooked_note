import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

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
    const parsed = updateFolderSchema.safeParse(body);
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

    const folder = await db.folder.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!folder) {
      return new NextResponse("Folder not found", { status: 404 });
    }

    // Prevent moving folder into itself or its descendants
    if (parsed.data.parentId !== undefined && parsed.data.parentId !== null) {
      if (parsed.data.parentId === params.id) {
        return NextResponse.json(
          { error: "Cannot move folder into itself" },
          { status: 400 }
        );
      }
      // Check the parent isn't a descendant
      let current = parsed.data.parentId;
      while (current) {
        const parent = await db.folder.findUnique({
          where: { id: current },
          select: { parentId: true },
        });
        if (!parent) break;
        if (parent.parentId === params.id) {
          return NextResponse.json(
            { error: "Cannot move folder into its own descendant" },
            { status: 400 }
          );
        }
        current = parent.parentId!;
      }
    }

    const updated = await db.folder.update({
      where: { id: params.id },
      data: parsed.data,
      include: { _count: { select: { documents: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[FOLDERS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const folder = await db.folder.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!folder) {
      return new NextResponse("Folder not found", { status: 404 });
    }

    // Move documents in this folder to root (unfiled)
    await db.document.updateMany({
      where: { folderId: params.id },
      data: { folderId: null },
    });

    // Move child folders to parent (or root)
    await db.folder.updateMany({
      where: { parentId: params.id },
      data: { parentId: folder.parentId },
    });

    await db.folder.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[FOLDERS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
