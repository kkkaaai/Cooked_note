import { forwardRef } from "react";
import { StyleSheet } from "react-native";
import Pdf from "react-native-pdf";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import { colors } from "@/lib/constants";

const FIT_WIDTH = 0;

interface PDFViewerProps {
  /** Local file URI for the cached PDF */
  localPath: string;
  /** Document ID used to register in the PDF store */
  documentId: string;
}

export const PDFViewer = forwardRef<Pdf, PDFViewerProps>(
  function PDFViewer({ localPath, documentId }, ref) {
    const setDocument = usePDFStore((s) => s.setDocument);
    const setScale = usePDFStore((s) => s.setScale);
    const isDrawingMode = useDrawingStore((s) => s.isDrawingMode);

    return (
      <Pdf
        ref={ref}
        source={{ uri: localPath }}
        enablePaging={isDrawingMode}
        horizontal={false}
        enableAntialiasing={true}
        fitPolicy={FIT_WIDTH}
        spacing={isDrawingMode ? 0 : 8}
        onLoadComplete={(numberOfPages) => {
          setDocument(documentId, numberOfPages);
        }}
        onPageChanged={(page) => {
          usePDFStore.setState({ currentPage: page });
        }}
        onScaleChanged={(newScale) => {
          setScale(newScale);
        }}
        onError={(error) => {
          console.error("PDF load error:", error);
        }}
        style={styles.pdf}
      />
    );
  }
);

const styles = StyleSheet.create({
  pdf: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
});
