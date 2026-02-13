export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const TABLET_BREAKPOINT = 768;

export const colors = {
  primary: "#3b82f6",
  primaryLight: "#eff6ff",
  background: "#ffffff",
  backgroundSecondary: "#f3f4f6",
  surface: "#f9fafb",
  border: "#e5e7eb",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  danger: "#ef4444",
} as const;
