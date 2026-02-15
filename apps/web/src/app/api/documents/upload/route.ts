import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadPDF } from "@/lib/storage";
import { extractTextFromPDF, getPageCount } from "@/lib/pdf";
import { checkDocumentQuota, incrementDocumentUsage, decrementDocumentUsage } from "@/lib/quota";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return new NextResponse("User not found", { status: 401 });
      }
      user = await db.user.create({
        data: {
          clerkId,
          email: clerkUser.emailAddresses[0].emailAddress,
          name:
            [clerkUser.firstName, clerkUser.lastName]
              .filter(Boolean)
              .join(" ") || null,
        },
      });
    }

    // Check document quota
    const quotaError = await checkDocumentQuota(user.id);
    if (quotaError) {
      return NextResponse.json(quotaError, { status: 402 });
    }

    // Reserve quota atomically before upload to prevent TOCTOU race
    await incrementDocumentUsage(user.id);

    try {
      const rawArrayBuffer = await file.arrayBuffer();
      // Make independent copies — ArrayBuffers can be detached after transfer
      const rawBytes = new Uint8Array(rawArrayBuffer);
      const buffer = Buffer.from(rawBytes);

      // Upload to Supabase Storage
      const { url: fileUrl } = await uploadPDF(buffer, file.name, user.id);

      // Extract text and page count sequentially with separate buffer copies
      const extractedText = await extractTextFromPDF(rawBytes.slice().buffer as ArrayBuffer);
      const pageCount = await getPageCount(rawBytes.slice().buffer as ArrayBuffer);

      // Create document and AI context
      const document = await db.document.create({
        data: {
          userId: user.id,
          title: file.name.replace(/\.pdf$/i, ""),
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          pageCount,
          aiContext: {
            create: {
              extractedText,
            },
          },
        },
      });

      return NextResponse.json(document, { status: 201 });
    } catch (uploadError) {
      // Rollback quota reservation on upload failure
      await decrementDocumentUsage(user.id).catch(() => {});
      throw uploadError;
    }
  } catch (error) {
    console.error("[DOCUMENT_UPLOAD]", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
