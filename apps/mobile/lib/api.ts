import { useCallback } from "react";
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
 * Hook that returns a stable authenticated fetch function.
 * Automatically attaches the Clerk JWT to every request.
 */
export function useApiFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken();
      return apiFetch(path, token, options);
    },
    [getToken]
  );
}
