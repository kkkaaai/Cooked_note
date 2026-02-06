import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { z } from "zod";

const chatSchema = z.object({
  documentId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { documentId, messages } = chatSchema.parse(body);

    // Get document context
    const aiContext = await db.aIContext.findUnique({
      where: { documentId },
    });

    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: `You are a helpful AI assistant discussing a PDF document with the user.
Provide clear, contextual answers based on the document content.
${aiContext ? `\nDocument context:\n${aiContext.extractedText.substring(0, 10000)}` : ""}`,
      messages,
    });

    const reply =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[AI_CHAT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
