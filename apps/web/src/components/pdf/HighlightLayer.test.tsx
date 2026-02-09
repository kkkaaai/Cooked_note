import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { HighlightLayer } from "./HighlightLayer";
import { useAnnotationStore } from "@/stores/annotation-store";
import type { Annotation } from "@/types";

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "ann-1",
    documentId: "doc-1",
    userId: "user-1",
    type: "highlight",
    pageNumber: 1,
    color: "#FBBF24",
    position: { rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.02 }] },
    selectedText: "test text",
    content: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("HighlightLayer", () => {
  beforeEach(() => {
    useAnnotationStore.getState().reset();
  });

  it("renders nothing when no annotations exist", () => {
    const { container } = render(<HighlightLayer pageNumber={1} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders highlight divs for annotations on the given page", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1", pageNumber: 1 }),
      makeAnnotation({ id: "a2", pageNumber: 1 }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlights = container.querySelectorAll("[data-annotation-id]");
    expect(highlights).toHaveLength(2);
  });

  it("does not render annotations from other pages", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1", pageNumber: 1 }),
      makeAnnotation({ id: "a2", pageNumber: 2 }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlights = container.querySelectorAll("[data-annotation-id]");
    expect(highlights).toHaveLength(1);
    expect(highlights[0].getAttribute("data-annotation-id")).toBe("a1");
  });

  it("does not render non-highlight annotations", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1", type: "note" }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders multiple rects for multi-line highlights", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({
        id: "a1",
        position: {
          rects: [
            { x: 0.1, y: 0.1, width: 0.5, height: 0.02 },
            { x: 0.1, y: 0.15, width: 0.3, height: 0.02 },
          ],
        },
      }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const rects = container.querySelectorAll("[data-annotation-id='a1']");
    expect(rects).toHaveLength(2);
  });

  it("clicking a highlight selects it", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1" }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlight = container.querySelector("[data-annotation-id='a1']")!;
    fireEvent.click(highlight);

    expect(useAnnotationStore.getState().selectedAnnotationId).toBe("a1");
  });

  it("selected highlight has higher opacity", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1" }),
    ]);
    useAnnotationStore.getState().selectAnnotation("a1");

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlight = container.querySelector(
      "[data-annotation-id='a1']"
    ) as HTMLElement;
    expect(highlight.style.opacity).toBe("0.5");
  });

  it("unselected highlight has lower opacity", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1" }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlight = container.querySelector(
      "[data-annotation-id='a1']"
    ) as HTMLElement;
    expect(highlight.style.opacity).toBe("0.3");
  });

  it("positions highlights using percentage values", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({
        id: "a1",
        position: { rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.02 }] },
      }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlight = container.querySelector(
      "[data-annotation-id='a1']"
    ) as HTMLElement;
    expect(highlight.style.left).toBe("10%");
    expect(highlight.style.top).toBe("20%");
    expect(highlight.style.width).toBe("30%");
    expect(highlight.style.height).toBe("2%");
  });

  it("uses annotation color for background", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1", color: "#34D399" }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlight = container.querySelector(
      "[data-annotation-id='a1']"
    ) as HTMLElement;
    expect(highlight.style.backgroundColor).toBe("rgb(52, 211, 153)");
  });

  it("defaults to yellow when color is null", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: "a1", color: null }),
    ]);

    const { container } = render(<HighlightLayer pageNumber={1} />);
    const highlight = container.querySelector(
      "[data-annotation-id='a1']"
    ) as HTMLElement;
    expect(highlight.style.backgroundColor).toBe("rgb(251, 191, 36)");
  });
});
