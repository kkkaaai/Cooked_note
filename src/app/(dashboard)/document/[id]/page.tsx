"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { PDFToolbar } from "@/components/pdf/PDFToolbar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { usePDFStore } from "@/stores/pdf-store";
import { useAIStore } from "@/stores/ai-store";
import { useConversationStore } from "@/stores/conversation-store";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { setDocument: setStoreDoc, setCurrentPage, reset } = usePDFStore();
  const resetAI = useAIStore((s) => s.reset);
  const setAIDocumentId = useAIStore((s) => s.setDocumentId);
  const openSidebar = useAIStore((s) => s.openSidebar);
  const resetConversations = useConversationStore((s) => s.reset);

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

        // Load conversation from query params
        const conversationId = searchParams.get("conversation");
        const pageParam = searchParams.get("page");
        if (conversationId) {
          const conv = await useConversationStore
            .getState()
            .fetchConversation(conversationId);
          if (conv) {
            // Load conversation messages into AI store
            useAIStore.getState().clearConversation();
            for (const msg of conv.messages) {
              useAIStore.getState().addMessage({
                role: msg.role as "user" | "assistant",
                content: msg.content,
                screenshots: msg.screenshots || undefined,
              });
            }
            useConversationStore
              .getState()
              .setActiveConversation(conv);
            openSidebar();
          }
          if (pageParam) {
            setCurrentPage(Number(pageParam));
          }
        }
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
      resetConversations();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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
