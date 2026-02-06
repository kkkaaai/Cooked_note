import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "documents";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, serviceKey);
}

export async function uploadPDF(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<{ url: string; storagePath: string }> {
  const supabase = getSupabaseAdmin();
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${timestamp}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return { url: urlData.publicUrl, storagePath };
}

export async function deletePDF(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}
