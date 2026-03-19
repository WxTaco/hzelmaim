/**
 * Authentication page — redirects to OIDC or shows a login button.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard.
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-400">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-16">
      <Card title="Authentication" subtitle="Sign in via your identity provider.">
        <div className="space-y-4 text-sm text-slate-300">
          <p>Click below to authenticate with the configured identity provider.</p>
          <button
            onClick={login}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-300"
          >
            Continue with identity provider
          </button>
        </div>
      </Card>
    </div>
  );
}
