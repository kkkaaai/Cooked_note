import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors } from "@/lib/constants";
import type { NormalizedRect } from "@cookednote/shared/types";

const MIN_THRESHOLD = 20;

interface RegionSelectOverlayProps {
  enabled: boolean;
  pageWidth: number;
  pageHeight: number;
  onRegionSelected: (region: NormalizedRect) => void;
}

export function RegionSelectOverlay({
  enabled,
  pageWidth,
  pageHeight,
  onRegionSelected,
}: RegionSelectOverlayProps) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const currentX = useSharedValue(0);
  const currentY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const opacity = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleRegionComplete = (
    sx: number,
    sy: number,
    ex: number,
    ey: number
  ) => {
    const x = Math.min(sx, ex) / pageWidth;
    const y = Math.min(sy, ey) / pageHeight;
    const width = Math.abs(ex - sx) / pageWidth;
    const height = Math.abs(ey - sy) / pageHeight;

    onRegionSelected({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      width: Math.max(0, Math.min(1 - x, width)),
      height: Math.max(0, Math.min(1 - y, height)),
    });

    triggerHaptic();
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onStart((e) => {
      startX.value = e.x;
      startY.value = e.y;
      currentX.value = e.x;
      currentY.value = e.y;
      isActive.value = true;
      opacity.value = withTiming(1, { duration: 100 });
    })
    .onUpdate((e) => {
      currentX.value = e.x;
      currentY.value = e.y;
    })
    .onEnd((e) => {
      const dx = Math.abs(e.x - startX.value);
      const dy = Math.abs(e.y - startY.value);

      if (dx > MIN_THRESHOLD && dy > MIN_THRESHOLD) {
        runOnJS(handleRegionComplete)(
          startX.value,
          startY.value,
          e.x,
          e.y
        );
      }

      isActive.value = false;
      opacity.value = withTiming(0, { duration: 150 });
    })
    .onFinalize(() => {
      isActive.value = false;
      opacity.value = withTiming(0, { duration: 150 });
    });

  // Use shared values directly (not .value) to avoid reanimated warnings.
  // Reanimated 3 auto-tracks shared value reads inside useAnimatedStyle.
  const selectionStyle = useAnimatedStyle(() => {
    if (!isActive.value) {
      return { opacity: 0, left: 0, top: 0, width: 0, height: 0 };
    }

    const minX = startX.value < currentX.value ? startX.value : currentX.value;
    const minY = startY.value < currentY.value ? startY.value : currentY.value;
    const w = startX.value < currentX.value
      ? currentX.value - startX.value
      : startX.value - currentX.value;
    const h = startY.value < currentY.value
      ? currentY.value - startY.value
      : startY.value - currentY.value;

    return {
      opacity: opacity.value,
      left: minX,
      top: minY,
      width: w,
      height: h,
    };
  });

  if (!enabled) return null;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={styles.overlay}>
        <Animated.View style={[styles.selection, selectionStyle]} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  selection: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.selectionBorder,
    borderStyle: "dashed",
    backgroundColor: colors.selectionFill,
    borderRadius: 4,
  },
});
