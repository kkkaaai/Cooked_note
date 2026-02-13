import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

/** Strip syncVersion from payload before passing to Prisma update. */
function stripSyncVersion(payload: Record<string, unknown>): Record<string, unknown> {
  const result = { ...payload };
  delete result.syncVersion;
  return result;
}

const syncActionSchema = z.object({
  id: z.string(),
  entityType: z.enum(["annotation", "document", "folder"]),
  entityId: z.string(),
  actionType: z.enum(["create", "update", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.number(),
});

const batchSyncSchema = z.object({
  actions: z.array(syncActionSchema).min(1).max(50),
});

interface SyncResult {
  id: string;
  success: boolean;
  entity?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}

/**
 * POST /api/sync — Process a batch of sync actions.
 * Returns per-action results (success, conflict, or error).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const body = await req.json();
    const parsed = batchSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const results: SyncResult[] = [];

    for (const action of parsed.data.actions) {
      try {
        const result = await processAction(action, user.id);
        results.push({ id: action.id, ...result });
      } catch (err) {
        results.push({
          id: action.id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
          statusCode: 500,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[SYNC_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

async function processAction(
  action: z.infer<typeof syncActionSchema>,
  dbUserId: string
): Promise<Omit<SyncResult, "id">> {
  const { entityType, entityId, actionType, payload } = action;

  switch (entityType) {
    case "annotation":
      return processAnnotationAction(entityId, actionType, payload, dbUserId);
    case "document":
      return processDocumentAction(entityId, actionType, payload, dbUserId);
    case "folder":
      return processFolderAction(entityId, actionType, payload, dbUserId);
    default:
      return { success: false, error: `Unknown entity type: ${entityType}`, statusCode: 400 };
  }
}

async function processAnnotationAction(
  entityId: string,
  actionType: string,
  payload: Record<string, unknown>,
  dbUserId: string
): Promise<Omit<SyncResult, "id">> {
  switch (actionType) {
    case "create": {
      // Verify user owns the document before creating annotation
      const doc = await db.document.findFirst({
        where: { id: payload.documentId as string, userId: dbUserId },
      });
      if (!doc) return { success: false, error: "Document not found", statusCode: 404 };

      const annotation = await db.annotation.create({
        data: {
          documentId: payload.documentId as string,
          userId: dbUserId,
          type: payload.type as string,
          pageNumber: payload.pageNumber as number,
          color: (payload.color as string) ?? null,
          position: payload.position as object,
          selectedText: (payload.selectedText as string) ?? null,
          content: (payload.content as string) ?? null,
        },
      });
      return { success: true, entity: annotation as unknown as Record<string, unknown> };
    }
    case "update": {
      const existing = await db.annotation.findFirst({
        where: { id: entityId, userId: dbUserId },
      });
      if (!existing) return { success: false, error: "Not found", statusCode: 404 };

      const clientVersion = payload.syncVersion as number | undefined;
      if (clientVersion !== undefined && existing.syncVersion !== clientVersion) {
        return {
          success: false,
          statusCode: 409,
          entity: existing as unknown as Record<string, unknown>,
          error: "Conflict",
        };
      }

      const updateData = stripSyncVersion(payload);
      const updated = await db.annotation.update({
        where: { id: entityId },
        data: { ...updateData, syncVersion: { increment: 1 } },
      });
      return { success: true, entity: updated as unknown as Record<string, unknown> };
    }
    case "delete": {
      // Verify ownership before deleting
      const toDelete = await db.annotation.findFirst({
        where: { id: entityId, userId: dbUserId },
      });
      if (toDelete) {
        await db.annotation.delete({ where: { id: entityId } });
      }
      return { success: true };
    }
    default:
      return { success: false, error: `Unknown action: ${actionType}`, statusCode: 400 };
  }
}

async function processDocumentAction(
  entityId: string,
  actionType: string,
  payload: Record<string, unknown>,
  dbUserId: string
): Promise<Omit<SyncResult, "id">> {
  switch (actionType) {
    case "update": {
      const existing = await db.document.findFirst({
        where: { id: entityId, userId: dbUserId },
      });
      if (!existing) return { success: false, error: "Not found", statusCode: 404 };

      const clientVersion = payload.syncVersion as number | undefined;
      if (clientVersion !== undefined && existing.syncVersion !== clientVersion) {
        return {
          success: false,
          statusCode: 409,
          entity: existing as unknown as Record<string, unknown>,
          error: "Conflict",
        };
      }

      const updateData = stripSyncVersion(payload);
      const updated = await db.document.update({
        where: { id: entityId },
        data: { ...updateData, syncVersion: { increment: 1 } },
      });
      return { success: true, entity: updated as unknown as Record<string, unknown> };
    }
    default:
      return { success: false, error: `Unsupported document action: ${actionType}`, statusCode: 400 };
  }
}

async function processFolderAction(
  entityId: string,
  actionType: string,
  payload: Record<string, unknown>,
  dbUserId: string
): Promise<Omit<SyncResult, "id">> {
  switch (actionType) {
    case "create": {
      const folder = await db.folder.create({
        data: {
          userId: dbUserId,
          name: payload.name as string,
          color: (payload.color as string) ?? "#3B82F6",
          parentId: (payload.parentId as string) ?? null,
        },
        include: { _count: { select: { documents: true } } },
      });
      return { success: true, entity: folder as unknown as Record<string, unknown> };
    }
    case "update": {
      const existing = await db.folder.findFirst({ where: { id: entityId, userId: dbUserId } });
      if (!existing) return { success: false, error: "Not found", statusCode: 404 };

      const clientVersion = payload.syncVersion as number | undefined;
      if (clientVersion !== undefined && existing.syncVersion !== clientVersion) {
        return {
          success: false,
          statusCode: 409,
          entity: existing as unknown as Record<string, unknown>,
          error: "Conflict",
        };
      }

      const updateData = stripSyncVersion(payload);
      const updated = await db.folder.update({
        where: { id: entityId },
        data: { ...updateData, syncVersion: { increment: 1 } },
        include: { _count: { select: { documents: true } } },
      });
      return { success: true, entity: updated as unknown as Record<string, unknown> };
    }
    case "delete": {
      // Verify ownership before deleting
      const toDelete = await db.folder.findFirst({
        where: { id: entityId, userId: dbUserId },
      });
      if (toDelete) {
        await db.folder.delete({ where: { id: entityId } });
      }
      return { success: true };
    }
    default:
      return { success: false, error: `Unknown action: ${actionType}`, statusCode: 400 };
  }
}

/**
 * GET /api/sync?since=<timestamp> — Fetch all entities modified since a given time.
 * Used for catch-up sync after long offline periods.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const since = req.nextUrl.searchParams.get("since");
    const sinceDate = since ? new Date(parseInt(since, 10)) : new Date(0);

    const [annotations, documents, folders] = await Promise.all([
      db.annotation.findMany({
        where: { userId: user.id, updatedAt: { gte: sinceDate } },
        orderBy: { updatedAt: "asc" },
      }),
      db.document.findMany({
        where: { userId: user.id, updatedAt: { gte: sinceDate } },
        orderBy: { updatedAt: "asc" },
      }),
      db.folder.findMany({
        where: { userId: user.id, updatedAt: { gte: sinceDate } },
        orderBy: { updatedAt: "asc" },
        include: { _count: { select: { documents: true } } },
      }),
    ]);

    return NextResponse.json({
      annotations,
      documents,
      folders,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error("[SYNC_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
