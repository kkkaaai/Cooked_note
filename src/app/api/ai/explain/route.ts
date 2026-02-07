import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, getRelevantContext, buildExplainSystemPrompt } from "@/lib/ai";
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

    // Get document context and page count
    const [aiContext, document] = await Promise.all([
      db.aIContext.findUnique({ where: { documentId } }),
      db.document.findUnique({ where: { id: documentId }, select: { pageCount: true } }),
    ]);

    const context = aiContext
      ? getRelevantContext(aiContext.extractedText, pageNumber)
      : "";
    const pageCount = document?.pageCount ?? 0;

    const client = getAnthropicClient();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = client.messages.stream({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1024,
            system: buildExplainSystemPrompt(context, pageCount),
            messages: [
              {
                role: "user",
                content: `Please explain the following text from page ${pageNumber}:\n\n"${selectedText}"`,
              },
            ],
          });

          messageStream.on("text", (textDelta) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: textDelta })}\n\n`)
            );
          });

          messageStream.on("end", () => {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          });

          messageStream.on("error", (error) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Stream error" })}\n\n`
              )
            );
            controller.close();
          });
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Failed to start stream" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
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
