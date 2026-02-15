export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationType = "highlight" | "note" | "ai_explanation" | "drawing";

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

// Drawing types
export type DrawingTool = "pen" | "highlighter" | "eraser";

export interface DrawingPoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  pressure: number; // 0-1
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  size: number; // stroke width in normalized units
  tool: DrawingTool;
  timestamp: number;
}

export interface DrawingPosition {
  strokes: DrawingStroke[];
}

// Discriminated union for annotation positions
export type AnnotationPosition = HighlightPosition | DrawingPosition;

// Type guards
export function isHighlightPosition(pos: AnnotationPosition): pos is HighlightPosition {
  return "rects" in pos;
}

export function isDrawingPosition(pos: AnnotationPosition): pos is DrawingPosition {
  return "strokes" in pos;
}

// Drawing constants
export const DRAWING_TOOLS: { name: string; value: DrawingTool }[] = [
  { name: "Pen", value: "pen" },
  { name: "Highlighter", value: "highlighter" },
  { name: "Eraser", value: "eraser" },
];

export const STROKE_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Orange", value: "#F97316" },
  { name: "Purple", value: "#A855F7" },
];

export const STROKE_SIZES = [
  { name: "Fine", value: 0.002, dotPixels: 6 },
  { name: "Medium", value: 0.004, dotPixels: 10 },
  { name: "Thick", value: 0.008, dotPixels: 16 },
];

// Client-side Annotation object (matches API response shape)
export interface Annotation {
  id: string;
  documentId: string;
  userId: string;
  type: AnnotationType;
  pageNumber: number;
  color: string | null;
  position: AnnotationPosition;
  selectedText: string | null;
  content: string | null;
  syncVersion?: number;
  createdAt: string;
  updatedAt: string;
}

// For creating a new annotation
export interface CreateAnnotationInput {
  documentId: string;
  type: AnnotationType;
  pageNumber: number;
  color?: string;
  position: AnnotationPosition;
  selectedText?: string;
  content?: string;
}

// For updating an existing annotation
export interface UpdateAnnotationInput {
  color?: string;
  content?: string;
  position?: AnnotationPosition;
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
  syncVersion?: number;
  uploadedAt: string;
  lastOpenedAt: string;
  updatedAt?: string;
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
  syncVersion?: number;
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

// Subscription types
export type SubscriptionPlan = "free" | "pro_monthly" | "pro_yearly";
export type SubscriptionStatusValue = "active" | "canceled" | "expired" | "past_due";
export type SubscriptionProvider = "stripe" | "revenuecat";

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatusValue;
  provider: SubscriptionProvider | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UsageInfo {
  documentUploads: number;
  aiRequests: number;
  periodStart: string;
}

export interface QuotaExceededError {
  error: "quota_exceeded";
  resource: "documents" | "ai_requests";
  current: number;
  limit: number;
  plan: SubscriptionPlan;
}

export const FREE_TIER_LIMITS = {
  maxDocuments: 3,
  maxAIRequestsPerMonth: 10,
} as const;

export const PRO_TIER_LIMITS = {
  maxDocuments: Infinity,
  maxAIRequestsPerMonth: Infinity,
} as const;

/** Prices in cents (e.g. 799 = $7.99) for percentage calculations */
export const PLAN_PRICES = {
  pro_monthly: { amount: 799, label: "$7.99/mo" },
  pro_yearly: { amount: 4999, label: "$49.99/yr" },
} as const;

export function isPro(plan: SubscriptionPlan): boolean {
  return plan === "pro_monthly" || plan === "pro_yearly";
}

export function getTierLimits(plan: SubscriptionPlan) {
  return isPro(plan) ? PRO_TIER_LIMITS : FREE_TIER_LIMITS;
}

// Sync types
export type SyncStatus = "idle" | "syncing" | "error" | "offline";
export type SyncActionType = "create" | "update" | "delete";
export type SyncEntityType = "annotation" | "document" | "folder";

export interface SyncAction {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  actionType: SyncActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "in_flight" | "failed";
  retryCount: number;
  error?: string;
}
