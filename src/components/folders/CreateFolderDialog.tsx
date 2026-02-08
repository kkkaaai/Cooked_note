"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFolderStore } from "@/stores/folder-store";
import { FOLDER_COLORS } from "@/types";

interface CreateFolderDialogProps {
  parentId?: string;
  trigger?: React.ReactNode;
}

export function CreateFolderDialog({ parentId, trigger }: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(FOLDER_COLORS[0].value);
  const [creating, setCreating] = useState(false);
  const createFolder = useFolderStore((s) => s.createFolder);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const result = await createFolder({
      name: name.trim(),
      color,
      parentId,
    });
    setCreating(false);
    if (result) {
      setName("");
      setColor(FOLDER_COLORS[0].value);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Input
              placeholder="Folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={100}
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Color</p>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`h-7 w-7 rounded-full border-2 transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    color === c.value
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(c.value)}
                  title={c.name}
                  aria-label={`${c.name} folder color`}
                  aria-pressed={color === c.value}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
