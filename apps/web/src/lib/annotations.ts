import type { Annotation, CreateAnnotationInput, UpdateAnnotationInput } from "@/types";

export async function fetchAnnotations(documentId: string): Promise<Annotation[]> {
  const res = await fetch(`/api/annotations?documentId=${documentId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch annotations");
  }
  return res.json();
}

export async function createAnnotation(input: CreateAnnotationInput): Promise<Annotation> {
  const res = await fetch("/api/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Failed to create annotation");
  }
  return res.json();
}

export async function updateAnnotation(id: string, input: UpdateAnnotationInput): Promise<Annotation> {
  const res = await fetch(`/api/annotations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Failed to update annotation");
  }
  return res.json();
}

export async function deleteAnnotation(id: string): Promise<void> {
  const res = await fetch(`/api/annotations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete annotation");
  }
}
