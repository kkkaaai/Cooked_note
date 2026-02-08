"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize,
  Highlighter,
  Trash2,
  Check,
  Sparkles,
  Rows3,
  FileText,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePDFStore } from "@/stores/pdf-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useAIStore } from "@/stores/ai-store";
import { HIGHLIGHT_COLORS } from "@/types";
import { deleteAnnotation as deleteAnnotationApi } from "@/lib/annotations";
import { useToast } from "@/hooks/use-toast";

interface PDFToolbarProps {
  title: string;
}

export function PDFToolbar({ title }: PDFToolbarProps) {
  const router = useRouter();
  const { currentPage, numPages, scale, nextPage, previousPage, setCurrentPage, zoomIn, zoomOut, setScale, viewMode, setViewMode } =
    usePDFStore();
  const {
    isHighlightMode,
    toggleHighlightMode,
    activeColor,
    setActiveColor,
    selectedAnnotationId,
    removeAnnotation,
    selectAnnotation,
  } = useAnnotationStore();
  const { isAIMode, toggleAIMode } = useAIStore();
  const [pageInput, setPageInput] = useState("");
  const { toast } = useToast();

  // Auto-hide toolbar after inactivity, show on mouse near top or interaction
  const [visible, setVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    if (pinned) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 4000);
  }, [pinned]);

  // Show toolbar when mouse is near top of screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 60) {
        setVisible(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
      } else if (!pinned && e.clientY > 80) {
        // Restart hide timer when mouse moves away
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), 3000);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pinned]);

  // Reset timer on any toolbar interaction
  useEffect(() => {
    resetHideTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, scale, isHighlightMode, isAIMode, viewMode]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page)) {
      setCurrentPage(page);
    }
    setPageInput("");
  };

  const handleDeleteAnnotation = async () => {
    if (!selectedAnnotationId) return;
    const id = selectedAnnotationId;
    removeAnnotation(id);
    selectAnnotation(null);
    try {
      await deleteAnnotationApi(id);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete highlight.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative" onMouseEnter={resetHideTimer}>
      {/* Collapsible toolbar wrapper */}
      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          visible ? "max-h-14" : "max-h-0"
        }`}
      >
        <div
          ref={toolbarRef}
          className="flex h-14 items-center justify-between border-b bg-background px-4"
        >
          {/* Left: Back button + title */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="max-w-[300px] truncate text-sm font-medium">{title}</h1>
          </div>

          {/* Center: Page navigation + Annotation tools */}
          <div className="flex items-center gap-4">
            {/* Page navigation */}
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

            {/* View mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === "single" ? "continuous" : "single")}
              title={viewMode === "single" ? "Continuous scroll (V)" : "Single page (V)"}
            >
              {viewMode === "single" ? (
                <Rows3 className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </Button>

            {/* Divider */}
            <div className="h-6 w-px bg-border" />

            {/* Annotation tools */}
            <div className="flex items-center gap-1">
              <Button
                variant={isHighlightMode ? "default" : "ghost"}
                size="icon"
                onClick={toggleHighlightMode}
                title="Highlight mode (H)"
              >
                <Highlighter className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="Highlight color">
                    <div
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: activeColor.value }}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <DropdownMenuItem
                      key={color.name}
                      onClick={() => setActiveColor(color)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-4 w-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.name}
                      </div>
                      {activeColor.value === color.value && (
                        <Check className="ml-2 h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedAnnotationId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteAnnotation}
                  title="Delete highlight (Delete)"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-border" />

            {/* AI tools */}
            <Button
              variant={isAIMode ? "default" : "ghost"}
              size="icon"
              onClick={toggleAIMode}
              title="AI mode (A)"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Zoom controls + Pin */}
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
            <div className="mx-1 h-6 w-px bg-border" />
            <Button
              variant={pinned ? "default" : "ghost"}
              size="icon"
              onClick={() => {
                setPinned(!pinned);
                if (!pinned) {
                  // Pinning: clear any pending hide timer
                  if (hideTimer.current) clearTimeout(hideTimer.current);
                  setVisible(true);
                }
              }}
              title={pinned ? "Unpin toolbar (auto-hide)" : "Pin toolbar (always visible)"}
            >
              <Pin className={`h-4 w-4 ${pinned ? "rotate-0" : "rotate-45"}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating trigger when toolbar is hidden */}
      {!visible && (
        <button
          className="absolute left-1/2 top-0 z-50 flex -translate-x-1/2 items-center rounded-b-md border border-t-0 bg-background/90 px-4 py-0.5 shadow-sm transition-colors hover:bg-muted"
          onClick={() => {
            setVisible(true);
            setPinned(true);
          }}
          title="Show toolbar"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
