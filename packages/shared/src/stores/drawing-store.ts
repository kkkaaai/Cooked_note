import { create } from "zustand";
import type { DrawingTool, DrawingPoint, DrawingStroke } from "../types";
import { STROKE_COLORS, STROKE_SIZES } from "../types";

// Callback for when drawing mode is activated (registered by ai-store for cross-store coordination)
let onDrawingModeActivated: (() => void) | null = null;

export function setOnDrawingModeActivated(callback: (() => void) | null) {
  onDrawingModeActivated = callback;
}

// Undo/redo action types
interface AddStrokeAction {
  type: "add_stroke";
  pageNumber: number;
  stroke: DrawingStroke;
}

interface RemoveStrokeAction {
  type: "remove_stroke";
  pageNumber: number;
  stroke: DrawingStroke;
}

type DrawingAction = AddStrokeAction | RemoveStrokeAction;

interface DrawingState {
  isDrawingMode: boolean;
  activeTool: DrawingTool;
  strokeSize: number;
  strokeColor: string;
  activeStroke: DrawingStroke | null;
  activePageNumber: number | null;
  pageStrokes: Map<number, DrawingStroke[]>;
  undoStack: DrawingAction[];
  redoStack: DrawingAction[];
  dirtyPages: Set<number>;
}

interface DrawingActions {
  setDrawingMode: (mode: boolean) => void;
  toggleDrawingMode: () => void;
  setActiveTool: (tool: DrawingTool) => void;
  setStrokeSize: (size: number) => void;
  setStrokeColor: (color: string) => void;
  beginStroke: (pageNumber: number, point: DrawingPoint) => void;
  addPoint: (point: DrawingPoint) => void;
  endStroke: () => void;
  cancelStroke: () => void;
  loadPageStrokes: (pageNumber: number, strokes: DrawingStroke[]) => void;
  getPageStrokes: (pageNumber: number) => DrawingStroke[];
  eraseStrokesAtPoint: (pageNumber: number, x: number, y: number, radius: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markPageDirty: (pageNumber: number) => void;
  markPageClean: (pageNumber: number) => void;
  getDirtyPages: () => number[];
  reset: () => void;
}

export type DrawingStore = DrawingState & DrawingActions;

/** Eraser hit-test radius is this multiplier times the current stroke size. */
const ERASER_RADIUS_MULTIPLIER = 2;

const initialState: DrawingState = {
  isDrawingMode: false,
  activeTool: "pen",
  strokeSize: STROKE_SIZES[1].value, // Medium
  strokeColor: STROKE_COLORS[0].value, // Black
  activeStroke: null,
  activePageNumber: null,
  pageStrokes: new Map(),
  undoStack: [],
  redoStack: [],
  dirtyPages: new Set(),
};

function generateStrokeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  ...initialState,

  setDrawingMode: (mode) => {
    set({ isDrawingMode: mode });
    if (mode && onDrawingModeActivated) {
      onDrawingModeActivated();
    }
  },

