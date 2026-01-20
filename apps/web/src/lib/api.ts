import { hcWithType } from "@repo/api/client";
import type { ApiFailure, ApiSuccess } from "@repo/shared";
import { env } from "../env";

/**
 * Custom fetch wrapper that throws on non-2xx responses
 * By default, fetch doesn't throw on HTTP errors (4xx, 5xx)
 */
async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: "include", // Important: allows cookies for Better Auth
  });

  if (!response.ok) {
    // Try to parse error as ApiFailure
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = (await response.json()) as ApiFailure;
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // If parsing fails, use default message
    }

    const error = new Error(errorMessage);
    throw error;
  }

  return response;
}

/**
 * Pre-compiled Hono RPC client with custom fetch wrapper
 * Uses hcWithType for better IDE performance - types are pre-computed at build time
 */
export const api = hcWithType(env.VITE_API_URL, {
  fetch: apiFetch,
});

/**
 * Helper type to extract the data type from an ApiSuccess response.
 * Since our API always returns { success: true, data: T } for success responses,
 * this extracts T from ApiSuccess<T>.
 */
export type ExtractData<T> = T extends ApiSuccess<infer D> ? D : never;

/**
 * Helper function to unwrap API response and extract data.
 * Since apiFetch throws on errors, we can safely assume success responses.
 * This provides runtime unwrapping with type inference.
 */
export async function unwrap<T extends ApiSuccess<unknown>>(
  responsePromise: Promise<Response>,
): Promise<ExtractData<T>> {
  const response = await responsePromise;
  const json = (await response.json()) as T;
  if (!json.success) {
    throw new Error((json as unknown as ApiFailure).error?.message || "Unknown error");
  }
  return json.data as ExtractData<T>;
}
