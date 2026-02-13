import { useState, useEffect, useCallback } from "react";
import { useApiFetch } from "@/lib/api";
import type { DocumentMeta } from "@cookednote/shared/types";

export function useDocuments() {
  const apiFetch = useApiFetch();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data: DocumentMeta[] = await res.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refetch: fetchDocuments };
}
