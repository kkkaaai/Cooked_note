import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deletePDF } from "@/lib/storage";

const BUCKET_NAME = "documents";

function extractStoragePath(fileUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx + marker.length));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const document = await db.document.findUnique({
      where: { id: params.id },
      include: { annotations: true },
    });

    if (!document) {
      return new NextResponse("Not found", { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("[DOCUMENT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check for JSON body (optional — touch requests send no body)
    let data: Record<string, unknown> = { lastOpenedAt: new Date() };
    let clientSyncVersion: number | undefined;
    try {
      const body = await req.json();
      if (body.folderId !== undefined) {
        data = { ...data, folderId: body.folderId };
      }
      if (body.title !== undefined) {
        data = { ...data, title: body.title };
      }
      if (body.syncVersion !== undefined) {
        clientSyncVersion = body.syncVersion;
      }
    } catch {
      // No body — just touch lastOpenedAt
    }

    // Conflict detection
    if (clientSyncVersion !== undefined) {
      const existing = await db.document.findUnique({
        where: { id: params.id },
      });
      if (existing && existing.syncVersion !== clientSyncVersion) {
        return NextResponse.json(
          { error: "Conflict", serverEntity: existing },
          { status: 409 }
        );
      }
      data.syncVersion = { increment: 1 };
    }

    const document = await db.document.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("[DOCUMENT_PATCH]", error);
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

    // Fetch document to get storage path before deleting
    const document = await db.document.findUnique({
      where: { id: params.id },
      select: { fileUrl: true },
    });

    if (!document) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Delete from storage
    const storagePath = extractStoragePath(document.fileUrl);
    if (storagePath) {
      try {
        await deletePDF(storagePath);
      } catch (err) {
        console.error("[DOCUMENT_DELETE] Storage cleanup failed:", err);
        // Continue with DB deletion even if storage cleanup fails
      }
    }

    // Delete from database (cascades to annotations + AI context)
    await db.document.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DOCUMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
