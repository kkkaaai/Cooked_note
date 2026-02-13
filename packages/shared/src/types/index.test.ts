import { describe, it, expect } from "vitest";
import {
  isHighlightPosition,
  isDrawingPosition,
  DRAWING_TOOLS,
  STROKE_COLORS,
  STROKE_SIZES,
  type HighlightPosition,
  type DrawingPosition,
} from "./index";

describe("type guards", () => {
  const highlightPos: HighlightPosition = {
    rects: [{ x: 0.1, y: 0.2, width: 0.5, height: 0.02 }],
  };

  const drawingPos: DrawingPosition = {
    strokes: [
      {
        id: "s1",
        points: [{ x: 0.1, y: 0.2, pressure: 0.5 }],
        color: "#000000",
        size: 0.004,
        tool: "pen",
        timestamp: Date.now(),
      },
    ],
  };

  describe("isHighlightPosition", () => {
    it("returns true for highlight position", () => {
      expect(isHighlightPosition(highlightPos)).toBe(true);
    });

    it("returns false for drawing position", () => {
      expect(isHighlightPosition(drawingPos)).toBe(false);
    });
  });

  describe("isDrawingPosition", () => {
    it("returns true for drawing position", () => {
      expect(isDrawingPosition(drawingPos)).toBe(true);
    });

    it("returns false for highlight position", () => {
      expect(isDrawingPosition(highlightPos)).toBe(false);
    });
  });
});

describe("drawing constants", () => {
  it("DRAWING_TOOLS has pen, highlighter, eraser", () => {
    const values = DRAWING_TOOLS.map((t) => t.value);
    expect(values).toContain("pen");
    expect(values).toContain("highlighter");
    expect(values).toContain("eraser");
  });

  it("STROKE_COLORS has at least 3 colors", () => {
    expect(STROKE_COLORS.length).toBeGreaterThanOrEqual(3);
    for (const c of STROKE_COLORS) {
      expect(c.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("STROKE_SIZES are in ascending order", () => {
    for (let i = 1; i < STROKE_SIZES.length; i++) {
      expect(STROKE_SIZES[i].value).toBeGreaterThan(STROKE_SIZES[i - 1].value);
    }
  });
});
