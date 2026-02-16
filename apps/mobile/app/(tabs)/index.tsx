import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { BookOpen, Plus } from "lucide-react-native";
import { useDocuments } from "@/hooks/use-documents";
import { useDocumentUpload } from "@/hooks/use-document-upload";
import { DocumentGrid } from "@/components/DocumentGrid";
import { colors } from "@/lib/constants";

export default function LibraryScreen() {
  const { documents, loading, error, refetch } = useDocuments();
  const { pickAndUpload, uploading } = useDocumentUpload({
    onSuccess: refetch,
  });

  return (
    <View style={styles.container}>
      <DocumentGrid
        documents={documents}
        loading={loading}
        error={error}
        onRefresh={refetch}
        emptyIcon={BookOpen}
        emptyTitle="No documents yet"
        emptySubtitle="Tap the + button to upload a PDF"
      />
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
          uploading && styles.fabDisabled,
        ]}
        onPress={pickAndUpload}
        disabled={uploading}
        accessibilityLabel={uploading ? "Uploading document" : "Upload a PDF"}
        accessibilityRole="button"
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Plus color={colors.background} size={28} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  fabDisabled: {
    opacity: 0.6,
  },
});
