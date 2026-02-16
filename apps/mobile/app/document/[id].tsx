import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import ViewShot from "react-native-view-shot";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { useAIStore } from "@cookednote/shared/stores/ai-store";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import { useApiFetch } from "@/lib/api";
import { getCachedPDF } from "@/lib/pdf-cache";
import { captureRegionMobile } from "@/lib/screenshot";
import { PDFViewer } from "@/components/PDFViewer";
import { PDFToolbar } from "@/components/PDFToolbar";
import { ThumbnailSidebar } from "@/components/ThumbnailSidebar";
import { DrawingToolbar } from "@/components/DrawingToolbar";
import { RegionSelectOverlay } from "@/components/RegionSelectOverlay";

// Lazy-load DrawingCanvas — depends on @shopify/react-native-skia which
// requires a dev build (crashes in Expo Go). Falls back to null gracefully.
let DrawingCanvas: React.ComponentType<{ pageNumber: number }> | null = null;
let skiaAvailable = false;
try {
  DrawingCanvas = require("@/components/DrawingCanvas").DrawingCanvas;
  skiaAvailable = true;
} catch (e) {
  console.warn("[DrawingCanvas] Failed to load:", e);
}
import { AIBottomSheet } from "@/components/AIBottomSheet";
import { useDrawingSave } from "@/hooks/use-drawing-save";
import { colors, A4_ASPECT_RATIO } from "@/lib/constants";
import type { DocumentMeta, NormalizedRect } from "@cookednote/shared/types";
import type Pdf from "react-native-pdf";

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const apiFetch = useApiFetch();
  const pdfRef = useRef<Pdf>(null);
  const pdfViewRef = useRef<ViewShot>(null);
  const { width: windowWidth } = useWindowDimensions();

  const [document, setDocument] = useState<DocumentMeta | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(false);

  const isDrawingMode = useDrawingStore((s) => s.isDrawingMode);
  const isAIMode = useAIStore((s) => s.isAIMode);
  const currentPage = usePDFStore((s) => s.currentPage);

  useDrawingSave(id ?? null);

  // Set AI store document ID
  useEffect(() => {
    if (id) {
      useAIStore.getState().setDocumentId(id);
    }
    return () => {
      useAIStore.getState().reset();
    };
  }, [id]);

  const loadDocument = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);

      const res = await apiFetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      const doc: DocumentMeta = await res.json();
      setDocument(doc);

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
      useDrawingStore.getState().reset();
    };
  }, [loadDocument]);

  const handlePageSelect = useCallback((page: number) => {
    pdfRef.current?.setPage(page);
    setShowThumbnails(false);
  }, []);

  const handleRegionSelected = useCallback(
    async (region: NormalizedRect) => {
      if (!pdfViewRef.current) return;

      const pageHeight = windowWidth * A4_ASPECT_RATIO; // approximate A4 ratio
      const screenshot = await captureRegionMobile(
        pdfViewRef as React.RefObject<unknown>,
        region,
        currentPage,
        windowWidth,
        pageHeight
      );

      if (screenshot) {
        useAIStore.getState().addScreenshot(screenshot);
      }
    },
    [currentPage, windowWidth]
  );

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
    <GestureHandlerRootView style={styles.container}>
      <PDFToolbar
        title={document?.title ?? "Document"}
        onToggleThumbnails={() => setShowThumbnails((v) => !v)}
      />
      <View style={styles.pdfContainer}>
        <View
          style={styles.viewShot}
          pointerEvents={isDrawingMode ? "none" : "auto"}
        >
          <ViewShot ref={pdfViewRef} style={styles.viewShot}>
            <PDFViewer
              ref={pdfRef}
              localPath={localPath}
              documentId={id}
            />
          </ViewShot>
        </View>
        {DrawingCanvas && <DrawingCanvas pageNumber={currentPage} />}
        {isDrawingMode && !skiaAvailable && (
          <View style={styles.skiaWarning}>
            <Text style={styles.skiaWarningText}>
              Drawing requires a development build.{"\n"}
              Run: npx expo run:ios --device
            </Text>
          </View>
        )}
        {isAIMode && !isDrawingMode && (
          <RegionSelectOverlay
            enabled={true}
            pageWidth={windowWidth}
            pageHeight={windowWidth * A4_ASPECT_RATIO}
            onRegionSelected={handleRegionSelected}
          />
        )}
      </View>
      {isDrawingMode && <DrawingToolbar />}
      <ThumbnailSidebar
        visible={showThumbnails}
        onClose={() => setShowThumbnails(false)}
        onPageSelect={handlePageSelect}
      />
      <AIBottomSheet />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  pdfContainer: {
    flex: 1,
    position: "relative",
  },
  viewShot: {
    flex: 1,
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
  skiaWarning: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    padding: 12,
    zIndex: 20,
  },
  skiaWarningText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
    fontWeight: "500",
  },
});
