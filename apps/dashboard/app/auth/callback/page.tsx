import { Suspense } from "react";
import { CallbackHandler } from "./callback-handler";

export default function CallbackPage() {
  return (
    <Suspense fallback={<CallbackShell state="loading" />}>
      <CallbackHandler />
    </Suspense>
  );
}

// Minimal shell used for the Suspense fallback before search params load.
function CallbackShell({ state }: { state: "loading" }) {
  void state;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <Spinner />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin text-primary"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
    >
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
      <path
        d="M20 4a16 16 0 0 1 16 16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

