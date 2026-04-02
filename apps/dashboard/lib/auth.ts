const ACCESS_TOKEN_KEY = "hzel_access_token";
const REFRESH_TOKEN_KEY = "hzel_refresh_token";

// Cookie name for the refresh token — readable by the server-side proxy so it
// can distinguish "access token expired but refresh token still valid" from a
// genuinely logged-out user.
const REFRESH_TOKEN_COOKIE_KEY = "hzel_refresh_token";

/**
 * Mirrors the access token into a browser cookie so that the server-side
 * proxy (proxy.ts) can read it for authentication-based redirects.
 * The cookie is NOT HttpOnly (set from JS) and carries the same expiry as
 * the JWT's `exp` claim so it persists across browser sessions.
 */
function setAuthCookie(accessToken: string) {
  let cookieParts = `${ACCESS_TOKEN_KEY}=${accessToken}; path=/; SameSite=Lax`;
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    if (typeof payload.exp === "number") {
      cookieParts += `; expires=${new Date(payload.exp * 1000).toUTCString()}`;
    }
  } catch {
    // Fall back to a session cookie if the JWT payload cannot be decoded.
  }
  document.cookie = cookieParts;
}

function clearAuthCookie() {
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Mirrors the refresh token into a browser cookie so that the server-side
 * proxy can detect a still-valid session even when the short-lived access
 * token has expired (e.g. after inactivity).  The cookie expiry is derived
 * from the refresh token's own `exp` claim (~8 hours).
 */
function setRefreshCookie(refreshToken: string) {
  let cookieParts = `${REFRESH_TOKEN_COOKIE_KEY}=${refreshToken}; path=/; SameSite=Lax`;
  try {
    const payload = JSON.parse(atob(refreshToken.split(".")[1]));
    if (typeof payload.exp === "number") {
      cookieParts += `; expires=${new Date(payload.exp * 1000).toUTCString()}`;
    }
  } catch {
    // Fall back to a session cookie if the JWT payload cannot be decoded.
  }
  document.cookie = cookieParts;
}

function clearRefreshCookie() {
  document.cookie = `${REFRESH_TOKEN_COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  setAuthCookie(accessToken);
  setRefreshCookie(refreshToken);
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
  clearAuthCookie();
  clearRefreshCookie();
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

/** How many milliseconds before expiry to proactively refresh the access token. */
const REFRESH_THRESHOLD_MS = 60 * 1000; // 60 seconds

/** Returns true if the access token is absent, already expired, or expiring within the threshold. */
function isTokenExpiringSoon(): boolean {
  const claims = getTokenClaims();
  if (!claims) return true;
  return claims.exp * 1000 < Date.now() + REFRESH_THRESHOLD_MS;
}

// Shared in-flight refresh promise — prevents duplicate refresh requests when
// multiple concurrent API calls notice the token is expiring at the same time.
let refreshPromise: Promise<boolean> | null = null;

/**
 * Exchanges the stored refresh token for a new access token via
 * POST /api/v1/auth/refresh.  Concurrent callers share the same in-flight
 * request.  Clears all tokens and returns false if the refresh token is
 * missing or the server rejects it.
 */
export async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return false;
      }

      const data = await res.json();
      storeTokens(data.data.access_token, refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Proactively refresh the access token if it is expired or about to expire.
  if (isTokenExpiringSoon()) {
    await tryRefreshToken();
  }

  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // On a 401 (e.g. clock skew or race), attempt one token refresh then retry.
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryToken = getAccessToken();
      const retryRes = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(retryToken ? { Authorization: `Bearer ${retryToken}` } : {}),
          ...options.headers,
        },
      });

      if (!retryRes.ok) {
        const body = await retryRes.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${retryRes.status}`);
      }

      return retryRes.json();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

