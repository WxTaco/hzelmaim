import { Suspense } from "react";
import { ConsentHandler } from "./consent-handler";

export default function ConsentPage() {
  return (
    <Suspense fallback={<ConsentShell />}>
      <ConsentHandler />
    </Suspense>
  );
}

function ConsentShell() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="animate-spin text-primary"
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
        >
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="currentColor"
            strokeWidth="3"
            strokeOpacity="0.15"
          />
          <path
            d="M20 4a16 16 0 0 1 16 16"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
