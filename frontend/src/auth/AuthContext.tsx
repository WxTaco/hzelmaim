/**
 * React context for authentication state.
 * Checks the session endpoint on mount and provides user info + login/logout helpers.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { get, post, setCsrfToken, ApiError } from '../api/client';

export interface AuthUser {
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  auth_method: 'session' | 'oidc';
}

interface SessionResponse {
  user: AuthUser;
  session: {
    session_id: string;
    csrf_token: string;
    expires_at: string;
    auth_method: string;
  };
  policy: {
    cookie_name: string;
    max_age_seconds: number;
  };
  oidc_enabled: boolean;
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
      const session = await get<SessionResponse>('/api/v1/auth/session');
      setUser(session.user);
      setCsrfToken(session.session.csrf_token);
      setOidcEnabled(session.oidc_enabled);
    } catch (err) {
      setUser(null);
      setCsrfToken(null);
      if (err instanceof ApiError && err.status === 401) {
        // Not authenticated — that's fine
      } else {
        console.error('Session check failed:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(() => {
    // Redirect to the OIDC authorize endpoint which does a 302 to the IdP.
    window.location.href = '/api/v1/auth/oidc/authorize';
  }, []);

  const logout = useCallback(async () => {
    try {
      await post('/api/v1/auth/logout');
    } catch {
      // ignore — session may already be gone
    }
    setUser(null);
    setCsrfToken(null);
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

