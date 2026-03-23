"use client"

import { cn } from "@/lib/utils"

interface SkipLinkProps {
  href?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Accessible skip link component for keyboard navigation.
 * Visually hidden until focused, then appears at the top of the viewport.
 */
export function SkipLink({
  href = "#main-content",
  className,
  children = "Skip to main content",
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-[100]",
        "focus:inline-flex focus:items-center focus:justify-center",
        "focus:rounded-md focus:bg-primary focus:px-4 focus:py-2",
        "focus:text-sm focus:font-medium focus:text-primary-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-all",
        className
      )}
    >
      {children}
    </a>
  )
}
