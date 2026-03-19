"use client";

import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.62 0.22 264 / 18%) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm px-6"
      >
        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-10 text-center"
        >
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            hzel
          </span>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-xl border border-border bg-card p-8 shadow-2xl shadow-black/40"
        >
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your organisation SSO account to continue.
            </p>
          </div>

          <a
            href={`${API_URL}/api/v1/auth/oidc/authorize`}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <SsoIcon />
            Continue with SSO
          </a>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Access is restricted to authorised users only.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function SsoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 4V3a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="8.5" r="1.25" fill="currentColor" />
      <path d="M8 9.75v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

