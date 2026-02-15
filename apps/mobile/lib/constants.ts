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
  borderLight: "#f3f4f6",
  inputBorder: "#d1d5db",
  text: "#111827",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  purple: "#a855f7",
  success: "#16a34a",
  successLight: "#dcfce7",
  danger: "#ef4444",
  dangerLight: "#fef2f2",
  codeBackground: "#e5e7eb",
  codeText: "#1f2937",
  overlay: "rgba(0,0,0,0.6)",
  overlayDark: "rgba(0,0,0,0.85)",
  selectionBorder: "rgba(59, 130, 246, 0.8)",
  selectionFill: "rgba(59, 130, 246, 0.1)",
} as const;

/** A4 paper height:width ratio (ISO 216: 1:sqrt(2)) */
export const A4_ASPECT_RATIO = 1.414;
