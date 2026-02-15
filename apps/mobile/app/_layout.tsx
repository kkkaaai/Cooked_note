import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { colors } from "@/lib/constants";
import { useSync } from "@/hooks/use-sync";
import { registerBackgroundSync } from "@/lib/background-sync";
import { setConversationTokenProvider } from "@/stores/conversation-store";
import { initSubscriptionAdapter } from "@/lib/subscription-adapter-mobile";
import { useSubscriptionStore } from "@cookednote/shared/stores/subscription-store";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
}

function AuthGate() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize sync system
  useSync();

  // Initialize conversation store token provider, subscription, + register background sync
  useEffect(() => {
    if (isSignedIn) {
      setConversationTokenProvider(getToken);
      registerBackgroundSync();

      // Init subscription store
      getToken().then((token) => {
        initSubscriptionAdapter(token);
        useSubscriptionStore.getState().fetchSubscriptionStatus();
      });
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments]);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="document/[id]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="paywall"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AuthGate />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
