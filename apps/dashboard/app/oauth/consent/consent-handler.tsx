"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { isAuthenticated, apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const LOGO_URL =
  process.env.NEXT_PUBLIC_LOGO_URL ??
  "https://content.hzel.org/branding/logo.svg";

interface AppInfo {
  client_id: string;
  name: string;
  description: string | null;
  owner_name: string;
}

type State =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "ready"; app: AppInfo }
  | { status: "error"; message: string }
  | { status: "working" }
  | { status: "denied" };

export function ConsentHandler() {
  const params = useSearchParams();

  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";

  const [ui, setUi] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!clientId || !redirectUri || !state) {
      setUi({ status: "error", message: "Missing required parameters." });
      return;
    }

    if (!isAuthenticated()) {
      // Save the full consent URL so the callback handler can restore it after
      // the user signs in.
      localStorage.setItem("oauth_return_to", window.location.href);
      setUi({ status: "unauthenticated" });
      return;
    }

    apiFetch<{ data: AppInfo }>(
      `/api/v1/oauth/apps/public/${encodeURIComponent(clientId)}`
    )
      .then((res) => setUi({ status: "ready", app: res.data }))
      .catch((err: unknown) =>
        setUi({
          status: "error",
          message:
            err instanceof Error ? err.message : "Failed to load application.",
        })
      );
  }, [clientId, redirectUri, state]);

  async function respond(approved: boolean) {
    setUi({ status: "working" });
    try {
      const res = await apiFetch<{ data: { redirect_url: string } }>(
        "/api/v1/oauth/authorize",
        {
          method: "POST",
          body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri, state, approved }),
        }
      );
      window.location.href = res.data.redirect_url;
    } catch (err: unknown) {
      setUi({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
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
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="hzel" className="h-8 w-auto" />
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden">
          <CardBody ui={ui} onRespond={respond} />
        </div>
      </motion.div>
    </div>
  );
}


function CardBody({
  ui,
  onRespond,
}: {
  ui: State;
  onRespond: (approved: boolean) => void;
}) {
  if (ui.status === "loading" || ui.status === "working") {
    return (
      <div className="flex flex-col items-center gap-4 p-10">
        <svg className="animate-spin text-primary" width="32" height="32" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
          <path d="M20 4a16 16 0 0 1 16 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-muted-foreground">
          {ui.status === "working" ? "Authorizing…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (ui.status === "unauthenticated") {
    return (
      <div className="p-8 flex flex-col items-center gap-5 text-center">
        <div className="rounded-full border border-border bg-muted p-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Sign in required</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You need to be signed in to authorize this application.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Sign in to continue
        </a>
      </div>
    );
  }

  if (ui.status === "error") {
    return (
      <div className="p-8 flex flex-col items-center gap-5 text-center">
        <div className="rounded-full border border-destructive/30 bg-destructive/10 p-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-destructive">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1" fill="currentColor" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <p className="mt-1 text-xs text-muted-foreground">{ui.message}</p>
        </div>
      </div>
    );
  }

  if (ui.status === "denied") {
    return (
      <div className="p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Access denied. You can close this tab.</p>
      </div>
    );
  }

  const { app } = ui;
  return (
    <>
      <div className="p-6 pb-0">
        {/* App identity */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 size-10 rounded-lg bg-muted border border-border flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
              <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{app.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">by {app.owner_name}</p>
          </div>
        </div>

        {app.description && (
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{app.description}</p>
        )}

        <p className="text-xs font-medium text-foreground mb-3">This app will be able to:</p>
        <ul className="space-y-2 mb-5">
          {[
            "Read your profile (name and email)",
            "View and manage your containers",
            "Start, stop, and restart containers",
            "Execute commands and open terminals",
            "View your program memberships and permissions",
          ].map((permission) => (
            <li key={permission} className="flex items-start gap-2 text-xs text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="mt-px shrink-0 text-primary">
                <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1" />
                <path d="M3.5 6.5l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{permission}</span>
            </li>
          ))}
        </ul>

        {/* Warning callout */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 mb-5">
          <p className="text-xs text-amber-400/90 leading-relaxed">
            Only authorize apps you trust. This grants full account access — excluding audit logs and token management.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-6 pb-6">
        <Button variant="outline" className="flex-1" onClick={() => onRespond(false)}>
          Deny
        </Button>
        <Button className="flex-1" onClick={() => onRespond(true)}>
          Authorize
        </Button>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-muted/30 px-6 py-3">
        <p className="text-xs text-muted-foreground text-center">
          You can revoke this access at any time from your account settings.
        </p>
      </div>
    </>
  );
}
