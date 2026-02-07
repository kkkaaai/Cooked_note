import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, getRelevantContextForPages, buildVisionSystemPrompt } from "@/lib/ai";
import { db } from "@/lib/db";
import { z } from "zod";

const contentBlockSchema = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    source: z.object({
      type: z.literal("base64"),
      media_type: z.literal("image/png"),
      data: z.string(),
    }),
  }),
]);

const messageContentSchema = z.union([
  z.string(),
  z.array(contentBlockSchema),
]);

const chatSchema = z.object({
  documentId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: messageContentSchema,
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { documentId, messages } = chatSchema.parse(body);

    // Extract page numbers from metadata if available, default to page 1
    const pageNumbers = [1];

    // Get document context and page count
    const [aiContext, document] = await Promise.all([
      db.aIContext.findUnique({ where: { documentId } }),
      db.document.findUnique({ where: { id: documentId }, select: { pageCount: true } }),
    ]);

    const context = aiContext
      ? getRelevantContextForPages(aiContext.extractedText, pageNumbers)
      : "";
    const pageCount = document?.pageCount ?? 0;

    const client = getAnthropicClient();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = client.messages.stream({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 2048,
            system: buildVisionSystemPrompt(context, pageCount),
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content as string | Array<{ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/png"; data: string } }>,
            })),
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
    console.error("[AI_CHAT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
