/**
 * Fetch wrapper for the backend API.
 * Sends session cookies automatically and handles CSRF tokens.
 */

import type { ApiResponse, ApiErrorResponse } from '../types/api';

class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken: string | null = null;

/** Store the CSRF token obtained from the session endpoint. */
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

/** Generic fetch wrapper that includes credentials and CSRF headers. */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach CSRF token for mutating requests.
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  // Attach content-type for requests with body.
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!res.ok) {
    let errorBody: ApiErrorResponse | null = null;
    try {
      errorBody = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      errorBody?.error?.code ?? 'UNKNOWN',
      errorBody?.error?.message ?? res.statusText,
      res.status,
    );
  }

  // Handle 204 No Content and empty bodies
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

/** GET request returning the `data` field from ApiResponse. */
export async function get<T>(path: string): Promise<T> {
  const res = await request<ApiResponse<T>>(path);
  return res.data;
}

/** POST request returning the `data` field from ApiResponse. */
export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await request<ApiResponse<T>>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.data;
}

export { ApiError };

