import type { ApiErrorResponse } from "@/types/api";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal ?? AbortSignal.timeout(30000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as ApiErrorResponse | null;
    throw new ApiError(
      response.status,
      error?.error ?? "The request failed. Please try again.",
      error?.code ?? "REQUEST_FAILED",
    );
  }
  return body as T;
}
