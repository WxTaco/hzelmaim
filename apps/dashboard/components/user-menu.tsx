"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { LogOut, User, ChevronDown } from "lucide-react"

import { getTokenClaims, clearTokens } from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const EASE = [0.22, 1, 0.36, 1] as const

interface Profile {
  displayName: string | null
  pictureUrl: string | null
  email: string
}

interface UserMenuProps {
  email?: string
}

/** Derives up to two uppercase initials from a display name or email. */
function initials(displayName: string | null, email: string): string {
  const source = displayName ?? email.split("@")[0]
  return source
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserMenu({ email: propEmail }: UserMenuProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()

  useEffect(() => {
    const claims = getTokenClaims()
    if (!claims) return
    setProfile({
      displayName: claims.display_name,
      pictureUrl: claims.picture_url,
      email: claims.email,
    })
  }, [])

  const handleSignOut = () => {
    clearTokens()
    router.push("/")
  }

  if (!profile) return null

  const label = profile.displayName ?? profile.email.split("@")[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
        >
          {/* Circular avatar with ring */}
          <div className="relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/20">
            {profile.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.pictureUrl}
                alt={label}
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-muted text-xs font-medium text-foreground">
                {initials(profile.displayName, profile.email)}
              </span>
            )}
          </div>

          {/* Display name - hidden on small screens */}
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {label}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:inline" />
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{label}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
