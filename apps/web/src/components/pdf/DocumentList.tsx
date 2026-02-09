"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { UploadDialog } from "@/components/pdf/UploadDialog";
import { DocumentCard } from "@/components/pdf/DocumentCard";
import { FolderSidebar } from "@/components/folders/FolderSidebar";
import { useToast } from "@/hooks/use-toast";
import { useFolderStore } from "@/stores/folder-store";
import type { DocumentMeta } from "@cookednote/shared/types";

interface DocumentListProps {
  userName: string;
}

export function DocumentList({ userName }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const selectedFolderId = useFolderStore((s) => s.selectedFolderId);
  const folders = useFolderStore((s) => s.folders);

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

  // Re-fetch when folder store changes (documents moved)
  useEffect(() => {
    if (!loading) {
      fetchDocuments();
    }
    // Only re-fetch when folders change (document was moved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders]);

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

  // Get all descendant folder IDs for nested folder support
  const getDescendantIds = useCallback(
    (folderId: string): string[] => {
      const ids = [folderId];
      const children = folders.filter((f) => f.parentId === folderId);
      for (const child of children) {
        ids.push(...getDescendantIds(child.id));
      }
      return ids;
    },
    [folders]
  );

  const filteredDocuments = useMemo(() => {
    if (selectedFolderId === null) return documents;
    const validIds = new Set(getDescendantIds(selectedFolderId));
    return documents.filter(
      (d) => d.folderId !== null && validIds.has(d.folderId)
    );
  }, [documents, selectedFolderId, getDescendantIds]);

  const selectedFolderName = useMemo(() => {
    if (selectedFolderId === null) return null;
    const folder = folders.find((f) => f.id === selectedFolderId);
    return folder?.name || null;
  }, [selectedFolderId, folders]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <FolderSidebar />
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {selectedFolderName
                ? selectedFolderName
                : `Welcome, ${userName}`}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {selectedFolderName
                ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? "s" : ""}`
                : "Your documents and annotations"}
            </p>
          </div>
          <UploadDialog onUploadComplete={fetchDocuments} />
        </div>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">
              {selectedFolderId ? "No documents in this folder" : "No documents yet"}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {selectedFolderId
                ? "Drag documents here or upload a new one."
                : "Upload your first PDF to start highlighting text and getting AI-powered explanations."}
            </p>
            {!selectedFolderId && (
              <div className="mt-6">
                <UploadDialog onUploadComplete={fetchDocuments} />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
