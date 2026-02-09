import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const screenshotSchema = z.object({
  id: z.string(),
  base64: z.string(),
  pageNumber: z.number(),
  region: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  createdAt: z.number(),
});

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  screenshots: z.array(screenshotSchema).optional(),
});

const createConversationSchema = z.object({
  documentId: z.string().uuid(),
  pageNumber: z.number().int().positive(),
  title: z.string().min(1).max(200),
  screenshots: z.array(screenshotSchema),
  messages: z.array(messageSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const where: Record<string, unknown> = { userId: user.id };
    if (documentId) {
      where.documentId = documentId;
    }

    const conversations = await db.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        document: { select: { title: true, fileName: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[CONVERSATIONS_GET]", error);
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
    const parsed = createConversationSchema.safeParse(body);
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

    // Verify document exists and belongs to user
    const document = await db.document.findFirst({
      where: { id: parsed.data.documentId, userId: user.id },
    });
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Store screenshots without base64 data to save DB space
    // Only keep metadata (pageNumber, region) — thumbnails reconstructed from first screenshot
    const screenshotMeta = parsed.data.screenshots.map((s) => ({
      id: s.id,
      base64: s.base64,
      pageNumber: s.pageNumber,
      region: s.region,
      createdAt: s.createdAt,
    }));

    const conversation = await db.conversation.create({
      data: {
        userId: user.id,
        documentId: parsed.data.documentId,
        pageNumber: parsed.data.pageNumber,
        title: parsed.data.title,
        screenshots: JSON.stringify(screenshotMeta),
        messages: {
          create: parsed.data.messages.map((m) => ({
            role: m.role,
            content: m.content,
            screenshots: m.screenshots ? JSON.stringify(m.screenshots) : undefined,
          })),
        },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        document: { select: { title: true, fileName: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("[CONVERSATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
