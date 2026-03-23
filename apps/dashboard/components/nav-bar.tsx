"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Boxes, ScrollText, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/contexts/sidebar-context"
import { Button } from "@/components/ui/button"

/**
 * Animation easing curve matching the login page for seamless visual transitions.
 * Uses a custom cubic-bezier curve for smooth, natural-feeling animations.
 */
const EASE = [0.22, 1, 0.36, 1] as const

/**
 * URL for the application wordmark/logo displayed in the sidebar header.
 * Configurable via NEXT_PUBLIC_WORDMARK_URL environment variable.
 */
const WORDMARK_URL = process.env.NEXT_PUBLIC_WORDMARK_URL ?? "https://content.hzel.org/branding/wordmark.svg"

/**
 * Navigation item configuration type.
 * Defines the structure for sidebar navigation links.
 */
interface NavItem {
  /** Display label for the navigation link */
  label: string
  /** Route path the link navigates to */
  href: string
  /** Lucide icon component to display alongside the label */
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Array of navigation items displayed in the sidebar.
 * Each item includes a label, href, and icon for consistent navigation UX.
 */
const NAV_ITEMS: readonly NavItem[] = [
  { label: "Containers", href: "/dashboard", icon: Boxes },
  { label: "Logs", href: "/dashboard/logs", icon: ScrollText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const

/**
 * Determines if a navigation item should be marked as active based on current pathname.
 * Handles special cases for the root dashboard path to avoid greedy matching.
 * 
 * @param href - The navigation item's href to check
 * @param pathname - The current route pathname
 * @returns True if the item should be highlighted as active
 */
function isItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname === "/dashboard/containers" ||
      pathname.startsWith("/dashboard/containers/")
    )
  }
  return pathname === href || pathname.startsWith(href + "/")
}

/**
 * Individual navigation link component with active state indicator.
 * Renders an animated link with icon, label, and sliding active bar.
 * 
 * @param props - Component props
 * @param props.item - Navigation item configuration
 * @param props.isActive - Whether this item is currently active
 * @param props.index - Item index for staggered animation delay
 * @param props.onClick - Optional click handler (used for closing mobile sidebar)
 */
interface NavLinkProps {
  item: NavItem
  isActive: boolean
  index: number
  onClick?: () => void
}

function NavLink({ item, isActive, index, onClick }: NavLinkProps) {
  const Icon = item.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.15 + index * 0.055,
        duration: 0.4,
        ease: EASE,
      }}
    >
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {/* Animated sliding active indicator bar */}
        {isActive && (
          <motion.span
            layoutId="nav-active-bar"
            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
            transition={{ duration: 0.2, ease: EASE }}
          />
        )}
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {item.label}
      </Link>
    </motion.div>
  )
}

/**
 * Sidebar header component displaying the application wordmark.
 * Includes close button on mobile for dismissing the sidebar drawer.
 * 
 * @param props - Component props
 * @param props.showCloseButton - Whether to show the close button (mobile only)
 * @param props.onClose - Handler for close button click
 */
interface SidebarHeaderProps {
  showCloseButton?: boolean
  onClose?: () => void
}

function SidebarHeader({ showCloseButton, onClose }: SidebarHeaderProps) {
  return (
    <motion.div
      className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={WORDMARK_URL} alt="hzel" className="h-7 w-auto" />
      
      {showCloseButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-8"
          aria-label="Close navigation menu"
        >
          <X className="size-4" />
        </Button>
      )}
    </motion.div>
  )
}

/**
 * Navigation list component rendering all nav items.
 * Handles active state detection and click events for mobile dismissal.
 * 
 * @param props - Component props
 * @param props.onItemClick - Optional handler called when any nav item is clicked
 */
interface NavListProps {
  onItemClick?: () => void
}

function NavList({ onItemClick }: NavListProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item, index) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={isItemActive(item.href, pathname)}
          index={index}
          onClick={onItemClick}
        />
      ))}
    </nav>
  )
}

/**
 * Desktop sidebar navigation component.
 * Fixed position sidebar visible on medium screens and above (md breakpoint).
 * Contains the application wordmark and main navigation links.
 * 
 * Features:
 * - Smooth entrance animations on mount
 * - Active state indicator with shared layoutId for smooth transitions
 * - Responsive visibility (hidden on mobile, shown on desktop)
 * 
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <NavBar />
 *   <main>Content</main>
 * </SidebarProvider>
 * ```
 */
export function NavBar() {
  return (
    <motion.aside
      className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col border-r border-border bg-background md:flex"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      role="complementary"
      aria-label="Sidebar navigation"
    >
      <SidebarHeader />
      <NavList />
    </motion.aside>
  )
}

/**
 * Mobile sidebar drawer component.
 * Slides in from the left on mobile devices when the hamburger menu is triggered.
 * Includes backdrop overlay and close button for dismissal.
 * 
 * Features:
 * - Animated slide-in/out with backdrop overlay
 * - Click-outside to close via backdrop
 * - Auto-closes when navigating to a new route
 * - Accessible with proper ARIA labels
 * 
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <MobileSidebar />
 *   <TopHeader />
 * </SidebarProvider>
 * ```
 */
export function MobileSidebar() {
  const { isOpen, close, isMobile } = useSidebar()

  // Only render on mobile viewports
  if (!isMobile) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-hidden="true"
          />

          {/* Sidebar drawer */}
          <motion.aside
            className="fixed left-0 top-0 z-50 h-screen w-64 flex-col border-r border-border bg-background md:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <SidebarHeader showCloseButton onClose={close} />
            <NavList onItemClick={close} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
