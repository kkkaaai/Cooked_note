import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, LayoutGrid } from "lucide-react-native";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { colors } from "@/lib/constants";

interface PDFToolbarProps {
  title: string;
  onToggleThumbnails: () => void;
}

export function PDFToolbar({ title, onToggleThumbnails }: PDFToolbarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentPage = usePDFStore((s) => s.currentPage);
  const numPages = usePDFStore((s) => s.numPages);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft color={colors.primary} size={24} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {numPages > 0 && (
            <Text style={styles.pageIndicator}>
              {currentPage} / {numPages}
            </Text>
          )}
        </View>

        <Pressable
          onPress={onToggleThumbnails}
          style={styles.thumbnailButton}
          hitSlop={8}
          accessibilityLabel="Toggle page thumbnails"
          accessibilityRole="button"
        >
          <LayoutGrid color={colors.primary} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  pageIndicator: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  thumbnailButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
