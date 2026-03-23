"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, User as UserIcon } from "lucide-react"

import { getTokenClaims } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
 * Shows the user's avatar, name, and email in a clean card layout.
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
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

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const label = profile.displayName ?? profile.email.split("@")[0]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your account information
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your profile details from your authentication provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20">
              {profile.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.pictureUrl}
                  alt={`${label}'s profile picture`}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-muted text-2xl font-medium text-foreground">
                  {initials(profile.displayName, profile.email)}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{label}</h2>
              <p className="text-sm text-muted-foreground">Member</p>
            </div>
          </div>

          {/* Info Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Display Name
                </p>
                <p className="text-sm text-foreground">
                  {profile.displayName ?? "Not set"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email Address
                </p>
                <p className="text-sm text-foreground">{profile.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
