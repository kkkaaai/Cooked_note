import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Clock } from "lucide-react-native";
import { useDocuments } from "@/hooks/use-documents";
import { DocumentGrid } from "@/components/DocumentGrid";

export default function RecentScreen() {
  const { documents, loading, error, refetch } = useDocuments();

  const recentDocuments = useMemo(() => {
    return documents
      .filter((doc) => doc.lastOpenedAt)
      .sort(
        (a, b) =>
          new Date(b.lastOpenedAt!).getTime() -
          new Date(a.lastOpenedAt!).getTime()
      );
  }, [documents]);

  return (
    <View style={styles.container}>
      <DocumentGrid
        documents={recentDocuments}
        loading={loading}
        error={error}
        onRefresh={refetch}
        emptyIcon={Clock}
        emptyTitle="No recent documents"
        emptySubtitle="Documents you open will appear here for quick access"
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
