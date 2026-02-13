import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Cloud, CloudOff, AlertCircle } from "lucide-react-native";
import { useSyncStore } from "@cookednote/shared/stores/sync-store";
import { colors } from "@/lib/constants";

export function SyncIndicator() {
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingActions.length);
  const isOnline = useSyncStore((s) => s.isOnline);

  if (!isOnline) {
    return (
      <View style={styles.container}>
        <CloudOff size={14} color={colors.textSecondary} />
        <Text style={styles.text}>
          Offline{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </Text>
      </View>
    );
  }

  if (status === "syncing") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Text style={styles.text}>Syncing...</Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.container}>
        <AlertCircle size={14} color={colors.danger} />
        <Text style={[styles.text, { color: colors.danger }]}>Sync error</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Cloud size={14} color={colors.textSecondary} />
      <Text style={styles.text}>Saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontSize: 12,
    color: "#6b7280",
  },
});
