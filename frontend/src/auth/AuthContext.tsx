/**
 * React context for authentication state.
 * Manages JWT tokens and provides user info + login/logout helpers.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { get, post, setAccessToken, setRefreshToken, getRefreshToken, ApiError } from '../api/client';

export interface AuthUser {
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  auth_method: 'session' | 'oidc';
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface UserInfoResponse {
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  auth_method: 'session' | 'oidc';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  oidcEnabled: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [oidcEnabled, setOidcEnabled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      // Try to refresh token if we have a refresh token
      const storedRefreshToken = getRefreshToken();
      if (storedRefreshToken) {
        const tokenResponse = await post<TokenResponse>('/api/v1/auth/refresh', {
          refresh_token: storedRefreshToken,
        });
        setAccessToken(tokenResponse.access_token);
        setRefreshToken(tokenResponse.refresh_token);

        // Fetch user info from /api/v1/auth/me endpoint
        const userInfo = await get<UserInfoResponse>('/api/v1/auth/me');
        setUser({
          user_id: userInfo.user_id,
          email: userInfo.email,
          role: userInfo.role,
          auth_method: userInfo.auth_method,
        });
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch (err) {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      if (err instanceof ApiError && err.status === 401) {
        // Not authenticated — that's fine
      } else {
        console.error('Token refresh failed:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Set up automatic token refresh before expiration
  useEffect(() => {
    if (!user) return;

    // Refresh token 1 minute before it expires (access token is 15 minutes)
    const refreshInterval = setInterval(() => {
      refresh();
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, [user, refresh]);

  const login = useCallback(() => {
    // Redirect to the OIDC authorize endpoint which does a 302 to the IdP.
    window.location.href = '/api/v1/auth/oidc/authorize';
  }, []);

  const logout = useCallback(async () => {
    try {
      await post('/api/v1/auth/logout', {});
    } catch {
      // ignore — session may already be gone
    }
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, oidcEnabled, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

