import { describe, it, expect, beforeEach } from "vitest";
import {
  useAnnotationStore,
  selectPageAnnotations,
} from "./annotation-store";
import { HIGHLIGHT_COLORS, type Annotation } from "../types";

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

describe("annotation-store", () => {
  beforeEach(() => {
    useAnnotationStore.getState().reset();
  });

  describe("initial state", () => {
    it("has empty annotations array", () => {
      expect(useAnnotationStore.getState().annotations).toEqual([]);
    });

    it("has no selected annotation", () => {
      expect(useAnnotationStore.getState().selectedAnnotationId).toBeNull();
    });

    it("defaults to yellow highlight color", () => {
      expect(useAnnotationStore.getState().activeColor).toEqual(
        HIGHLIGHT_COLORS[0]
      );
    });

    it("has highlight mode off", () => {
      expect(useAnnotationStore.getState().isHighlightMode).toBe(false);
    });

    it("is not loading", () => {
      expect(useAnnotationStore.getState().isLoading).toBe(false);
    });
  });

  describe("setAnnotations", () => {
    it("sets the annotations array", () => {
      const annotations = [makeAnnotation(), makeAnnotation({ id: "ann-2" })];
      useAnnotationStore.getState().setAnnotations(annotations);
      expect(useAnnotationStore.getState().annotations).toHaveLength(2);
    });

    it("replaces existing annotations", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore
        .getState()
        .setAnnotations([makeAnnotation({ id: "new" })]);
      expect(useAnnotationStore.getState().annotations).toHaveLength(1);
      expect(useAnnotationStore.getState().annotations[0].id).toBe("new");
    });
  });

  describe("addAnnotation", () => {
    it("adds an annotation to the array", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      expect(useAnnotationStore.getState().annotations).toHaveLength(1);
    });

    it("appends to existing annotations", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore
        .getState()
        .addAnnotation(makeAnnotation({ id: "ann-2" }));
      expect(useAnnotationStore.getState().annotations).toHaveLength(2);
    });
  });

  describe("removeAnnotation", () => {
    it("removes annotation by id", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore.getState().removeAnnotation("ann-1");
      expect(useAnnotationStore.getState().annotations).toHaveLength(0);
    });

    it("clears selection if removed annotation was selected", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore.getState().selectAnnotation("ann-1");
      useAnnotationStore.getState().removeAnnotation("ann-1");
      expect(useAnnotationStore.getState().selectedAnnotationId).toBeNull();
    });

    it("does not clear selection of other annotation", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore
        .getState()
        .addAnnotation(makeAnnotation({ id: "ann-2" }));
      useAnnotationStore.getState().selectAnnotation("ann-2");
      useAnnotationStore.getState().removeAnnotation("ann-1");
      expect(useAnnotationStore.getState().selectedAnnotationId).toBe("ann-2");
    });
  });

  describe("updateAnnotation", () => {
    it("updates the specified annotation", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore
        .getState()
        .updateAnnotation("ann-1", { color: "#34D399" });
      expect(useAnnotationStore.getState().annotations[0].color).toBe(
        "#34D399"
      );
    });

    it("does not modify other annotations", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore
        .getState()
        .addAnnotation(makeAnnotation({ id: "ann-2", color: "#60A5FA" }));
      useAnnotationStore
        .getState()
        .updateAnnotation("ann-1", { color: "#34D399" });
      expect(useAnnotationStore.getState().annotations[1].color).toBe(
        "#60A5FA"
      );
    });
  });

  describe("selectAnnotation", () => {
    it("sets the selected annotation id", () => {
      useAnnotationStore.getState().selectAnnotation("ann-1");
      expect(useAnnotationStore.getState().selectedAnnotationId).toBe("ann-1");
    });

    it("clears selection with null", () => {
      useAnnotationStore.getState().selectAnnotation("ann-1");
      useAnnotationStore.getState().selectAnnotation(null);
      expect(useAnnotationStore.getState().selectedAnnotationId).toBeNull();
    });
  });

  describe("setActiveColor", () => {
    it("sets the active highlight color", () => {
      const green = HIGHLIGHT_COLORS[1];
      useAnnotationStore.getState().setActiveColor(green);
      expect(useAnnotationStore.getState().activeColor).toEqual(green);
    });
  });

  describe("toggleHighlightMode", () => {
    it("toggles from off to on", () => {
      useAnnotationStore.getState().toggleHighlightMode();
      expect(useAnnotationStore.getState().isHighlightMode).toBe(true);
    });

    it("toggles from on to off", () => {
      useAnnotationStore.getState().setHighlightMode(true);
      useAnnotationStore.getState().toggleHighlightMode();
      expect(useAnnotationStore.getState().isHighlightMode).toBe(false);
    });
  });

  describe("setHighlightMode", () => {
    it("sets highlight mode explicitly", () => {
      useAnnotationStore.getState().setHighlightMode(true);
      expect(useAnnotationStore.getState().isHighlightMode).toBe(true);
    });
  });

  describe("setLoading", () => {
    it("sets loading state", () => {
      useAnnotationStore.getState().setLoading(true);
      expect(useAnnotationStore.getState().isLoading).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      useAnnotationStore.getState().addAnnotation(makeAnnotation());
      useAnnotationStore.getState().selectAnnotation("ann-1");
      useAnnotationStore.getState().setActiveColor(HIGHLIGHT_COLORS[2]);
      useAnnotationStore.getState().setHighlightMode(true);
      useAnnotationStore.getState().setLoading(true);

      useAnnotationStore.getState().reset();

      const state = useAnnotationStore.getState();
      expect(state.annotations).toEqual([]);
      expect(state.selectedAnnotationId).toBeNull();
      expect(state.activeColor).toEqual(HIGHLIGHT_COLORS[0]);
      expect(state.isHighlightMode).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("selectPageAnnotations", () => {
    it("returns annotations for the specified page", () => {
      const ann1 = makeAnnotation({ id: "a1", pageNumber: 1 });
      const ann2 = makeAnnotation({ id: "a2", pageNumber: 2 });
      const ann3 = makeAnnotation({ id: "a3", pageNumber: 1 });

      useAnnotationStore.getState().setAnnotations([ann1, ann2, ann3]);

      const selector = selectPageAnnotations(1);
      const result = selector(useAnnotationStore.getState());
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.id)).toEqual(["a1", "a3"]);
    });

    it("returns empty array for page with no annotations", () => {
      useAnnotationStore
        .getState()
        .setAnnotations([makeAnnotation({ pageNumber: 1 })]);

      const selector = selectPageAnnotations(5);
      const result = selector(useAnnotationStore.getState());
      expect(result).toEqual([]);
    });
  });
});
