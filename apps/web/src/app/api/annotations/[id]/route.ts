import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

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

const updateAnnotationSchema = z.object({
  color: z.string().optional(),
  content: z.string().optional(),
  position: z
    .union([
      z.object({ rects: z.array(z.any()).min(1) }),
      z.object({ strokes: z.array(drawingStrokeSchema) }),
    ])
    .optional(),
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
    const validated = updateAnnotationSchema.parse(body);

    const annotation = await db.annotation.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!annotation || annotation.user.clerkId !== userId) {
      return new NextResponse("Not found", { status: 404 });
    }

    const updated = await db.annotation.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[ANNOTATION_PATCH]", error);
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

    const annotation = await db.annotation.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!annotation || annotation.user.clerkId !== userId) {
      return new NextResponse("Not found", { status: 404 });
    }

    await db.annotation.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[ANNOTATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
