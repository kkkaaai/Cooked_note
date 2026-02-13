import { StyleSheet, View } from "react-native";
import { BookOpen } from "lucide-react-native";
import { useDocuments } from "@/hooks/use-documents";
import { DocumentGrid } from "@/components/DocumentGrid";

export default function LibraryScreen() {
  const { documents, loading, error, refetch } = useDocuments();

  return (
    <View style={styles.container}>
      <DocumentGrid
        documents={documents}
        loading={loading}
        error={error}
        onRefresh={refetch}
        emptyIcon={BookOpen}
        emptyTitle="No documents yet"
        emptySubtitle="Upload a PDF from the web app to get started with AI-powered annotations"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
