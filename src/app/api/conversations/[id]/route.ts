import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(
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

    const conversation = await db.conversation.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        document: { select: { title: true, fileName: true } },
      },
    });

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("[CONVERSATION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

const addMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  screenshots: z.string().optional(), // JSON string of screenshots
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

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const conversation = await db.conversation.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    const body = await req.json();

    // Add new message to existing conversation
    if (body.message) {
      const parsed = addMessageSchema.safeParse(body.message);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid message", details: parsed.error.issues },
          { status: 400 }
        );
      }

      await db.message.create({
        data: {
          conversationId: params.id,
          role: parsed.data.role,
          content: parsed.data.content,
          screenshots: parsed.data.screenshots,
        },
      });

      // Update conversation timestamp
      await db.conversation.update({
        where: { id: params.id },
        data: { updatedAt: new Date() },
      });
    }

    const updated = await db.conversation.findUnique({
      where: { id: params.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        document: { select: { title: true, fileName: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[CONVERSATION_PATCH]", error);
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

    const conversation = await db.conversation.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    await db.conversation.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CONVERSATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
