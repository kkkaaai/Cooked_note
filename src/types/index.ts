export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationType = "highlight" | "note" | "ai_explanation";

export interface HighlightColor {
  name: string;
  value: string;
  bg: string;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { name: "Yellow", value: "#FBBF24", bg: "bg-yellow-400/30" },
  { name: "Green", value: "#34D399", bg: "bg-green-400/30" },
  { name: "Blue", value: "#60A5FA", bg: "bg-blue-400/30" },
  { name: "Pink", value: "#F472B6", bg: "bg-pink-400/30" },
  { name: "Purple", value: "#A78BFA", bg: "bg-purple-400/30" },
];

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DocumentMeta {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  pageCount: number;
  uploadedAt: string;
  lastOpenedAt: string;
}
