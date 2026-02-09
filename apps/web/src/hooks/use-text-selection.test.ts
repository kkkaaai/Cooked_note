import { describe, it, expect } from "vitest";
import { mergeAdjacentRects } from "./use-text-selection";
import type { NormalizedRect } from "@/types";

describe("mergeAdjacentRects", () => {
  it("returns empty array for empty input", () => {
    expect(mergeAdjacentRects([])).toEqual([]);
  });

  it("returns single rect unchanged", () => {
    const rect: NormalizedRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.02 };
    expect(mergeAdjacentRects([rect])).toEqual([rect]);
  });

  it("merges adjacent rects on the same line", () => {
    const rects: NormalizedRect[] = [
      { x: 0.1, y: 0.2, width: 0.1, height: 0.02 },
      { x: 0.2, y: 0.2, width: 0.15, height: 0.02 },
      { x: 0.35, y: 0.2, width: 0.1, height: 0.02 },
    ];
    const result = mergeAdjacentRects(rects);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBeCloseTo(0.1);
    expect(result[0].width).toBeCloseTo(0.35);
    expect(result[0].y).toBeCloseTo(0.2);
  });

  it("keeps rects on different lines separate", () => {
    const rects: NormalizedRect[] = [
      { x: 0.1, y: 0.1, width: 0.5, height: 0.02 },
      { x: 0.1, y: 0.15, width: 0.4, height: 0.02 },
    ];
    const result = mergeAdjacentRects(rects);
    expect(result).toHaveLength(2);
  });

  it("merges rects within y threshold as same line", () => {
    const rects: NormalizedRect[] = [
      { x: 0.1, y: 0.2, width: 0.2, height: 0.02 },
      { x: 0.3, y: 0.2025, width: 0.2, height: 0.02 }, // within 0.005 threshold
    ];
    const result = mergeAdjacentRects(rects);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBeCloseTo(0.1);
    expect(result[0].width).toBeCloseTo(0.4);
  });

  it("respects custom y threshold", () => {
    const rects: NormalizedRect[] = [
      { x: 0.1, y: 0.2, width: 0.2, height: 0.02 },
      { x: 0.3, y: 0.21, width: 0.2, height: 0.02 }, // difference = 0.01
    ];
    // With default threshold (0.005), these are different lines
    expect(mergeAdjacentRects(rects, 0.005)).toHaveLength(2);
    // With larger threshold, they merge
    expect(mergeAdjacentRects(rects, 0.02)).toHaveLength(1);
  });

  it("sorts rects by y then x before merging", () => {
    const rects: NormalizedRect[] = [
      { x: 0.5, y: 0.2, width: 0.1, height: 0.02 },
      { x: 0.1, y: 0.2, width: 0.1, height: 0.02 },
    ];
    const result = mergeAdjacentRects(rects);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBeCloseTo(0.1);
    expect(result[0].width).toBeCloseTo(0.5);
  });

  it("uses max height when merging rects with different heights", () => {
    const rects: NormalizedRect[] = [
      { x: 0.1, y: 0.2, width: 0.2, height: 0.02 },
      { x: 0.3, y: 0.2, width: 0.2, height: 0.03 },
    ];
    const result = mergeAdjacentRects(rects);
    expect(result).toHaveLength(1);
    expect(result[0].height).toBeCloseTo(0.03);
  });

  it("handles overlapping rects correctly", () => {
    const rects: NormalizedRect[] = [
      { x: 0.1, y: 0.2, width: 0.3, height: 0.02 },
      { x: 0.2, y: 0.2, width: 0.3, height: 0.02 }, // overlaps with first
    ];
    const result = mergeAdjacentRects(rects);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBeCloseTo(0.1);
    expect(result[0].width).toBeCloseTo(0.4); // 0.2 + 0.3 = 0.5, but x starts at 0.1
  });

  it("handles multi-line selections correctly", () => {
    const rects: NormalizedRect[] = [
      // Line 1
      { x: 0.3, y: 0.1, width: 0.6, height: 0.02 },
      // Line 2
      { x: 0.1, y: 0.15, width: 0.8, height: 0.02 },
      // Line 3
      { x: 0.1, y: 0.2, width: 0.4, height: 0.02 },
    ];
    const result = mergeAdjacentRects(rects);
    expect(result).toHaveLength(3);
    expect(result[0].y).toBeCloseTo(0.1);
    expect(result[1].y).toBeCloseTo(0.15);
    expect(result[2].y).toBeCloseTo(0.2);
  });
});
