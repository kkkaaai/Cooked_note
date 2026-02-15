import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Share } from "react-native";

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function shareResponse(
  text: string,
  title?: string
): Promise<void> {
  await Share.share({
    message: text,
    title: title ?? "AI Response",
  });
}
