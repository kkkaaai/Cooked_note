import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFolderStore } from "./folder-store";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useFolderStore", () => {
  beforeEach(() => {
    useFolderStore.getState().reset();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("has empty folders", () => {
      const state = useFolderStore.getState();
      expect(state.folders).toEqual([]);
      expect(state.selectedFolderId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("setSelectedFolderId", () => {
    it("sets the selected folder id", () => {
      useFolderStore.getState().setSelectedFolderId("folder-1");
      expect(useFolderStore.getState().selectedFolderId).toBe("folder-1");
    });

    it("sets to null for all documents", () => {
      useFolderStore.getState().setSelectedFolderId("folder-1");
      useFolderStore.getState().setSelectedFolderId(null);
      expect(useFolderStore.getState().selectedFolderId).toBeNull();
    });
  });

  describe("fetchFolders", () => {
    it("fetches and stores folders", async () => {
      const mockFolders = [
        { id: "f1", name: "Math", color: "#3B82F6", parentId: null, _count: { documents: 3 } },
        { id: "f2", name: "Physics", color: "#EF4444", parentId: null, _count: { documents: 1 } },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFolders),
      });

      await useFolderStore.getState().fetchFolders();

      expect(useFolderStore.getState().folders).toEqual(mockFolders);
      expect(useFolderStore.getState().isLoading).toBe(false);
    });

    it("handles fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await useFolderStore.getState().fetchFolders();

      expect(useFolderStore.getState().error).toBe("Failed to fetch folders");
      expect(useFolderStore.getState().isLoading).toBe(false);
    });
  });

  describe("createFolder", () => {
    it("creates a folder and adds to store", async () => {
      const newFolder = {
        id: "f1",
        name: "Math",
        color: "#3B82F6",
        parentId: null,
        _count: { documents: 0 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newFolder),
      });

      const result = await useFolderStore.getState().createFolder({
        name: "Math",
        color: "#3B82F6",
      });

      expect(result).toEqual(newFolder);
      expect(useFolderStore.getState().folders).toHaveLength(1);
      expect(useFolderStore.getState().folders[0].name).toBe("Math");
    });

    it("returns null on error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await useFolderStore.getState().createFolder({
        name: "Math",
      });

      expect(result).toBeNull();
      expect(useFolderStore.getState().error).toBeTruthy();
    });
  });

  describe("updateFolder", () => {
    it("updates a folder in store", async () => {
      // Pre-populate store
      useFolderStore.setState({
        folders: [
          {
            id: "f1",
            userId: "u1",
            name: "Math",
            color: "#3B82F6",
            parentId: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            _count: { documents: 0 },
          },
        ],
      });

      const updated = {
        id: "f1",
        userId: "u1",
        name: "Mathematics",
        color: "#3B82F6",
        parentId: null,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
        _count: { documents: 0 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updated),
      });

      const result = await useFolderStore
        .getState()
        .updateFolder("f1", { name: "Mathematics" });

      expect(result).toEqual(updated);
      expect(useFolderStore.getState().folders[0].name).toBe("Mathematics");
    });
  });

  describe("deleteFolder", () => {
    it("removes folder from store", async () => {
      useFolderStore.setState({
        folders: [
          {
            id: "f1",
            userId: "u1",
            name: "Math",
            color: "#3B82F6",
            parentId: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            _count: { documents: 0 },
          },
        ],
        selectedFolderId: "f1",
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await useFolderStore.getState().deleteFolder("f1");

      expect(result).toBe(true);
      expect(useFolderStore.getState().folders).toHaveLength(0);
      // Should reset selectedFolderId since we deleted the selected folder
      expect(useFolderStore.getState().selectedFolderId).toBeNull();
    });

    it("keeps selectedFolderId if different folder deleted", async () => {
      useFolderStore.setState({
        folders: [
          {
            id: "f1",
            userId: "u1",
            name: "Math",
            color: "#3B82F6",
            parentId: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            _count: { documents: 0 },
          },
          {
            id: "f2",
            userId: "u1",
            name: "Physics",
            color: "#EF4444",
            parentId: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            _count: { documents: 0 },
          },
        ],
        selectedFolderId: "f1",
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await useFolderStore.getState().deleteFolder("f2");

      expect(useFolderStore.getState().selectedFolderId).toBe("f1");
    });
  });

  describe("moveDocument", () => {
    it("calls PATCH on document and re-fetches folders", async () => {
      // First call: PATCH document
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      // Second call: fetchFolders
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await useFolderStore
        .getState()
        .moveDocument("doc-1", "folder-1");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith("/api/documents/doc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: "folder-1" }),
      });
    });
  });

  describe("reset", () => {
    it("resets to initial state", () => {
      useFolderStore.setState({
        folders: [
          {
            id: "f1",
            userId: "u1",
            name: "Test",
            color: "#000",
            parentId: null,
            createdAt: "",
            updatedAt: "",
          },
        ],
        selectedFolderId: "f1",
        error: "some error",
      });

      useFolderStore.getState().reset();

      const state = useFolderStore.getState();
      expect(state.folders).toEqual([]);
      expect(state.selectedFolderId).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});
