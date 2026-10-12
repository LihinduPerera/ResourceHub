/**
 * Typed fetch client for browser-side calls to this application's API.
 *
 * Every client component uses these helpers instead of hand-rolling
 * `fetch` + response parsing, which keeps error handling consistent.
 */

import type { ApiMeta } from "./response";

export type ApiEnvelope<T> = { data: T; meta?: ApiMeta };
export type ApiFailureBody = {
  error: { code: string; message: string; details?: unknown };
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body as ApiFailureBody | null)?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? `Request failed (${response.status}).`,
      error?.details,
    );
  }

  return (body as ApiEnvelope<T>).data;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

/** Turns validation `details` from the API into a `{ field: message }` map. */
export function getFieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};

  const result: Record<string, string> = {};
  for (const item of details) {
    if (
      item &&
      typeof item === "object" &&
      "field" in item &&
      "message" in item
    ) {
      result[String(item.field)] = String(item.message);
    }
  }
  return result;
}
