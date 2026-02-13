import { View, Text, ActivityIndicator, RefreshControl, StyleSheet, useWindowDimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { DocumentCard } from "./DocumentCard";
import { EmptyState } from "./EmptyState";
import { colors, TABLET_BREAKPOINT } from "@/lib/constants";
import type { DocumentMeta } from "@cookednote/shared/types";
import type { LucideIcon } from "lucide-react-native";

interface DocumentGridProps {
  documents: DocumentMeta[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptySubtitle: string;
}

export function DocumentGrid({
  documents,
  loading,
  error,
  onRefresh,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: DocumentGridProps) {
  const { width } = useWindowDimensions();
  const numColumns = width >= TABLET_BREAKPOINT ? 3 : 2;

  if (loading && documents.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        subtitle={emptySubtitle}
      />
    );
  }

  return (
    <FlashList
      data={documents}
      numColumns={numColumns}
      renderItem={({ item }) => <DocumentCard document={item} />}
      keyExtractor={(item) => item.id}
      estimatedItemSize={160}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
