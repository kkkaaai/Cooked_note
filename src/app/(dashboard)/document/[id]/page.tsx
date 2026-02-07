"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { PDFToolbar } from "@/components/pdf/PDFToolbar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { usePDFStore } from "@/stores/pdf-store";
import { useAIStore } from "@/stores/ai-store";

const PDFCanvas = dynamic(
  () => import("@/components/pdf/PDFCanvas").then((mod) => mod.PDFCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const AISidebar = dynamic(
  () => import("@/components/ai/AISidebar").then((mod) => mod.AISidebar),
  { ssr: false }
);
import type { DocumentMeta } from "@/types";

export default function DocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { setDocument: setStoreDoc, reset } = usePDFStore();
  const resetAI = useAIStore((s) => s.reset);
  const setAIDocumentId = useAIStore((s) => s.setDocumentId);

  useKeyboardShortcuts();

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const res = await fetch(`/api/documents/${params.id}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setDocument(data);
        setStoreDoc(data.id, data.pageCount);
        setAIDocumentId(data.id);

        // Update last opened timestamp
        fetch(`/api/documents/${params.id}`, { method: "PATCH" });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();

    return () => {
      reset();
      resetAI();
    };
  }, [params.id, setStoreDoc, reset, resetAI, setAIDocumentId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium">Document not found</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-primary underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <PDFToolbar title={document.title} />
      <div className="flex flex-1 overflow-hidden">
        <PDFCanvas fileUrl={document.fileUrl} />
        <AISidebar />
      </div>
    </div>
  );
}
