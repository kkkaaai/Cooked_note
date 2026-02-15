import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { X, Check, Sparkles } from "lucide-react-native";
import {
  FREE_TIER_LIMITS,
  PLAN_PRICES,
} from "@cookednote/shared/types";
import { useSubscriptionStore } from "@cookednote/shared/stores/subscription-store";
import { colors } from "@/lib/constants";
import {
  purchasePackage,
  getOfferings,
  restorePurchases,
} from "@/lib/purchases";
import type { PurchasesPackage } from "react-native-purchases";

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"pro_monthly" | "pro_yearly">(
    "pro_yearly"
  );
  const [isLoading, setIsLoading] = useState(false);

  async function handlePurchase() {
    setIsLoading(true);
    try {
      const offering = await getOfferings();
      if (!offering) {
        Alert.alert("Error", "No offerings available");
        setIsLoading(false);
        return;
      }

      const pkg = offering.availablePackages.find(
        (p: PurchasesPackage) =>
          selectedPlan === "pro_yearly"
            ? p.identifier === "$rc_annual"
            : p.identifier === "$rc_monthly"
      );

      if (!pkg) {
        Alert.alert("Error", "Package not found");
        setIsLoading(false);
        return;
      }

      await purchasePackage(pkg);
      await useSubscriptionStore.getState().fetchSubscriptionStatus();
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      if (!message.includes("cancelled") && !message.includes("canceled")) {
        Alert.alert("Error", message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    setIsLoading(true);
    try {
      await restorePurchases();
      await useSubscriptionStore.getState().fetchSubscriptionStatus();
      Alert.alert("Success", "Purchases restored");
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Restore failed";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  }

  const monthlySaving = Math.round(
    ((PLAN_PRICES.pro_monthly.amount * 12 - PLAN_PRICES.pro_yearly.amount) /
      (PLAN_PRICES.pro_monthly.amount * 12)) *
      100
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          accessibilityLabel="Close paywall"
          accessibilityRole="button"
        >
          <X color={colors.textSecondary} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Sparkles color={colors.primary} size={32} />
        </View>
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>
          Unlock unlimited documents and AI requests
        </Text>

        {/* Feature comparison */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Check color={colors.primary} size={18} />
            <Text style={styles.featureText}>Unlimited document uploads</Text>
          </View>
          <View style={styles.featureRow}>
            <Check color={colors.primary} size={18} />
            <Text style={styles.featureText}>Unlimited AI requests</Text>
          </View>
          <View style={styles.featureRow}>
            <Check color={colors.primary} size={18} />
            <Text style={styles.featureText}>Priority support</Text>
          </View>
          <Text style={styles.freeNote}>
            Free: {FREE_TIER_LIMITS.maxDocuments} docs, {FREE_TIER_LIMITS.maxAIRequestsPerMonth} AI/month
          </Text>
        </View>

        {/* Plan selection */}
        <View style={styles.plans}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === "pro_yearly" && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan("pro_yearly")}
            accessibilityLabel="Select yearly plan"
            accessibilityRole="button"
          >
            <View style={styles.planHeader}>
              <Text
                style={[
                  styles.planName,
                  selectedPlan === "pro_yearly" && styles.planNameSelected,
                ]}
              >
                Yearly
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save {monthlySaving}%</Text>
              </View>
            </View>
            <Text
              style={[
                styles.planPrice,
                selectedPlan === "pro_yearly" && styles.planPriceSelected,
              ]}
            >
              {PLAN_PRICES.pro_yearly.label}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === "pro_monthly" && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan("pro_monthly")}
            accessibilityLabel="Select monthly plan"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.planName,
                selectedPlan === "pro_monthly" && styles.planNameSelected,
              ]}
            >
              Monthly
            </Text>
            <Text
              style={[
                styles.planPrice,
                selectedPlan === "pro_monthly" && styles.planPriceSelected,
              ]}
            >
              {PLAN_PRICES.pro_monthly.label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Purchase button */}
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={isLoading}
          accessibilityLabel="Subscribe to Pro"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Subscribe {"\u2014"}{" "}
              {selectedPlan === "pro_yearly"
                ? PLAN_PRICES.pro_yearly.label
                : PLAN_PRICES.pro_monthly.label}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestore}
          disabled={isLoading}
          style={styles.restoreButton}
          accessibilityLabel="Restore purchases"
          accessibilityRole="button"
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  features: {
    marginTop: 32,
    alignSelf: "stretch",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
  },
  freeNote: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  plans: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    alignSelf: "stretch",
  },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  planNameSelected: {
    color: colors.primary,
  },
  saveBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  planPriceSelected: {
    color: colors.primary,
  },
  purchaseButton: {
    marginTop: 32,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignSelf: "stretch",
    alignItems: "center",
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  restoreButton: {
    marginTop: 16,
    padding: 8,
  },
  restoreText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
