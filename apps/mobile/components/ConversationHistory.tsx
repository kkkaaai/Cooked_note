import { useCallback, useEffect } from "react";
import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { MessageSquare, Trash2 } from "lucide-react-native";
import { useAIStore } from "@cookednote/shared/stores/ai-store";
import { useConversationStore } from "@/stores/conversation-store";
import { colors } from "@/lib/constants";
import type { ConversationMeta } from "@cookednote/shared/types";

interface ConversationHistoryProps {
  documentId: string | null;
  onSelect: () => void;
}

export function ConversationHistory({
  documentId,
  onSelect,
}: ConversationHistoryProps) {
  const conversations = useConversationStore((s) => s.conversations);
  const isLoading = useConversationStore((s) => s.isLoading);
  const fetchConversations = useConversationStore((s) => s.fetchConversations);
  const fetchConversation = useConversationStore((s) => s.fetchConversation);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);

  useEffect(() => {
    if (documentId) {
      fetchConversations(documentId);
    }
  }, [documentId, fetchConversations]);

  const handleSelect = useCallback(
    async (conv: ConversationMeta) => {
      const full = await fetchConversation(conv.id);
      if (!full) return;

      const store = useAIStore.getState();
      store.clearConversation();
      for (const msg of full.messages) {
        store.addMessage({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          screenshots: msg.screenshots ?? undefined,
        });
      }

      onSelect();
    },
    [fetchConversation, onSelect]
  );

  const handleDelete = useCallback(
    (conv: ConversationMeta) => {
      Alert.alert(
        "Delete Conversation",
        "This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteConversation(conv.id),
          },
        ]
      );
    },
    [deleteConversation]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = useCallback(
    ({ item }: { item: ConversationMeta }) => (
      <Pressable
        onPress={() => handleSelect(item)}
        style={styles.row}
        accessibilityLabel={`Open conversation: ${item.title}`}
        accessibilityRole="button"
      >
        <View style={styles.rowIcon}>
          <MessageSquare size={18} color={colors.primary} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowMeta}>
            Page {item.pageNumber} {"\u00B7"} {formatDate(item.updatedAt)}{" "}
            {item._count?.messages
              ? `\u00B7 ${item._count.messages} msgs`
              : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDelete(item)}
          hitSlop={8}
          style={styles.deleteButton}
          accessibilityLabel={`Delete conversation: ${item.title}`}
          accessibilityRole="button"
        >
          <Trash2 size={16} color={colors.textSecondary} />
        </Pressable>
      </Pressable>
    ),
    [handleSelect, handleDelete]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <MessageSquare size={32} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No saved conversations</Text>
        <Text style={styles.emptySubtitle}>
          Chat with AI, then tap Save to store it
        </Text>
      </View>
    );
  }

  return (
    <BottomSheetFlatList
      data={conversations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
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
});
