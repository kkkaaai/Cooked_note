import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { LogOut, User, CreditCard, ChevronRight, Sparkles } from "lucide-react-native";
import Constants from "expo-constants";
import { useSubscriptionStore } from "@cookednote/shared/stores/subscription-store";
import { isPro, FREE_TIER_LIMITS } from "@cookednote/shared/types";
import { colors } from "@/lib/constants";

export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const usage = useSubscriptionStore((s) => s.usage);
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const userIsPro = isPro(subscription.plan);

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* User section */}
      <View style={styles.section}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <User color="#fff" size={24} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.fullName ?? user?.firstName ?? "User"}
            </Text>
            <Text style={styles.userEmail}>
              {user?.primaryEmailAddress?.emailAddress ?? ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Subscription section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/paywall")}
          accessibilityLabel="Manage subscription"
          accessibilityRole="button"
        >
          <CreditCard color={colors.primary} size={20} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Plan</Text>
            <View style={styles.menuItemRight}>
              <View
                style={[
                  styles.planBadge,
                  userIsPro ? styles.proBadge : styles.freeBadge,
                ]}
              >
                <Text
                  style={[
                    styles.planBadgeText,
                    userIsPro ? styles.proBadgeText : styles.freeBadgeText,
                  ]}
                >
                  {userIsPro ? "Pro" : "Free"}
                </Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={16} />
            </View>
          </View>
        </TouchableOpacity>

        {isLoaded && (
          <View style={styles.usageSection}>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Documents</Text>
              <Text style={styles.usageValue}>
                {usage.documentUploads} /{" "}
                {userIsPro ? "\u221E" : FREE_TIER_LIMITS.maxDocuments}
              </Text>
            </View>
            {!userIsPro && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        (usage.documentUploads /
                          FREE_TIER_LIMITS.maxDocuments) *
                          100,
                        100
                      )}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            )}

            <View style={[styles.usageRow, { marginTop: 12 }]}>
              <Text style={styles.usageLabel}>AI Requests</Text>
              <Text style={styles.usageValue}>
                {usage.aiRequests} /{" "}
                {userIsPro
                  ? "\u221E"
                  : FREE_TIER_LIMITS.maxAIRequestsPerMonth}
              </Text>
            </View>
            {!userIsPro && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        (usage.aiRequests /
                          FREE_TIER_LIMITS.maxAIRequestsPerMonth) *
                          100,
                        100
                      )}%`,
                      backgroundColor: colors.purple,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {!userIsPro && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push("/paywall")}
            accessibilityLabel="Upgrade to Pro"
            accessibilityRole="button"
          >
            <Sparkles color="#fff" size={18} />
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleSignOut}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <LogOut color={colors.danger} size={20} />
          <Text style={styles.menuItemTextDanger}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>CookedNote v{appVersion}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  section: {
    backgroundColor: colors.background,
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuItemTextDanger: {
    fontSize: 16,
    color: colors.danger,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  freeBadge: {
    backgroundColor: colors.backgroundSecondary,
  },
  proBadge: {
    backgroundColor: colors.primary,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  freeBadgeText: {
    color: colors.textSecondary,
  },
  proBadgeText: {
    color: "#fff",
  },
  usageSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  version: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
