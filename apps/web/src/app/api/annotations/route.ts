import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const normalizedRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

const highlightPositionSchema = z.object({
  rects: z.array(normalizedRectSchema).min(1),
});

const drawingPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  pressure: z.number().min(0).max(1),
});

const drawingStrokeSchema = z.object({
  id: z.string(),
  points: z.array(drawingPointSchema).min(1),
  color: z.string(),
  size: z.number().positive(),
  tool: z.enum(["pen", "highlighter", "eraser"]),
  timestamp: z.number(),
});

const drawingPositionSchema = z.object({
  strokes: z.array(drawingStrokeSchema),
});

const positionSchema = z.union([highlightPositionSchema, drawingPositionSchema]);

const createAnnotationSchema = z.object({
  documentId: z.string().uuid(),
  type: z.enum(["highlight", "note", "ai_explanation", "drawing"]),
  pageNumber: z.number().int().positive(),
  color: z.string().optional(),
  position: positionSchema,
  selectedText: z.string().optional(),
  content: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    const annotations = await db.annotation.findMany({
      where: { documentId, user: { clerkId: userId } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(annotations);
  } catch (error) {
    console.error("[ANNOTATIONS_GET]", error);
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
    const validated = createAnnotationSchema.parse(body);

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const annotation = await db.annotation.create({
      data: {
        ...validated,
        userId: user.id,
      },
    });

    return NextResponse.json(annotation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[ANNOTATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
