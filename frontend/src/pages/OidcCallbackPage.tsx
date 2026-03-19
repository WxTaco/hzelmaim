/**
 * OIDC callback handler page.
 * Receives tokens from the backend and stores them, then redirects to dashboard.
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAccessToken, setRefreshToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function OidcCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from query parameters (if backend redirects with tokens)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Store tokens
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
          
          // Refresh auth context
          await refresh();
          
          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          // No tokens in URL, redirect to login
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('OIDC callback failed:', error);
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, refresh]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-vercel-bg">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-vercel-text mb-4">Signing you in...</h1>
        <p className="text-vercel-muted">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}

