import { useEffect, useState, useRef, useCallback } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { useApiFetch } from "@/lib/api";
import { getCachedPDF } from "@/lib/pdf-cache";
import { PDFViewer } from "@/components/PDFViewer";
import { PDFToolbar } from "@/components/PDFToolbar";
import { ThumbnailSidebar } from "@/components/ThumbnailSidebar";
import { colors } from "@/lib/constants";
import type { DocumentMeta } from "@cookednote/shared/types";
import type Pdf from "react-native-pdf";

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const apiFetch = useApiFetch();
  const pdfRef = useRef<Pdf>(null);

  const [document, setDocument] = useState<DocumentMeta | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);

      const res = await apiFetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      const doc: DocumentMeta = await res.json();
      setDocument(doc);

      // Update lastOpenedAt
      apiFetch(`/api/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ lastOpenedAt: new Date().toISOString() }),
      }).catch((err) => {
        console.warn("Failed to update lastOpenedAt:", err);
      });

      const path = await getCachedPDF(doc.id, doc.fileUrl, (progress) => {
        setDownloadProgress(progress);
      });
      setLocalPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    }
  }, [id, apiFetch]);

  useEffect(() => {
    loadDocument();
    return () => {
      usePDFStore.getState().reset();
    };
  }, [loadDocument]);

  const handlePageSelect = useCallback((page: number) => {
    pdfRef.current?.setPage(page);
    setShowThumbnails(false);
  }, []);

  if (!id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid document ID</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!localPath) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        {downloadProgress > 0 && downloadProgress < 1 && (
          <Text style={styles.progressText}>
            Downloading... {Math.round(downloadProgress * 100)}%
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PDFToolbar
        title={document?.title ?? "Document"}
        onToggleThumbnails={() => setShowThumbnails((v) => !v)}
      />
      <PDFViewer
        ref={pdfRef}
        localPath={localPath}
        documentId={id}
      />
      <ThumbnailSidebar
        visible={showThumbnails}
        onClose={() => setShowThumbnails(false)}
        onPageSelect={handlePageSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
