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

/**
 * Animation easing curve for smooth, natural-feeling transitions.
 * Matches the easing used across the dashboard for visual consistency.
 */
const EASE = [0.22, 1, 0.36, 1] as const

/**
 * User profile data structure extracted from authentication token.
 * Contains display information for the user menu.
 */
interface Profile {
  /** User's display name (may be null if not provided) */
  displayName: string | null
  /** URL to user's profile picture (may be null) */
  pictureUrl: string | null
  /** User's email address (always present) */
  email: string
}

/**
 * Derives up to two uppercase initials from a display name or email.
 * Used as fallback when no profile picture is available.
 * 
 * @param displayName - User's display name (may be null)
 * @param email - User's email address as fallback
 * @returns Two-letter uppercase initials string
 * 
 * @example
 * ```ts
 * initials("John Doe", "john@example.com") // "JD"
 * initials(null, "john.doe@example.com")   // "JD"
 * initials("Alice", "alice@example.com")   // "A"
 * ```
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
 * User profile dropdown menu component.
 * Displays the current user's avatar/initials and name with expandable dropdown
 * containing profile and sign out actions.
 * 
 * Features:
 * - Automatic profile loading from JWT token claims
 * - Avatar display with fallback to initials
 * - Dropdown menu with profile and sign out actions
 * - Responsive design (name hidden on small screens)
 * - Animated entrance on mount
 * 
 * State Management:
 * - Reads authentication state from localStorage via getTokenClaims()
 * - Handles sign out by clearing tokens and redirecting to home
 * 
 * @example
 * ```tsx
 * <header>
 *   <UserMenu />
 * </header>
 * ```
 */
export function UserMenu() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()

  /**
   * Effect to load user profile from JWT token on component mount.
   * Extracts display name, picture URL, and email from token claims.
   */
  useEffect(() => {
    const claims = getTokenClaims()
    if (!claims) return
    setProfile({
      displayName: claims.display_name,
      pictureUrl: claims.picture_url,
      email: claims.email,
    })
  }, [])

  /**
   * Handles user sign out by clearing authentication tokens
   * and redirecting to the home/login page.
   */
  const handleSignOut = () => {
    clearTokens()
    router.push("/")
  }

  // Don't render if no profile is loaded (user not authenticated)
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
          aria-label="User menu"
        >
          {/* Circular avatar with ring border */}
          <div className="relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/20">
            {profile.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.pictureUrl}
                alt={`${label}'s profile picture`}
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span 
                className="flex size-full items-center justify-center bg-muted text-xs font-medium text-foreground"
                aria-hidden="true"
              >
                {initials(profile.displayName, profile.email)}
              </span>
            )}
          </div>

          {/* Display name - hidden on small screens for compact header */}
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {label}
          </span>
          <ChevronDown 
            className="hidden h-4 w-4 text-muted-foreground sm:inline" 
            aria-hidden="true"
          />
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{label}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Profile action */}
        <DropdownMenuItem className="cursor-pointer">
          <User className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Sign out action with destructive styling */}
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
