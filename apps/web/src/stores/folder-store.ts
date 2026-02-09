import { create } from "zustand";
import type { Folder, CreateFolderInput, UpdateFolderInput } from "@cookednote/shared/types";

interface FolderState {
  folders: Folder[];
  selectedFolderId: string | null; // null = "All Documents"
  isLoading: boolean;
  error: string | null;
}

interface FolderActions {
  fetchFolders: () => Promise<void>;
  createFolder: (input: CreateFolderInput) => Promise<Folder | null>;
  updateFolder: (id: string, input: UpdateFolderInput) => Promise<Folder | null>;
  deleteFolder: (id: string) => Promise<boolean>;
  setSelectedFolderId: (id: string | null) => void;
  moveDocument: (documentId: string, folderId: string | null) => Promise<boolean>;
  reset: () => void;
}

export type FolderStore = FolderState & FolderActions;

const initialState: FolderState = {
  folders: [],
  selectedFolderId: null,
  isLoading: false,
  error: null,
};

export const useFolderStore = create<FolderStore>((set, get) => ({
  ...initialState,

  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      const folders = await res.json();
      set({ folders, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createFolder: async (input) => {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      const folder = await res.json();
      set({ folders: [...get().folders, folder] });
      return folder;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  updateFolder: async (id, input) => {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update folder");
      const updated = await res.json();
      set({
        folders: get().folders.map((f) => (f.id === id ? updated : f)),
      });
      return updated;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  deleteFolder: async (id) => {
    try {
      const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete folder");
      set({
        folders: get().folders.filter((f) => f.id !== id),
        selectedFolderId:
          get().selectedFolderId === id ? null : get().selectedFolderId,
      });
      return true;
    } catch (err) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  setSelectedFolderId: (id) => set({ selectedFolderId: id }),

  moveDocument: async (documentId, folderId) => {
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) throw new Error("Failed to move document");
      // Refresh folder counts
      await get().fetchFolders();
      return true;
    } catch (err) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  reset: () => set(initialState),
}));
