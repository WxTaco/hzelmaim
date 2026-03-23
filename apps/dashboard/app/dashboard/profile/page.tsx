"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Mail, 
  User as UserIcon, 
  Shield, 
  Calendar,
  Copy,
  Check
} from "lucide-react"

import { getTokenClaims } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

/**
 * User profile data structure.
 */
interface Profile {
  displayName: string | null
  pictureUrl: string | null
  email: string
}

/**
 * Derives initials from display name or email.
 */
function initials(displayName: string | null, email: string): string {
  const source = displayName ?? email.split("@")[0]
  return source
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Profile page component displaying user account information.
 * Shows the user's avatar, name, and email in a modern, polished layout.
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const claims = getTokenClaims()
    if (!claims) {
      router.push("/")
      return
    }
    setProfile({
      displayName: claims.display_name,
      pictureUrl: claims.picture_url,
      email: claims.email,
    })
  }, [router])

  const copyEmail = async () => {
    if (!profile) return
    await navigator.clipboard.writeText(profile.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const label = profile.displayName ?? profile.email.split("@")[0]

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Go back"
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            View your account information
          </p>
        </div>
      </div>

      {/* Hero Profile Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {/* Gradient Background */}
        <div className="absolute inset-0 h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        
        <div className="relative px-6 pb-6 pt-16 sm:px-8">
          {/* Avatar */}
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <div className="relative -mt-12 sm:-mt-8">
              <div className="size-28 overflow-hidden rounded-2xl border-4 border-card bg-card shadow-xl ring-1 ring-border/50 sm:size-32">
                {profile.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.pictureUrl}
                    alt={`${label}'s profile picture`}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10 text-4xl font-semibold text-foreground">
                    {initials(profile.displayName, profile.email)}
                  </span>
                )}
              </div>
              {/* Online Status Indicator */}
              <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-[oklch(0.72_0.20_160)]">
                <Check className="size-3.5 text-white" />
              </div>
            </div>

            {/* Name and Role */}
            <div className="mt-4 text-center sm:mt-0 sm:pb-1 sm:text-left">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                {label}
              </h2>
              <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
                <Shield className="size-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Authenticated User
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Account Details
          </h3>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-3">
          {/* Display Name Field */}
          <div className="group rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-card">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Display Name
                </p>
                <p className="mt-1 truncate text-base font-medium text-foreground">
                  {profile.displayName ?? (
                    <span className="italic text-muted-foreground">Not set</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Email Field */}
          <div className="group rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-card">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email Address
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="truncate text-base font-medium text-foreground">
                    {profile.email}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={copyEmail}
                    aria-label="Copy email address"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-[oklch(0.72_0.20_160)]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Status Field */}
          <div className="group rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-card">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.72_0.20_160)]/10 text-[oklch(0.72_0.20_160)]">
                <Shield className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Account Status
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-base font-medium text-[oklch(0.72_0.20_160)]">
                    <span className="size-2 animate-pulse rounded-full bg-[oklch(0.72_0.20_160)]" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Member Since Field */}
          <div className="group rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-card">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Calendar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Member Since
                </p>
                <p className="mt-1 text-base font-medium text-foreground">
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Security
          </h3>
          <Separator className="flex-1" />
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">
                Secure Authentication
              </h4>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your account is protected via your identity provider
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
