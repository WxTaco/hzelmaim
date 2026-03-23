import Link from "next/link"

/**
 * Custom 404 Not Found page.
 * 
 * Displays the hzel logo with a friendly error message and navigation
 * options to help users get back on track.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo with subtle glow effect */}
      <div className="relative mb-8">
        <div 
          className="absolute inset-0 blur-3xl opacity-20"
          style={{ background: "oklch(0.62 0.22 264)" }}
          aria-hidden="true"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://content.hzel.org/branding/logo.svg"
          alt="hzel logo"
          className="relative h-24 w-24"
        />
      </div>

      {/* Error code with gradient text */}
      <h1 
        className="mb-2 text-7xl font-bold tracking-tighter"
        style={{
          background: "linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.72 0.18 280))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        404
      </h1>

      {/* Error message */}
      <h2 className="mb-2 text-xl font-medium text-foreground">
        Page not found
      </h2>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* Navigation options */}
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-6 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}
