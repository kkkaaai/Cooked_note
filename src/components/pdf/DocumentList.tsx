"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { UploadDialog } from "@/components/pdf/UploadDialog";
import { DocumentCard } from "@/components/pdf/DocumentCard";
import { useToast } from "@/hooks/use-toast";
import type { DocumentMeta } from "@/types";

interface DocumentListProps {
  userName: string;
}

export function DocumentList({ userName }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data);
    } catch {
      toast({
        title: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Document deleted" });
    } catch {
      toast({
        title: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {userName}</h1>
          <p className="mt-1 text-muted-foreground">
            Your documents and annotations
          </p>
        </div>
        <UploadDialog onUploadComplete={fetchDocuments} />
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No documents yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Upload your first PDF to start highlighting text and getting
            AI-powered explanations.
          </p>
          <div className="mt-6">
            <UploadDialog onUploadComplete={fetchDocuments} />
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
