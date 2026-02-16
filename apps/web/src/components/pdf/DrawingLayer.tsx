"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDrawingStore } from "@cookednote/shared/stores/drawing-store";
import { renderStrokeToCanvas } from "@cookednote/shared/lib/stroke-renderer";

interface DrawingLayerProps {
  pageNumber: number;
}

export function DrawingLayer({ pageNumber }: DrawingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const isDrawingMode = useDrawingStore((s) => s.isDrawingMode);
  const activeTool = useDrawingStore((s) => s.activeTool);

  // Get committed strokes for this page (avoid creating new array ref each render)
  const allPageStrokes = useDrawingStore((s) => s.pageStrokes);
  const pageStrokes = useMemo(
    () => allPageStrokes.get(pageNumber) ?? [],
    [allPageStrokes, pageNumber]
  );
  const activeStroke = useDrawingStore((s) => s.activeStroke);
  const activePageNumber = useDrawingStore((s) => s.activePageNumber);

  const showActiveStroke = activePageNumber === pageNumber && activeStroke !== null;

  // Resize canvas to match parent dimensions
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const { width, height } = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }, []);

  // Render committed strokes to offscreen canvas
  const renderOffscreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    syncCanvasSize();

    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement("canvas");
    }
    const offscreen = offscreenRef.current;
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;

    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const dims = {
      pageWidth: canvas.width / dpr,
      pageHeight: canvas.height / dpr,
    };

    for (const stroke of pageStrokes) {
      renderStrokeToCanvas(ctx, stroke, dims);
    }
    ctx.restore();
  }, [pageStrokes, syncCanvasSize]);

  // Composite offscreen + active stroke onto visible canvas
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw committed strokes from offscreen
    if (offscreenRef.current) {
      ctx.drawImage(offscreenRef.current, 0, 0);
    }

    // Draw active stroke
    if (showActiveStroke && activeStroke) {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      const dims = {
        pageWidth: canvas.width / dpr,
        pageHeight: canvas.height / dpr,
      };
      renderStrokeToCanvas(ctx, activeStroke, dims);
      ctx.restore();
    }
  }, [showActiveStroke, activeStroke]);

  // Initialize canvas size on mount and when drawing mode changes
  useEffect(() => {
    syncCanvasSize();
  }, [syncCanvasSize, isDrawingMode]);

  // Watch for parent size changes (zoom, window resize)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
      renderOffscreen();
      renderFrame();
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [syncCanvasSize, renderOffscreen, renderFrame]);

  // Re-render offscreen when committed strokes change
  useEffect(() => {
    renderOffscreen();
    renderFrame();
  }, [renderOffscreen, renderFrame]);

  // Animation loop for active stroke
  useEffect(() => {
    if (!showActiveStroke) return;

    const loop = () => {
      renderFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [showActiveStroke, renderFrame]);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingMode) return;
      e.preventDefault();
      e.stopPropagation();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const pressure = e.pressure || 0.5;

      if (activeTool === "eraser") {
        useDrawingStore.setState({ activePageNumber: pageNumber });
      }
      useDrawingStore.getState().beginStroke(pageNumber, { x, y, pressure });

      // Capture pointer for reliable tracking
      canvas.setPointerCapture(e.pointerId);
    },
    [isDrawingMode, pageNumber, activeTool]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingMode) return;
      const { activeStroke: active, activePageNumber: activePage, activeTool: tool } =
        useDrawingStore.getState();
      if (!active && tool !== "eraser") return;
      if (activePage !== pageNumber) return;

      e.preventDefault();
      e.stopPropagation();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const pressure = e.pressure || 0.5;

      useDrawingStore.getState().addPoint({ x, y, pressure });
    },
    [isDrawingMode, pageNumber]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingMode) return;
      e.preventDefault();
      e.stopPropagation();
      useDrawingStore.getState().endStroke();
    },
    [isDrawingMode]
  );

  // No strokes and not in drawing mode: render nothing
  if (!isDrawingMode && pageStrokes.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        zIndex: isDrawingMode ? 10 : 3,
        pointerEvents: isDrawingMode ? "auto" : "none",
        touchAction: isDrawingMode ? "none" : "auto",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
