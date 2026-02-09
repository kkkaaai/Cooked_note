import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from "./annotations";
import type { CreateAnnotationInput, UpdateAnnotationInput } from "@cookednote/shared/types";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockAnnotation = {
  id: "ann-1",
  documentId: "doc-1",
  userId: "user-1",
  type: "highlight",
  pageNumber: 1,
  color: "#FBBF24",
  position: { rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.02 }] },
  selectedText: "test",
  content: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("annotations API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAnnotations", () => {
    it("calls GET with correct URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockAnnotation]),
      });

      const result = await fetchAnnotations("doc-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/annotations?documentId=doc-1"
      );
      expect(result).toEqual([mockAnnotation]);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(fetchAnnotations("doc-1")).rejects.toThrow(
        "Failed to fetch annotations"
      );
    });
  });

  describe("createAnnotation", () => {
    const input: CreateAnnotationInput = {
      documentId: "doc-1",
      type: "highlight",
      pageNumber: 1,
      color: "#FBBF24",
      position: { rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.02 }] },
      selectedText: "test",
    };

    it("calls POST with correct URL and body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnnotation),
      });

      const result = await createAnnotation(input);
      expect(mockFetch).toHaveBeenCalledWith("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      expect(result).toEqual(mockAnnotation);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 400 });
      await expect(createAnnotation(input)).rejects.toThrow(
        "Failed to create annotation"
      );
    });
  });

  describe("updateAnnotation", () => {
    const input: UpdateAnnotationInput = { color: "#34D399" };

    it("calls PATCH with correct URL and body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockAnnotation, ...input }),
      });

      const result = await updateAnnotation("ann-1", input);
      expect(mockFetch).toHaveBeenCalledWith("/api/annotations/ann-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      expect(result.color).toBe("#34D399");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      await expect(updateAnnotation("ann-1", input)).rejects.toThrow(
        "Failed to update annotation"
      );
    });
  });

  describe("deleteAnnotation", () => {
    it("calls DELETE with correct URL", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await deleteAnnotation("ann-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/annotations/ann-1", {
        method: "DELETE",
      });
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      await expect(deleteAnnotation("ann-1")).rejects.toThrow(
        "Failed to delete annotation"
      );
    });
  });
});
