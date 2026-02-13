import { useMemo } from "react";
import { View, Text, Pressable, FlatList, Modal, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { colors } from "@/lib/constants";

interface ThumbnailSidebarProps {
  visible: boolean;
  onClose: () => void;
  onPageSelect: (page: number) => void;
}

export function ThumbnailSidebar({
  visible,
  onClose,
  onPageSelect,
}: ThumbnailSidebarProps) {
  const insets = useSafeAreaInsets();
  const numPages = usePDFStore((s) => s.numPages);
  const currentPage = usePDFStore((s) => s.currentPage);

  const pages = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pages</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityLabel="Close page navigator"
            accessibilityRole="button"
          >
            <X color={colors.textSecondary} size={20} />
          </Pressable>
        </View>

        <FlatList
          data={pages}
          numColumns={3}
          keyExtractor={(item) => String(item)}
          renderItem={({ item: page }) => {
            const isActive = page === currentPage;
            return (
              <Pressable
                onPress={() => onPageSelect(page)}
                style={[
                  styles.thumbnail,
                  isActive && styles.thumbnailActive,
                ]}
                accessibilityLabel={`Go to page ${page}`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.thumbnailText,
                    isActive && styles.thumbnailTextActive,
                  ]}
                >
                  {page}
                </Text>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 12,
  },
  thumbnail: {
    flex: 1,
    aspectRatio: 3 / 4,
    margin: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: "31%",
  },
  thumbnailActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  thumbnailText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  thumbnailTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});
