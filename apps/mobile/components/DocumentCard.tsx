import { View, Text, Pressable, StyleSheet } from "react-native";
import { FileText } from "lucide-react-native";
import { useRouter } from "expo-router";
import { colors } from "@/lib/constants";
import type { DocumentMeta } from "@cookednote/shared/types";

interface DocumentCardProps {
  document: DocumentMeta;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/document/${document.id}`)}
      accessibilityLabel={`Open ${document.title}`}
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>
        <FileText color={colors.primary} size={32} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {document.title}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {document.pageCount} {document.pageCount === 1 ? "page" : "pages"}
        </Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>
          {formatFileSize(document.fileSize)}
        </Text>
      </View>
      <Text style={styles.date}>
        {formatDate(document.lastOpenedAt || document.uploadedAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    margin: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 18,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
