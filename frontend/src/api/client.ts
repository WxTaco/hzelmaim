/**
 * Fetch wrapper for the backend API.
 * Sends JWT access token in Authorization header for cross-domain authentication.
 */

import type { ApiResponse, ApiErrorResponse } from '../types/api';

class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Store the access token obtained from OIDC callback or refresh. */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Store the refresh token for token renewal. */
export function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (token) {
    localStorage.setItem('refresh_token', token);
  } else {
    localStorage.removeItem('refresh_token');
  }
}

/** Retrieve the refresh token from localStorage. */
export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

/** Generic fetch wrapper that includes JWT access token in Authorization header. */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach JWT access token for authenticated requests.
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Attach content-type for requests with body.
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    ...options,
    headers,
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

