import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";

// Mock canvas context
const mockCtx = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  fill: vi.fn(),
  drawImage: vi.fn(),
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  fillStyle: "",
};

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
HTMLCanvasElement.prototype.setPointerCapture = vi.fn();

// Mock Path2D
class MockPath2D {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_path?: string) {}
}
(globalThis as unknown as Record<string, unknown>).Path2D = MockPath2D;

// Import after mocks
import { DrawingLayer } from "./DrawingLayer";

describe("DrawingLayer", () => {
  beforeEach(() => {
    useDrawingStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when not in drawing mode and no strokes", () => {
    const { container } = render(<DrawingLayer pageNumber={1} />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders canvas when in drawing mode", () => {
    useDrawingStore.getState().setDrawingMode(true);
    const { container } = render(<DrawingLayer pageNumber={1} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  it("renders canvas when page has committed strokes", () => {
    useDrawingStore.getState().loadPageStrokes(1, [
      {
        id: "s1",
        points: [
          { x: 0.1, y: 0.1, pressure: 0.5 },
          { x: 0.2, y: 0.2, pressure: 0.5 },
        ],
        color: "#000",
        size: 0.004,
        tool: "pen",
        timestamp: Date.now(),
      },
    ]);

    const { container } = render(<DrawingLayer pageNumber={1} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  it("canvas has pointer-events auto when drawing mode is on", () => {
    useDrawingStore.getState().setDrawingMode(true);
    const { container } = render(<DrawingLayer pageNumber={1} />);
    const canvas = container.querySelector("canvas");
    expect(canvas?.style.pointerEvents).toBe("auto");
  });

  it("canvas has pointer-events none when drawing mode is off but has strokes", () => {
    useDrawingStore.getState().loadPageStrokes(1, [
      {
        id: "s1",
        points: [
          { x: 0.1, y: 0.1, pressure: 0.5 },
          { x: 0.2, y: 0.2, pressure: 0.5 },
        ],
        color: "#000",
        size: 0.004,
        tool: "pen",
        timestamp: Date.now(),
      },
    ]);

    const { container } = render(<DrawingLayer pageNumber={1} />);
    const canvas = container.querySelector("canvas");
    expect(canvas?.style.pointerEvents).toBe("none");
  });

  it("does not render canvas for a different page", () => {
    useDrawingStore.getState().loadPageStrokes(2, [
      {
        id: "s1",
        points: [
          { x: 0.1, y: 0.1, pressure: 0.5 },
          { x: 0.2, y: 0.2, pressure: 0.5 },
        ],
        color: "#000",
        size: 0.004,
        tool: "pen",
        timestamp: Date.now(),
      },
    ]);

    // Page 1 has no strokes and drawing mode is off
    const { container } = render(<DrawingLayer pageNumber={1} />);
    expect(container.querySelector("canvas")).toBeNull();
  });
});
