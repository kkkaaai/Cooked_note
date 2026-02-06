import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { z } from "zod";

const explainSchema = z.object({
  documentId: z.string().uuid(),
  selectedText: z.string().min(1),
  pageNumber: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { documentId, selectedText, pageNumber } = explainSchema.parse(body);

    // Get document context
    const aiContext = await db.aIContext.findUnique({
      where: { documentId },
    });

    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: `You are a helpful AI assistant that explains text from PDF documents.
You have access to the full document context and should provide clear, concise explanations.
${aiContext ? `\nDocument context:\n${aiContext.extractedText.substring(0, 10000)}` : ""}`,
      messages: [
        {
          role: "user",
          content: `Please explain the following text from page ${pageNumber}:\n\n"${selectedText}"`,
        },
      ],
    });

    const explanation =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ explanation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[AI_EXPLAIN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
