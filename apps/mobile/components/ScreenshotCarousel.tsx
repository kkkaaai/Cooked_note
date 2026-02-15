import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { X } from "lucide-react-native";
import { colors } from "@/lib/constants";
import type { Screenshot } from "@cookednote/shared/types";

interface ScreenshotCarouselProps {
  screenshots: Screenshot[];
  onRemove: (id: string) => void;
  /** Display-only limit count. Enforcement happens in the AI store. */
  maxScreenshots?: number;
}

export function ScreenshotCarousel({
  screenshots,
  onRemove,
  maxScreenshots = 5,
}: ScreenshotCarouselProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  if (screenshots.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {screenshots.map((ss) => (
            <View key={ss.id} style={styles.thumbnailWrapper}>
              <Pressable
                onPress={() => setPreviewUri(ss.base64)}
                accessibilityLabel={`Preview screenshot from page ${ss.pageNumber}`}
                accessibilityRole="button"
              >
                <Image
                  source={{ uri: ss.base64 }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.pageBadge}>
                  <Text style={styles.pageBadgeText}>p.{ss.pageNumber}</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => onRemove(ss.id)}
                style={styles.removeButton}
                hitSlop={6}
                accessibilityLabel={`Remove screenshot from page ${ss.pageNumber}`}
                accessibilityRole="button"
              >
                <X size={12} color={colors.background} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.countText}>
          {screenshots.length}/{maxScreenshots}
        </Text>
      </View>

      <Modal
        visible={previewUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable
          style={styles.previewBackdrop}
          onPress={() => setPreviewUri(null)}
          accessibilityLabel="Close preview"
          accessibilityRole="button"
        >
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    gap: 8,
    flex: 1,
  },
  thumbnailWrapper: {
    position: "relative",
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  pageBadge: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: colors.overlay,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pageBadgeText: {
    color: colors.background,
    fontSize: 9,
    fontWeight: "600",
  },
  removeButton: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "90%",
    height: "70%",
  },
});
