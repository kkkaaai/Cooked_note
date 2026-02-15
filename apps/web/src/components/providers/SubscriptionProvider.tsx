"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { initSubscriptionAdapter } from "@/lib/subscription-adapter-web";
import { useSubscriptionStore } from "@cookednote/shared/stores/subscription-store";

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isSignedIn || initialized.current) return;
    initialized.current = true;

    initSubscriptionAdapter();
    useSubscriptionStore.getState().fetchSubscriptionStatus();
  }, [isSignedIn]);

  return <>{children}</>;
}
