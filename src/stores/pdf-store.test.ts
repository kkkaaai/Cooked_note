import { describe, it, expect, beforeEach } from "vitest";
import { usePDFStore } from "./pdf-store";

describe("usePDFStore", () => {
  beforeEach(() => {
    usePDFStore.getState().reset();
  });

  it("has correct initial state", () => {
    const state = usePDFStore.getState();
    expect(state.documentId).toBeNull();
    expect(state.numPages).toBe(0);
    expect(state.currentPage).toBe(1);
    expect(state.scale).toBe(1.0);
    expect(state.viewMode).toBe("single");
    expect(state.scrollTarget).toBeNull();
  });

  it("setDocument sets id, numPages, and resets page/scale", () => {
    usePDFStore.getState().setDocument("doc-1", 10);
    const state = usePDFStore.getState();
    expect(state.documentId).toBe("doc-1");
    expect(state.numPages).toBe(10);
    expect(state.currentPage).toBe(1);
    expect(state.scale).toBe(1.0);
  });

  describe("page navigation", () => {
    beforeEach(() => {
      usePDFStore.getState().setDocument("doc-1", 5);
    });

    it("nextPage increments current page", () => {
      usePDFStore.getState().nextPage();
      expect(usePDFStore.getState().currentPage).toBe(2);
    });

    it("nextPage does not exceed numPages", () => {
      usePDFStore.getState().setCurrentPage(5);
      usePDFStore.getState().nextPage();
      expect(usePDFStore.getState().currentPage).toBe(5);
    });

    it("previousPage decrements current page", () => {
      usePDFStore.getState().setCurrentPage(3);
      usePDFStore.getState().previousPage();
      expect(usePDFStore.getState().currentPage).toBe(2);
    });

    it("previousPage does not go below 1", () => {
      usePDFStore.getState().previousPage();
      expect(usePDFStore.getState().currentPage).toBe(1);
    });

    it("setCurrentPage sets valid page", () => {
      usePDFStore.getState().setCurrentPage(3);
      expect(usePDFStore.getState().currentPage).toBe(3);
    });

    it("setCurrentPage ignores out-of-range values", () => {
      usePDFStore.getState().setCurrentPage(0);
      expect(usePDFStore.getState().currentPage).toBe(1);
      usePDFStore.getState().setCurrentPage(6);
      expect(usePDFStore.getState().currentPage).toBe(1);
    });
  });

  describe("zoom", () => {
    it("zoomIn increases scale by 0.25", () => {
      usePDFStore.getState().zoomIn();
      expect(usePDFStore.getState().scale).toBe(1.25);
    });

    it("zoomOut decreases scale by 0.25", () => {
      usePDFStore.getState().zoomOut();
      expect(usePDFStore.getState().scale).toBe(0.75);
    });

    it("zoomIn caps at 3.0", () => {
      usePDFStore.getState().setScale(3.0);
      usePDFStore.getState().zoomIn();
      expect(usePDFStore.getState().scale).toBe(3.0);
    });

    it("zoomOut caps at 0.5", () => {
      usePDFStore.getState().setScale(0.5);
      usePDFStore.getState().zoomOut();
      expect(usePDFStore.getState().scale).toBe(0.5);
    });

    it("setScale clamps to valid range", () => {
      usePDFStore.getState().setScale(5.0);
      expect(usePDFStore.getState().scale).toBe(3.0);
      usePDFStore.getState().setScale(0.1);
      expect(usePDFStore.getState().scale).toBe(0.5);
    });
  });

  it("reset clears all state", () => {
    usePDFStore.getState().setDocument("doc-1", 10);
    usePDFStore.getState().setCurrentPage(5);
    usePDFStore.getState().setScale(2.0);
    usePDFStore.getState().setViewMode("continuous");
    usePDFStore.getState().reset();

    const state = usePDFStore.getState();
    expect(state.documentId).toBeNull();
    expect(state.numPages).toBe(0);
    expect(state.currentPage).toBe(1);
    expect(state.scale).toBe(1.0);
    expect(state.viewMode).toBe("single");
    expect(state.scrollTarget).toBeNull();
  });

  describe("view mode", () => {
    beforeEach(() => {
      usePDFStore.getState().setDocument("doc-1", 10);
    });

    it("setViewMode changes view mode", () => {
      usePDFStore.getState().setViewMode("continuous");
      expect(usePDFStore.getState().viewMode).toBe("continuous");
    });

    it("setViewMode clears scrollTarget", () => {
      usePDFStore.getState().setViewMode("continuous");
      usePDFStore.getState().setCurrentPage(5); // sets scrollTarget
      expect(usePDFStore.getState().scrollTarget).toBe(5);
      usePDFStore.getState().setViewMode("single");
      expect(usePDFStore.getState().scrollTarget).toBeNull();
    });

    it("setCurrentPage sets scrollTarget in continuous mode", () => {
      usePDFStore.getState().setViewMode("continuous");
      usePDFStore.getState().setCurrentPage(3);
      expect(usePDFStore.getState().scrollTarget).toBe(3);
    });

    it("setCurrentPage does not set scrollTarget in single mode", () => {
      usePDFStore.getState().setCurrentPage(3);
      expect(usePDFStore.getState().scrollTarget).toBeNull();
    });

    it("nextPage sets scrollTarget in continuous mode", () => {
      usePDFStore.getState().setViewMode("continuous");
      usePDFStore.getState().nextPage();
      expect(usePDFStore.getState().scrollTarget).toBe(2);
    });

    it("previousPage sets scrollTarget in continuous mode", () => {
      usePDFStore.getState().setViewMode("continuous");
      usePDFStore.getState().setCurrentPage(5);
      usePDFStore.getState().previousPage();
      expect(usePDFStore.getState().scrollTarget).toBe(4);
    });

    it("clearScrollTarget resets scrollTarget to null", () => {
      usePDFStore.getState().setViewMode("continuous");
      usePDFStore.getState().setCurrentPage(5);
      expect(usePDFStore.getState().scrollTarget).toBe(5);
      usePDFStore.getState().clearScrollTarget();
      expect(usePDFStore.getState().scrollTarget).toBeNull();
    });
  });
});