  toggleDrawingMode: () => {
    const newMode = !get().isDrawingMode;
    set({ isDrawingMode: newMode });
    if (newMode && onDrawingModeActivated) {
      onDrawingModeActivated();
    }
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  setStrokeSize: (size) => set({ strokeSize: size }),

  setStrokeColor: (color) => set({ strokeColor: color }),

  beginStroke: (pageNumber, point) => {
    const { activeTool, strokeColor, strokeSize } = get();
    if (activeTool === "eraser") {
      // Eraser mode: immediately erase at this point
      get().eraseStrokesAtPoint(pageNumber, point.x, point.y, strokeSize * ERASER_RADIUS_MULTIPLIER);
      return;
    }
    const stroke: DrawingStroke = {
      id: generateStrokeId(),
      points: [point],
      color: strokeColor,
      size: strokeSize,
      tool: activeTool,
      timestamp: Date.now(),
    };
    set({ activeStroke: stroke, activePageNumber: pageNumber });
  },

  addPoint: (point) => {
    const { activeStroke, activePageNumber, activeTool } = get();
    if (activeTool === "eraser") {
      // Continue erasing along the path
      if (activePageNumber !== null) {
        get().eraseStrokesAtPoint(activePageNumber, point.x, point.y, get().strokeSize * ERASER_RADIUS_MULTIPLIER);
      }
      return;
    }
    if (!activeStroke) return;
    set({
      activeStroke: {
        ...activeStroke,
        points: [...activeStroke.points, point],
      },
    });
  },

  endStroke: () => {
    const { activeStroke, activePageNumber, pageStrokes, activeTool } = get();
    if (activeTool === "eraser") {
      set({ activePageNumber: null });
      return;
    }
    if (!activeStroke || activePageNumber === null) return;

    // Require at least 2 points for a valid stroke
    if (activeStroke.points.length < 2) {
      set({ activeStroke: null, activePageNumber: null });
      return;
    }

    const newMap = new Map(pageStrokes);
    const existing = newMap.get(activePageNumber) ?? [];
    newMap.set(activePageNumber, [...existing, activeStroke]);

    const newDirty = new Set(get().dirtyPages);
    newDirty.add(activePageNumber);

    const action: AddStrokeAction = {
      type: "add_stroke",
      pageNumber: activePageNumber,
      stroke: activeStroke,
    };

    set({
      pageStrokes: newMap,
      activeStroke: null,
      activePageNumber: null,
      undoStack: [...get().undoStack, action],
      redoStack: [],
      dirtyPages: newDirty,
    });
  },

  cancelStroke: () => {
    set({ activeStroke: null, activePageNumber: null });
  },

  loadPageStrokes: (pageNumber, strokes) => {
    const newMap = new Map(get().pageStrokes);
    newMap.set(pageNumber, strokes);
    set({ pageStrokes: newMap });
  },

  getPageStrokes: (pageNumber) => {
    return get().pageStrokes.get(pageNumber) ?? [];
  },

  eraseStrokesAtPoint: (pageNumber, x, y, radius) => {
    const { pageStrokes } = get();
    const existing = pageStrokes.get(pageNumber);
    if (!existing || existing.length === 0) return;

    const toRemove: DrawingStroke[] = [];
    const remaining: DrawingStroke[] = [];

    for (const stroke of existing) {
      let hit = false;
      for (const pt of stroke.points) {
        const dx = pt.x - x;
        const dy = pt.y - y;
        if (dx * dx + dy * dy <= radius * radius) {
          hit = true;
          break;
        }
      }
      if (hit) {
        toRemove.push(stroke);
      } else {
        remaining.push(stroke);
      }
    }

    if (toRemove.length === 0) return;

    const newMap = new Map(pageStrokes);
    newMap.set(pageNumber, remaining);

    const newDirty = new Set(get().dirtyPages);
    newDirty.add(pageNumber);

    const actions: DrawingAction[] = toRemove.map((stroke) => ({
      type: "remove_stroke" as const,
      pageNumber,
      stroke,
    }));

    set({
      pageStrokes: newMap,
      undoStack: [...get().undoStack, ...actions],
      redoStack: [],
      dirtyPages: newDirty,
    });
  },

  undo: () => {
    const { undoStack, pageStrokes } = get();
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newMap = new Map(pageStrokes);
    const newDirty = new Set(get().dirtyPages);

    if (action.type === "add_stroke") {
      // Undo an add: remove the stroke
      const existing = newMap.get(action.pageNumber) ?? [];
      newMap.set(
        action.pageNumber,
        existing.filter((s) => s.id !== action.stroke.id)
      );
    } else {
      // Undo a remove: re-add the stroke
      const existing = newMap.get(action.pageNumber) ?? [];
      newMap.set(action.pageNumber, [...existing, action.stroke]);
    }

    newDirty.add(action.pageNumber);

    set({
      pageStrokes: newMap,
      undoStack: newUndoStack,
      redoStack: [...get().redoStack, action],
      dirtyPages: newDirty,
    });
  },

  redo: () => {
    const { redoStack, pageStrokes } = get();
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newMap = new Map(pageStrokes);
    const newDirty = new Set(get().dirtyPages);

    if (action.type === "add_stroke") {
      // Redo an add: re-add the stroke
      const existing = newMap.get(action.pageNumber) ?? [];
      newMap.set(action.pageNumber, [...existing, action.stroke]);
    } else {
      // Redo a remove: remove the stroke again
      const existing = newMap.get(action.pageNumber) ?? [];
      newMap.set(
        action.pageNumber,
        existing.filter((s) => s.id !== action.stroke.id)
      );
    }

    newDirty.add(action.pageNumber);

    set({
      pageStrokes: newMap,
      undoStack: [...get().undoStack, action],
      redoStack: newRedoStack,
      dirtyPages: newDirty,
    });
  },

  canUndo: () => get().undoStack.length > 0,

  canRedo: () => get().redoStack.length > 0,

  markPageDirty: (pageNumber) => {
    const newDirty = new Set(get().dirtyPages);
    newDirty.add(pageNumber);
    set({ dirtyPages: newDirty });
  },

  markPageClean: (pageNumber) => {
    const newDirty = new Set(get().dirtyPages);
    newDirty.delete(pageNumber);
    set({ dirtyPages: newDirty });
  },

  getDirtyPages: () => {
    return Array.from(get().dirtyPages);
  },

  reset: () => {
    set({
      ...initialState,
      pageStrokes: new Map(),
      undoStack: [],
      redoStack: [],
      dirtyPages: new Set(),
    });
  },
}));
