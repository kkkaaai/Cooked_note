"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePDFStore } from "@/stores/pdf-store";

interface PDFToolbarProps {
  title: string;
}

export function PDFToolbar({ title }: PDFToolbarProps) {
  const router = useRouter();
  const { currentPage, numPages, scale, nextPage, previousPage, setCurrentPage, zoomIn, zoomOut, setScale } =
    usePDFStore();
  const [pageInput, setPageInput] = useState("");

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page)) {
      setCurrentPage(page);
    }
    setPageInput("");
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Left: Back button + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="max-w-[300px] truncate text-sm font-medium">{title}</h1>
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousPage}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
          <Input
            className="h-8 w-12 text-center text-sm"
            value={pageInput || currentPage}
            onChange={(e) => setPageInput(e.target.value)}
            onFocus={() => setPageInput(String(currentPage))}
            onBlur={() => setPageInput("")}
          />
          <span className="text-sm text-muted-foreground">/ {numPages}</span>
        </form>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextPage}
          disabled={currentPage >= numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-14 text-center text-sm">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 3.0}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScale(1.0)}
          title="Reset zoom"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
