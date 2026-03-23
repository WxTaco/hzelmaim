"use client"

import { MobileNav } from "./mobile-nav"
import { UserMenu } from "../user-menu"

interface TopHeaderProps {
  user: {
    email: string
  } | null
}

export function TopHeader({ user }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      {/* Mobile: hamburger menu, Desktop: placeholder for breadcrumbs */}
      <div className="flex items-center gap-3">
        <MobileNav />
        <div className="hidden md:block">
          {/* Breadcrumbs or page context could go here */}
        </div>
      </div>

      {/* Right side: User menu */}
      <div className="flex items-center gap-3">
        {user && <UserMenu email={user.email} />}
      </div>
    </header>
  )
}
