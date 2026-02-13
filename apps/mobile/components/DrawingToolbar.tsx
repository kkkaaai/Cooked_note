import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Check,
} from "lucide-react-native";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import { STROKE_COLORS, STROKE_SIZES } from "@cookednote/shared/types";
import { colors } from "@/lib/constants";
import type { DrawingTool } from "@cookednote/shared/types";

const TOOL_ICONS: Record<DrawingTool, typeof PenTool> = {
  pen: PenTool,
  highlighter: Highlighter,
  eraser: Eraser,
};

export function DrawingToolbar() {
  const insets = useSafeAreaInsets();
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeSize,
    setStrokeSize,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDrawingStore();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Tool buttons */}
      <View style={styles.row}>
        {(["pen", "highlighter", "eraser"] as DrawingTool[]).map((tool) => {
          const Icon = TOOL_ICONS[tool];
          const isActive = activeTool === tool;
          return (
            <Pressable
              key={tool}
              onPress={() => setActiveTool(tool)}
              style={[styles.toolButton, isActive && styles.toolButtonActive]}
              accessibilityLabel={`${tool} tool`}
              accessibilityRole="button"
            >
              <Icon
                color={isActive ? "#ffffff" : colors.textPrimary}
                size={20}
              />
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        {/* Undo / Redo */}
        <Pressable
          onPress={undo}
          disabled={!canUndo()}
          style={[styles.toolButton, !canUndo() && styles.toolButtonDisabled]}
          accessibilityLabel="Undo"
          accessibilityRole="button"
        >
          <Undo2
            color={canUndo() ? colors.textPrimary : colors.textMuted}
            size={20}
          />
        </Pressable>
        <Pressable
          onPress={redo}
          disabled={!canRedo()}
          style={[styles.toolButton, !canRedo() && styles.toolButtonDisabled]}
          accessibilityLabel="Redo"
          accessibilityRole="button"
        >
          <Redo2
            color={canRedo() ? colors.textPrimary : colors.textMuted}
            size={20}
          />
        </Pressable>
      </View>

      {/* Color row (only for pen/highlighter) */}
      {activeTool !== "eraser" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorRow}
        >
          {STROKE_COLORS.map((color) => {
            const isActive = strokeColor === color.value;
            return (
              <Pressable
                key={color.name}
                onPress={() => setStrokeColor(color.value)}
                style={[styles.colorButton, isActive && styles.colorButtonActive]}
                accessibilityLabel={`${color.name} color`}
                accessibilityRole="button"
              >
                <View
                  style={[styles.colorSwatch, { backgroundColor: color.value }]}
                />
                {isActive && (
                  <Check color="#ffffff" size={12} style={styles.checkIcon} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Size presets */}
      {activeTool !== "eraser" && (
        <View style={styles.sizeRow}>
          {STROKE_SIZES.map((size) => {
            const isActive = strokeSize === size.value;
            const dotSize = size.dotPixels;
            return (
              <Pressable
                key={size.name}
                onPress={() => setStrokeSize(size.value)}
                style={[styles.sizeButton, isActive && styles.sizeButtonActive]}
                accessibilityLabel={`${size.name} stroke size`}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.sizeDot,
                    {
                      width: dotSize,
                      height: dotSize,
                      backgroundColor: isActive ? colors.primary : colors.textSecondary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.sizeLabel,
                    isActive && styles.sizeLabelActive,
                  ]}
                >
                  {size.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  toolButtonActive: {
    backgroundColor: colors.primary,
  },
  toolButtonDisabled: {
    opacity: 0.4,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorButtonActive: {
    borderColor: colors.primary,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  checkIcon: {
    position: "absolute",
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 4,
  },
  sizeButton: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sizeButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  sizeDot: {
    borderRadius: 999,
  },
  sizeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sizeLabelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});
