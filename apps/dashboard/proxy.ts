import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Must match the cookie names written by storeTokens() in lib/auth.ts.
const AUTH_COOKIE = "hzel_access_token";
const REFRESH_COOKIE = "hzel_refresh_token";

/**
 * Validates a raw JWT string by checking the `exp` claim.
 * Runs entirely in the Node.js runtime — no localStorage, no DOM.
 */
function isValidToken(token: string): boolean {
  try {
    // JWT is three base64url segments separated by dots; the payload is [1].
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf-8")
    );
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(AUTH_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // A session is considered active if the access token is still valid OR if a
  // valid refresh token exists (the client will silently exchange it on the
  // next API call).
  const authenticated =
    (accessToken ? isValidToken(accessToken) : false) ||
    (refreshToken ? isValidToken(refreshToken) : false);

  // Authenticated users visiting /login are sent straight to the dashboard.
  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated users trying to access any /dashboard/* route are sent
  // to the login page. Marketing pages (/, /learn, etc.) are unaffected.
  if (pathname.startsWith("/dashboard") && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run on /login and every /dashboard route (including /dashboard itself
  // since :path* allows zero segments).
  matcher: ["/login", "/dashboard/:path*"],
};
