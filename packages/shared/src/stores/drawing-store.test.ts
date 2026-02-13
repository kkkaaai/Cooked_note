import { describe, it, expect, beforeEach, vi } from "vitest";
import { useDrawingStore, setOnDrawingModeActivated } from "./drawing-store";
import type { DrawingPoint, DrawingStroke } from "../types";

function makePoint(x: number, y: number, pressure = 0.5): DrawingPoint {
  return { x, y, pressure };
}

function makeStroke(id: string, tool: "pen" | "highlighter" = "pen"): DrawingStroke {
  return {
    id,
    points: [makePoint(0.1, 0.1), makePoint(0.2, 0.2), makePoint(0.3, 0.3)],
    color: "#000000",
    size: 0.004,
    tool,
    timestamp: Date.now(),
  };
}

describe("drawing-store", () => {
  beforeEach(() => {
    useDrawingStore.getState().reset();
    setOnDrawingModeActivated(null);
  });

  describe("tool state", () => {
    it("starts with default values", () => {
      const state = useDrawingStore.getState();
      expect(state.isDrawingMode).toBe(false);
      expect(state.activeTool).toBe("pen");
      expect(state.strokeColor).toBe("#000000");
      expect(state.activeStroke).toBeNull();
    });

    it("toggleDrawingMode toggles on/off", () => {
      useDrawingStore.getState().toggleDrawingMode();
      expect(useDrawingStore.getState().isDrawingMode).toBe(true);
      useDrawingStore.getState().toggleDrawingMode();
      expect(useDrawingStore.getState().isDrawingMode).toBe(false);
    });

    it("setDrawingMode sets specific value", () => {
      useDrawingStore.getState().setDrawingMode(true);
      expect(useDrawingStore.getState().isDrawingMode).toBe(true);
      useDrawingStore.getState().setDrawingMode(false);
      expect(useDrawingStore.getState().isDrawingMode).toBe(false);
    });

    it("setActiveTool changes tool", () => {
      useDrawingStore.getState().setActiveTool("highlighter");
      expect(useDrawingStore.getState().activeTool).toBe("highlighter");
    });

    it("setStrokeSize changes size", () => {
      useDrawingStore.getState().setStrokeSize(0.008);
      expect(useDrawingStore.getState().strokeSize).toBe(0.008);
    });

    it("setStrokeColor changes color", () => {
      useDrawingStore.getState().setStrokeColor("#FF0000");
      expect(useDrawingStore.getState().strokeColor).toBe("#FF0000");
    });
  });

  describe("stroke lifecycle", () => {
    it("beginStroke creates an active stroke", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.5, 0.5));
      const state = useDrawingStore.getState();
      expect(state.activeStroke).not.toBeNull();
      expect(state.activeStroke!.points).toHaveLength(1);
      expect(state.activePageNumber).toBe(1);
    });

    it("addPoint adds points to active stroke", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.5, 0.5));
      useDrawingStore.getState().addPoint(makePoint(0.6, 0.6));
      useDrawingStore.getState().addPoint(makePoint(0.7, 0.7));
      expect(useDrawingStore.getState().activeStroke!.points).toHaveLength(3);
    });

    it("addPoint does nothing without active stroke", () => {
      useDrawingStore.getState().addPoint(makePoint(0.5, 0.5));
      expect(useDrawingStore.getState().activeStroke).toBeNull();
    });

    it("endStroke commits stroke to pageStrokes", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().endStroke();

      const state = useDrawingStore.getState();
      expect(state.activeStroke).toBeNull();
      expect(state.activePageNumber).toBeNull();
      expect(state.pageStrokes.get(1)).toHaveLength(1);
    });

    it("endStroke discards strokes with fewer than 2 points", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().endStroke();

      expect(useDrawingStore.getState().pageStrokes.get(1)).toBeUndefined();
    });

    it("cancelStroke discards active stroke without committing", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().cancelStroke();

      const state = useDrawingStore.getState();
      expect(state.activeStroke).toBeNull();
      expect(state.pageStrokes.get(1)).toBeUndefined();
    });

    it("endStroke marks page as dirty", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().endStroke();

      expect(useDrawingStore.getState().dirtyPages.has(1)).toBe(true);
    });

    it("multiple strokes on same page accumulate", () => {
      // Stroke 1
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().endStroke();

      // Stroke 2
      useDrawingStore.getState().beginStroke(1, makePoint(0.3, 0.3));
      useDrawingStore.getState().addPoint(makePoint(0.4, 0.4));
      useDrawingStore.getState().endStroke();

      expect(useDrawingStore.getState().pageStrokes.get(1)).toHaveLength(2);
    });
  });

  describe("loadPageStrokes", () => {
    it("loads strokes for a page", () => {
      const strokes = [makeStroke("s1"), makeStroke("s2")];
      useDrawingStore.getState().loadPageStrokes(3, strokes);
      expect(useDrawingStore.getState().getPageStrokes(3)).toHaveLength(2);
    });

    it("getPageStrokes returns empty array for unloaded page", () => {
      expect(useDrawingStore.getState().getPageStrokes(99)).toEqual([]);
    });
  });

  describe("eraser", () => {
    beforeEach(() => {
      // Pre-load some strokes
      useDrawingStore.getState().loadPageStrokes(1, [
        { ...makeStroke("s1"), points: [makePoint(0.1, 0.1), makePoint(0.15, 0.15)] },
        { ...makeStroke("s2"), points: [makePoint(0.5, 0.5), makePoint(0.55, 0.55)] },
        { ...makeStroke("s3"), points: [makePoint(0.9, 0.9), makePoint(0.95, 0.95)] },
      ]);
    });

    it("eraseStrokesAtPoint removes strokes near the point", () => {
      useDrawingStore.getState().eraseStrokesAtPoint(1, 0.1, 0.1, 0.05);
      const strokes = useDrawingStore.getState().getPageStrokes(1);
      expect(strokes).toHaveLength(2);
      expect(strokes.find((s) => s.id === "s1")).toBeUndefined();
    });

    it("eraseStrokesAtPoint does nothing if no strokes are near", () => {
      useDrawingStore.getState().eraseStrokesAtPoint(1, 0.3, 0.3, 0.01);
      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(3);
    });

    it("eraser tool uses beginStroke/addPoint to erase", () => {
      useDrawingStore.getState().setActiveTool("eraser");
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(2);
    });

    it("eraser marks page as dirty", () => {
      useDrawingStore.getState().eraseStrokesAtPoint(1, 0.1, 0.1, 0.05);
      expect(useDrawingStore.getState().dirtyPages.has(1)).toBe(true);
    });
  });

  describe("undo/redo", () => {
    it("undo reverses the last add_stroke", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().endStroke();

      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(1);
      useDrawingStore.getState().undo();
      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(0);
    });

    it("redo re-applies an undone add_stroke", () => {
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().endStroke();

      useDrawingStore.getState().undo();
      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(0);

      useDrawingStore.getState().redo();
      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(1);
    });

    it("undo reverses an erase (remove_stroke)", () => {
      useDrawingStore.getState().loadPageStrokes(1, [
        { ...makeStroke("s1"), points: [makePoint(0.1, 0.1), makePoint(0.15, 0.15)] },
      ]);

      useDrawingStore.getState().eraseStrokesAtPoint(1, 0.1, 0.1, 0.05);
      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(0);

      useDrawingStore.getState().undo();
      expect(useDrawingStore.getState().getPageStrokes(1)).toHaveLength(1);
    });

    it("new stroke clears redo stack", () => {
      // Draw, undo, draw again -> redo should be empty
      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().endStroke();

      useDrawingStore.getState().undo();
      expect(useDrawingStore.getState().canRedo()).toBe(true);

      useDrawingStore.getState().beginStroke(1, makePoint(0.3, 0.3));
      useDrawingStore.getState().addPoint(makePoint(0.4, 0.4));
      useDrawingStore.getState().endStroke();

      expect(useDrawingStore.getState().canRedo()).toBe(false);
    });

    it("canUndo/canRedo report correctly", () => {
      expect(useDrawingStore.getState().canUndo()).toBe(false);
      expect(useDrawingStore.getState().canRedo()).toBe(false);

      useDrawingStore.getState().beginStroke(1, makePoint(0.1, 0.1));
      useDrawingStore.getState().addPoint(makePoint(0.2, 0.2));
      useDrawingStore.getState().endStroke();

      expect(useDrawingStore.getState().canUndo()).toBe(true);
      expect(useDrawingStore.getState().canRedo()).toBe(false);

      useDrawingStore.getState().undo();
      expect(useDrawingStore.getState().canUndo()).toBe(false);
      expect(useDrawingStore.getState().canRedo()).toBe(true);
    });

    it("undo does nothing when stack is empty", () => {
      const before = useDrawingStore.getState();
      useDrawingStore.getState().undo();
      expect(useDrawingStore.getState().undoStack).toEqual(before.undoStack);
    });

    it("redo does nothing when stack is empty", () => {
      const before = useDrawingStore.getState();
      useDrawingStore.getState().redo();
      expect(useDrawingStore.getState().redoStack).toEqual(before.redoStack);
    });
  });

  describe("dirty pages", () => {
    it("markPageDirty adds page to set", () => {
      useDrawingStore.getState().markPageDirty(5);
      expect(useDrawingStore.getState().dirtyPages.has(5)).toBe(true);
    });

    it("markPageClean removes page from set", () => {
      useDrawingStore.getState().markPageDirty(5);
      useDrawingStore.getState().markPageClean(5);
      expect(useDrawingStore.getState().dirtyPages.has(5)).toBe(false);
    });

    it("getDirtyPages returns array of dirty page numbers", () => {
      useDrawingStore.getState().markPageDirty(1);
      useDrawingStore.getState().markPageDirty(3);
      const pages = useDrawingStore.getState().getDirtyPages();
      expect(pages).toContain(1);
      expect(pages).toContain(3);
      expect(pages).toHaveLength(2);
    });
  });

  describe("cross-store callback", () => {
    it("calls onDrawingModeActivated when drawing mode turns on", () => {
      const cb = vi.fn();
      setOnDrawingModeActivated(cb);

      useDrawingStore.getState().setDrawingMode(true);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does not call callback when drawing mode turns off", () => {
      const cb = vi.fn();
      setOnDrawingModeActivated(cb);

      useDrawingStore.getState().setDrawingMode(true);
      cb.mockClear();
      useDrawingStore.getState().setDrawingMode(false);
      expect(cb).not.toHaveBeenCalled();
    });

    it("calls callback on toggleDrawingMode when toggling on", () => {
      const cb = vi.fn();
      setOnDrawingModeActivated(cb);

      useDrawingStore.getState().toggleDrawingMode();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("resets all state to defaults", () => {
      useDrawingStore.getState().setDrawingMode(true);
      useDrawingStore.getState().setActiveTool("highlighter");
      useDrawingStore.getState().loadPageStrokes(1, [makeStroke("s1")]);
      useDrawingStore.getState().markPageDirty(1);

      useDrawingStore.getState().reset();

      const state = useDrawingStore.getState();
      expect(state.isDrawingMode).toBe(false);
      expect(state.activeTool).toBe("pen");
      expect(state.pageStrokes.size).toBe(0);
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(0);
      expect(state.dirtyPages.size).toBe(0);
    });
  });
});
