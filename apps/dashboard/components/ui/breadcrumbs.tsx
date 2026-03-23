"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

/**
 * Accessible breadcrumb navigation component.
 * Helps users understand their location in the app hierarchy.
 */
export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: "Home", href: "/dashboard" }, ...items]
    : items

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const isHome = index === 0 && showHome

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="size-3.5 text-muted-foreground/50" aria-hidden="true" />
              )}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {isHome && <Home className="size-3.5" aria-hidden="true" />}
                  {!isHome && item.label}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1">
                  {isHome && <Home className="size-3.5" aria-hidden="true" />}
                  {!isHome && item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
