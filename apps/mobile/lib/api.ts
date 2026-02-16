import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { API_URL } from "./constants";

/**
 * Authenticated fetch wrapper for Next.js API routes.
 */
export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

/**
 * Authenticated FormData upload (no Content-Type — let RN set multipart boundary).
 */
export async function apiUpload(
  path: string,
  token: string | null,
  body: FormData
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    body,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/**
 * Hook that returns a stable authenticated fetch function.
 * Automatically attaches the Clerk JWT to every request.
 *
 * Uses a ref for getToken so the returned function has a stable identity
 * and doesn't cause infinite re-render loops in consuming hooks.
 */
export function useApiFetch() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  return useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getTokenRef.current();
      return apiFetch(path, token, options);
    },
    [] // stable — getToken accessed via ref
  );
}

/**
 * Hook that returns a stable authenticated upload function for FormData.
 */
export function useApiUpload() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  return useCallback(
    async (path: string, body: FormData) => {
      const token = await getTokenRef.current();
      return apiUpload(path, token, body);
    },
    [] // stable — getToken accessed via ref
  );
}
