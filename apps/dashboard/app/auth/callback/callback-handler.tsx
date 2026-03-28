"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { storeTokens } from "@/lib/auth";

/** Extracts display_name from a raw JWT string without hitting localStorage. */
function extractDisplayName(jwt: string): string | null {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return (payload.display_name as string | null | undefined) ?? null;
  } catch {
    return null;
  }
}

export function CallbackHandler() {
  const params = useSearchParams();
  const router = useRouter();

  // Tokens are available synchronously from the URL — no state needed for validation.
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  const hasTokens = Boolean(access && refresh);

  const [success, setSuccess] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  // Flips true ~900 ms after success so the text swaps after the checkmark
  // finishes drawing (circle 0–500 ms, tick 400–800 ms → swap at 900 ms).
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!hasTokens) return;

    const mountedAt = Date.now();
    // Minimum time to show the spinner so it always feels intentional.
    const MIN_SPINNER_MS = 1400;

    let welcomeTimer: ReturnType<typeof setTimeout>;
    let navTimer: ReturnType<typeof setTimeout>;

    const timer = setTimeout(() => {
      storeTokens(access!, refresh!);
      setDisplayName(extractDisplayName(access!));
      setSuccess(true);

      // Swap text just after the checkmark finishes drawing.
      welcomeTimer = setTimeout(() => setShowWelcome(true), 900);
      // Hold the success screen briefly before navigating.
      // If the user was mid-OAuth flow before being sent to login, bring
      // them back to the consent page instead of the default dashboard.
      const returnTo = localStorage.getItem("oauth_return_to");
      if (returnTo) {
        localStorage.removeItem("oauth_return_to");
        navTimer = setTimeout(() => router.replace(returnTo), 2500);
      } else {
        navTimer = setTimeout(() => router.replace("/dashboard"), 2500);
      }
    }, Math.max(MIN_SPINNER_MS - (Date.now() - mountedAt), MIN_SPINNER_MS));

    return () => {
      clearTimeout(timer);
      clearTimeout(welcomeTimer);
      clearTimeout(navTimer);
    };
  }, [hasTokens, access, refresh, router]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, oklch(0.62 0.22 264 / 12%) 0%, transparent 70%)",
        }}
      />

      <AnimatePresence mode="wait">
        {!hasTokens && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 text-center max-w-xs"
          >
            <div className="rounded-full border border-destructive/30 bg-destructive/10 p-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-destructive">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 7v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Authentication failed</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Missing tokens in callback URL.
              </p>
            </div>
            <a href="/login" className="text-xs text-primary hover:underline">
              Back to sign in
            </a>
          </motion.div>
        )}

        {hasTokens && !success && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-5"
          >
            <SpinnerRing />
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-muted-foreground"
            >
              Signing you in…
            </motion.p>
          </motion.div>
        )}

        {hasTokens && success && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <CheckmarkCircle />
            <AnimatePresence mode="wait">
              {!showWelcome ? (
                <motion.p
                  key="signed-in"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ delay: 0.4, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="text-sm text-muted-foreground"
                >
                  Successfully signed in
                </motion.p>
              ) : (
                <motion.p
                  key="welcome"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="text-sm text-foreground"
                >
                  Welcome back{displayName ? `, ${displayName}` : ""}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpinnerRing() {
  return (
    <div className="relative w-14 h-14">
      {/* Track */}
      <svg className="absolute inset-0" width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="3" className="text-border" />
      </svg>
      {/* Spinning arc */}
      <motion.svg
        className="absolute inset-0 text-primary"
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
      >
        <path
          d="M28 6a22 22 0 0 1 22 22"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </motion.svg>
    </div>
  );
}

// Green that reads clearly against the dark background and feels like success.
const SUCCESS_GREEN = "oklch(0.72 0.20 148)";

function CheckmarkCircle() {
  return (
    <div className="relative w-14 h-14">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        {/* Circle draws in with the primary colour, then shifts to green the
            moment the checkmark starts — so the whole icon lands on green. */}
        <motion.circle
          cx="28"
          cy="28"
          r="22"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0, stroke: "oklch(0.62 0.22 264)" }}
          animate={{ pathLength: 1, opacity: 1, stroke: SUCCESS_GREEN }}
          transition={{
            pathLength: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
            opacity:    { duration: 0.5 },
            stroke:     { delay: 0.4, duration: 0.3 },
          }}
          style={{ rotate: -90, transformOrigin: "28px 28px" }}
        />
        {/* Checkmark is green from its very first stroke. */}
        <motion.path
          d="M18 28l7 7 13-13"
          stroke={SUCCESS_GREEN}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </div>
  );
}

