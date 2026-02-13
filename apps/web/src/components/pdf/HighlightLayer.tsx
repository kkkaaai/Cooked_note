"use client";

import { useMemo } from "react";
import { useAnnotationStore } from "@cookednote/shared/stores/annotation-store";
import type { Annotation } from "@cookednote/shared/types";
import { isHighlightPosition } from "@cookednote/shared/types";

interface HighlightLayerProps {
  pageNumber: number;
}

export function HighlightLayer({ pageNumber }: HighlightLayerProps) {
  const annotations = useAnnotationStore((s) => s.annotations);
  const selectedAnnotationId = useAnnotationStore(
    (s) => s.selectedAnnotationId
  );
  const selectAnnotation = useAnnotationStore((s) => s.selectAnnotation);

  const highlights = useMemo(
    () =>
      annotations.filter(
        (a) => a.pageNumber === pageNumber && a.type === "highlight"
      ),
    [annotations, pageNumber]
  );

  if (highlights.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 4 }}
    >
      {highlights.map((annotation) => (
        <HighlightOverlay
          key={annotation.id}
          annotation={annotation}
          isSelected={annotation.id === selectedAnnotationId}
          onSelect={() => selectAnnotation(annotation.id)}
        />
      ))}
    </div>
  );
}

interface HighlightOverlayProps {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
}

function HighlightOverlay({
  annotation,
  isSelected,
  onSelect,
}: HighlightOverlayProps) {
  if (!isHighlightPosition(annotation.position)) return null;
  const rects = annotation.position.rects;
  const color = annotation.color || "#FBBF24";

  return (
    <>
      {rects.map((rect, i) => (
        <div
          key={i}
          className="absolute pointer-events-auto cursor-pointer transition-opacity"
          data-annotation-id={annotation.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
            backgroundColor: color,
            opacity: isSelected ? 0.5 : 0.3,
            borderRadius: "2px",
            outline: isSelected ? `2px solid ${color}` : "none",
            mixBlendMode: "multiply",
          }}
          title={annotation.selectedText || undefined}
        />
      ))}
    </>
  );
}
