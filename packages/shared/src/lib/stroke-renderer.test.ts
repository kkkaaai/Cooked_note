import { describe, it, expect } from "vitest";
import {
  getStrokeOutlinePoints,
  outlineToSvgPath,
  getStrokeOpacity,
  getStrokeBlendMode,
} from "./stroke-renderer";
import type { DrawingStroke } from "../types";

function makeStroke(
  tool: "pen" | "highlighter" = "pen",
  points = [
    { x: 0.1, y: 0.1, pressure: 0.5 },
    { x: 0.2, y: 0.2, pressure: 0.6 },
    { x: 0.3, y: 0.3, pressure: 0.7 },
    { x: 0.4, y: 0.4, pressure: 0.5 },
  ]
): DrawingStroke {
  return {
    id: "test-stroke",
    points,
    color: "#000000",
    size: 0.004,
    tool,
    timestamp: Date.now(),
  };
}

const dims = { pageWidth: 800, pageHeight: 1000 };

describe("getStrokeOutlinePoints", () => {
  it("returns outline points for a pen stroke", () => {
    const stroke = makeStroke("pen");
    const outline = getStrokeOutlinePoints(stroke, dims);
    expect(outline.length).toBeGreaterThan(0);
    // Each point should be [x, y]
    for (const pt of outline) {
      expect(pt).toHaveLength(2);
      expect(typeof pt[0]).toBe("number");
      expect(typeof pt[1]).toBe("number");
    }
  });

  it("returns outline points for a highlighter stroke", () => {
    const stroke = makeStroke("highlighter");
    const outline = getStrokeOutlinePoints(stroke, dims);
    expect(outline.length).toBeGreaterThan(0);
  });

  it("returns points in pixel coordinates", () => {
    const stroke = makeStroke("pen");
    const outline = getStrokeOutlinePoints(stroke, dims);
    // Points should be in range of page dimensions (not 0-1)
    for (const pt of outline) {
      expect(pt[0]).toBeGreaterThan(1);
      expect(pt[1]).toBeGreaterThan(1);
    }
  });

  it("returns empty array for stroke with 0 points", () => {
    const stroke = makeStroke("pen", []);
    const outline = getStrokeOutlinePoints(stroke, dims);
    expect(outline).toHaveLength(0);
  });
});

describe("outlineToSvgPath", () => {
  it("generates valid SVG path string", () => {
    const points = [
      [10, 20],
      [30, 40],
      [50, 60],
    ];
    const path = outlineToSvgPath(points);
    expect(path).toMatch(/^M/);
    expect(path).toMatch(/Z$/);
    expect(path).toContain("L");
  });

  it("returns empty string for empty points", () => {
    expect(outlineToSvgPath([])).toBe("");
  });

  it("handles single point", () => {
    const path = outlineToSvgPath([[10, 20]]);
    expect(path).toBe("M 10.00 20.00 Z");
  });
});

describe("getStrokeOpacity", () => {
  it("returns 1.0 for pen", () => {
    expect(getStrokeOpacity("pen")).toBe(1.0);
  });

  it("returns 0.35 for highlighter", () => {
    expect(getStrokeOpacity("highlighter")).toBe(0.35);
  });

  it("returns 1.0 for eraser", () => {
    expect(getStrokeOpacity("eraser")).toBe(1.0);
  });
});

describe("getStrokeBlendMode", () => {
  it("returns multiply for highlighter", () => {
    expect(getStrokeBlendMode("highlighter")).toBe("multiply");
  });

  it("returns source-over for pen", () => {
    expect(getStrokeBlendMode("pen")).toBe("source-over");
  });

  it("returns source-over for eraser", () => {
    expect(getStrokeBlendMode("eraser")).toBe("source-over");
  });
});
