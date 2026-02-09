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

// Screenshot captured from PDF canvas region
export interface Screenshot {
  id: string;
  base64: string; // data URL (image/png)
  pageNumber: number;
  region: NormalizedRect;
  createdAt: number;
}

// Anthropic vision API content blocks
export interface ImageContentBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/png";
    data: string; // raw base64 without data URL prefix
  };
}

export interface TextContentBlock {
  type: "text";
  text: string;
}

export type ContentBlock = ImageContentBlock | TextContentBlock;

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  contentBlocks?: ContentBlock[]; // for API calls (user messages with images)
  screenshots?: Screenshot[]; // for UI display of attached screenshots
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
  folderId: string | null;
}

// Folder types
export interface FolderColor {
  name: string;
  value: string;
}

export const FOLDER_COLORS: FolderColor[] = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Red", value: "#EF4444" },
  { name: "Green", value: "#22C55E" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
  { name: "Gray", value: "#6B7280" },
];

export interface Folder {
  id: string;
  userId: string;
  name: string;
  color: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
  _count?: { documents: number };
}

export interface CreateFolderInput {
  name: string;
  color?: string;
  parentId?: string;
}

export interface UpdateFolderInput {
  name?: string;
  color?: string;
  parentId?: string | null;
}

// Conversation types
export interface ConversationMeta {
  id: string;
  userId: string;
  documentId: string;
  pageNumber: number;
  title: string;
  screenshots: Screenshot[];
  createdAt: string;
  updatedAt: string;
  document?: { title: string; fileName: string };
  _count?: { messages: number };
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  screenshots: Screenshot[] | null;
  createdAt: string;
}

export interface ConversationWithMessages extends ConversationMeta {
  messages: ConversationMessage[];
}

export interface CreateConversationInput {
  documentId: string;
  pageNumber: number;
  title: string;
  screenshots: Screenshot[];
  messages: { role: "user" | "assistant"; content: string; screenshots?: Screenshot[] }[];
}
