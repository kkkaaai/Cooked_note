"use client";

import { useEffect, useState } from "react";
import {
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFolderStore } from "@/stores/folder-store";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { FOLDER_COLORS } from "@/types";
import type { Folder } from "@/types";

function buildTree(folders: Folder[]): Folder[] {
  const map = new Map<string, Folder>();
  const roots: Folder[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function FolderTreeItem({
  folder,
  depth,
  selectedFolderId,
  onSelect,
  onRename,
  onDelete,
  onColorChange,
}: {
  folder: Folder;
  depth: number;
  selectedFolderId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setEditing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-primary/10");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-primary/10");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-primary/10");
    const documentId = e.dataTransfer.getData("application/document-id");
    if (documentId) {
      useFolderStore.getState().moveDocument(documentId, folder.id);
    }
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
          isSelected
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <FolderIcon
          className="h-4 w-4 shrink-0"
          style={{ color: folder.color }}
          fill={folder.color}
          fillOpacity={0.2}
        />
        {editing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-6 px-1 py-0 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1">{folder.name}</span>
        )}
        {folder._count && (
          <span className="text-xs text-muted-foreground">
            {folder._count.documents}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                setEditName(folder.name);
              }}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <CreateFolderDialog
                parentId={folder.id}
                trigger={
                  <button className="flex w-full items-center px-2 py-1.5 text-sm">
                    <FolderPlus className="mr-2 h-3.5 w-3.5" />
                    Add subfolder
                  </button>
                }
              />
            </DropdownMenuItem>
            {/* Color submenu */}
            <div className="flex gap-1 px-2 py-1.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`h-4 w-4 rounded-full border ${
                    folder.color === c.value
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorChange(folder.id, c.value);
                  }}
                  title={c.name}
                />
              ))}
            </div>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete folder "${folder.name}"? Documents will be moved to root.`)) {
                  onDelete(folder.id);
                }
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onColorChange={onColorChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderSidebar() {
  const folders = useFolderStore((s) => s.folders);
  const selectedFolderId = useFolderStore((s) => s.selectedFolderId);
  const fetchFolders = useFolderStore((s) => s.fetchFolders);
  const setSelectedFolderId = useFolderStore((s) => s.setSelectedFolderId);
  const updateFolder = useFolderStore((s) => s.updateFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const tree = buildTree(folders);

  const handleRename = (id: string, name: string) => {
    updateFolder(id, { name });
  };

  const handleColorChange = (id: string, color: string) => {
    updateFolder(id, { color });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-primary/10");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-primary/10");
  };

  const handleDropToRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-primary/10");
    const documentId = e.dataTransfer.getData("application/document-id");
    if (documentId) {
      useFolderStore.getState().moveDocument(documentId, null);
    }
  };

  return (
    <div className="hidden md:block w-56 shrink-0 border-r bg-muted/30 overflow-y-auto">
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Folders
          </h3>
          <CreateFolderDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>

        {/* All Documents */}
        <div
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
            selectedFolderId === null
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted"
          }`}
          onClick={() => setSelectedFolderId(null)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropToRoot}
        >
          <FileText className="h-4 w-4" />
          <span>All Documents</span>
        </div>

        {/* Folder tree */}
        <div className="mt-1">
          {tree.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              No folders yet. Click + to create one.
            </p>
          )}
          {tree.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              depth={0}
              selectedFolderId={selectedFolderId}
              onSelect={setSelectedFolderId}
              onRename={handleRename}
              onDelete={deleteFolder}
              onColorChange={handleColorChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
