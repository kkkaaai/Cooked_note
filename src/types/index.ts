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

// Normalized rectangle (0-1 range, relative to page dimensions)
export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Position stored in DB — array of rects for multi-line highlights
export interface HighlightPosition {
  rects: NormalizedRect[];
}

// Client-side Annotation object (matches API response shape)
export interface Annotation {
  id: string;
  documentId: string;
  userId: string;
  type: AnnotationType;
  pageNumber: number;
  color: string | null;
  position: HighlightPosition;
  selectedText: string | null;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

// For creating a new annotation
export interface CreateAnnotationInput {
  documentId: string;
  type: AnnotationType;
  pageNumber: number;
  color?: string;
  position: HighlightPosition;
  selectedText?: string;
  content?: string;
}

// For updating an existing annotation
export interface UpdateAnnotationInput {
  color?: string;
  content?: string;
}

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
