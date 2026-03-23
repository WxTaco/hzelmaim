const ACCESS_TOKEN_KEY = "hzel_access_token";
const REFRESH_TOKEN_KEY = "hzel_refresh_token";

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Decoded payload of our access token. */
export interface TokenClaims {
  sub: string;
  email: string;
  /** Full display name from the Pocket ID `name` claim (`profile` scope). */
  display_name: string | null;
  /** Profile picture URL from the Pocket ID `picture` claim (`profile` scope). */
  picture_url: string | null;
  /** User role — `"admin"` or `"user"`. */
  role: string;
  session_id: string;
  iat: number;
  exp: number;
}

/** Returns true if the current token belongs to an admin user. */
export function isAdmin(): boolean {
  return getTokenClaims()?.role === "admin";
}

/** Decodes and returns the current access token's claims, or null if absent/malformed. */
export function getTokenClaims(): TokenClaims | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1])) as TokenClaims;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const claims = getTokenClaims();
  return claims !== null && claims.exp * 1000 > Date.now();
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

