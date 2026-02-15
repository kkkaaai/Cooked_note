import { useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActionSheetIOS,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { colors } from "@/lib/constants";
import { copyToClipboard, shareResponse } from "@/lib/share-utils";
import type { AIMessage, Screenshot } from "@cookednote/shared/types";

interface MessageBubbleProps {
  message: AIMessage;
  isStreaming?: boolean;
}

// Strip HTML tags to prevent XSS from LLM output
const markdownRules = {
  html_block: () => null,
  html_inline: () => null,
};

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const screenshots = message.screenshots ?? [];

  const handleLongPress = useCallback(() => {
    if (isUser) return;
    const content = message.content;
    if (!content) return;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Copy", "Share", "Cancel"],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) copyToClipboard(content);
          if (buttonIndex === 1) shareResponse(content);
        }
      );
    } else {
      Alert.alert("Options", undefined, [
        { text: "Copy", onPress: () => copyToClipboard(content) },
        { text: "Share", onPress: () => shareResponse(content) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [isUser, message.content]);

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {screenshots.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.screenshotRow}
        >
          {screenshots.map((ss: Screenshot) => (
            <Image
              key={ss.id}
              source={{ uri: ss.base64 }}
              style={styles.screenshotThumb}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      <Pressable
        onLongPress={handleLongPress}
        style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
        accessibilityLabel={isUser ? "Your message" : "AI response"}
        accessibilityRole="text"
      >
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <View style={styles.markdownContainer}>
            <Markdown style={markdownStyles} rules={markdownRules}>
              {(message.content ?? "") + (isStreaming ? " \u258C" : "")}
            </Markdown>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: colors.background,
    fontSize: 15,
    lineHeight: 20,
  },
  markdownContainer: {
    flexShrink: 1,
  },
  screenshotRow: {
    marginBottom: 6,
    maxWidth: "85%",
  },
  screenshotThumb: {
    width: 60,
    height: 45,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: colors.border,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  heading2: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 4,
  },
  heading3: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  code_inline: {
    backgroundColor: colors.codeBackground,
    color: colors.codeText,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  fence: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    color: colors.codeText,
    marginVertical: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
    marginVertical: 4,
    opacity: 0.85,
  },
  list_item: {
    marginVertical: 2,
  },
  strong: {
    fontWeight: "600" as const,
  },
  link: {
    color: colors.primary,
  },
});
