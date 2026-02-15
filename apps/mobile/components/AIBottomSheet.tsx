import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  Sparkles,
  Send,
  X,
  Save,
  History,
  AlertCircle,
} from "lucide-react-native";
import { useAIStore } from "@cookednote/shared/stores/ai-store";
import { usePDFStore } from "@cookednote/shared/stores/pdf-store";
import { useAIChat } from "@/hooks/use-ai-chat";
import {
  useConversationStore,
} from "@/stores/conversation-store";
import { MessageBubble } from "./MessageBubble";
import { ScreenshotCarousel } from "./ScreenshotCarousel";
import { ConversationHistory } from "./ConversationHistory";
import { colors } from "@/lib/constants";
import type { AIMessage } from "@cookednote/shared/types";

export function AIBottomSheet() {
  const sheetRef = useRef<BottomSheet>(null);
  const inputRef = useRef<TextInput>(null);
  const [inputText, setInputText] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const isSidebarOpen = useAIStore((s) => s.isSidebarOpen);
  const messages = useAIStore((s) => s.messages);
  const pendingScreenshots = useAIStore((s) => s.pendingScreenshots);
  const isStreaming = useAIStore((s) => s.isStreaming);
  const streamingText = useAIStore((s) => s.streamingText);
  const error = useAIStore((s) => s.error);
  const documentId = useAIStore((s) => s.documentId);
  const currentPage = usePDFStore((s) => s.currentPage);

  const { sendMessage, cancel } = useAIChat();
  const saveConversation = useConversationStore((s) => s.saveConversation);

  const snapPoints = useMemo(() => ["25%", "60%", "90%"], []);

  useEffect(() => {
    if (isSidebarOpen) {
      sheetRef.current?.snapToIndex(1);
    } else {
      sheetRef.current?.close();
    }
  }, [isSidebarOpen]);

  const handleClose = useCallback(() => {
    useAIStore.getState().closeSidebar();
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    const screenshots = [...pendingScreenshots];
    if (!text && screenshots.length === 0) return;
    setInputText("");
    await sendMessage(text, screenshots);
  }, [inputText, pendingScreenshots, sendMessage]);

  const handleSave = useCallback(async () => {
    if (!documentId || messages.length < 2) return;
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg?.content?.slice(0, 100) || "AI Conversation";
    const screenshots = messages
      .flatMap((m) => m.screenshots ?? [])
      .slice(0, 5);

    await saveConversation({
      documentId,
      pageNumber: currentPage,
      title,
      screenshots,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        screenshots: m.screenshots,
      })),
    });
  }, [documentId, messages, currentPage, saveConversation]);

  const handleRemoveScreenshot = useCallback((id: string) => {
    useAIStore.getState().removeScreenshot(id);
  }, []);

  const canSave = messages.length >= 2 && !isStreaming;

  const allMessages = useMemo(() => {
    const result: AIMessage[] = [...messages];
    if (isStreaming && streamingText) {
      result.push({ role: "assistant", content: streamingText });
    }
    return result;
  }, [messages, isStreaming, streamingText]);

  const renderMessage = useCallback(
    ({ item, index }: { item: AIMessage; index: number }) => (
      <MessageBubble
        message={item}
        isStreaming={
          isStreaming && index === allMessages.length - 1 && item.role === "assistant"
        }
      />
    ),
    [isStreaming, allMessages.length]
  );

  if (!isSidebarOpen) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={handleClose}
      animateOnMount
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>
            {showHistory ? "History" : "AI Assistant"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {!showHistory && canSave && (
            <Pressable
              onPress={handleSave}
              hitSlop={6}
              style={styles.headerButton}
              accessibilityLabel="Save conversation"
              accessibilityRole="button"
            >
              <Save size={18} color={colors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setShowHistory((v) => !v)}
            hitSlop={6}
            style={styles.headerButton}
            accessibilityLabel={showHistory ? "Back to chat" : "View history"}
            accessibilityRole="button"
          >
            <History
              size={18}
              color={showHistory ? colors.primary : colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={handleClose}
            hitSlop={6}
            style={styles.headerButton}
            accessibilityLabel="Close AI panel"
            accessibilityRole="button"
          >
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {showHistory ? (
        <ConversationHistory
          documentId={documentId}
          onSelect={() => setShowHistory(false)}
        />
      ) : (
        <>
          {/* Screenshot Carousel */}
          <ScreenshotCarousel
            screenshots={pendingScreenshots}
            onRemove={handleRemoveScreenshot}
          />

          {/* Messages */}
          {allMessages.length === 0 && !error ? (
            <BottomSheetView style={styles.emptyState}>
              <Sparkles size={32} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Ask about the PDF</Text>
              <Text style={styles.emptySubtitle}>
                Draw a region on the page, then ask a question
              </Text>
            </BottomSheetView>
          ) : (
            <BottomSheetFlatList
              data={allMessages}
              renderItem={renderMessage}
              // Index keys are safe here because messages are append-only
              keyExtractor={(_, i) => `msg-${i}`}
              contentContainerStyle={styles.messageList}
              inverted={false}
            />
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about this page..."
                placeholderTextColor={colors.textSecondary}
                style={styles.textInput}
                multiline
                maxLength={2000}
                editable={!isStreaming}
                accessibilityLabel="Message input"
              />
              {isStreaming ? (
                <Pressable
                  onPress={cancel}
                  style={styles.sendButton}
                  accessibilityLabel="Cancel streaming"
                  accessibilityRole="button"
                >
                  <X size={18} color={colors.danger} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleSend}
                  style={[
                    styles.sendButton,
                    (!inputText.trim() && pendingScreenshots.length === 0) &&
                      styles.sendButtonDisabled,
                  ]}
                  disabled={!inputText.trim() && pendingScreenshots.length === 0}
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                >
                  <Send size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleIndicator: {
    backgroundColor: colors.inputBorder,
    width: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  messageList: {
    paddingVertical: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.dangerLight,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
