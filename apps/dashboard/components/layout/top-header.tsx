"use client"

import { Menu } from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"
import { UserMenu } from "../user-menu"
import { Button } from "@/components/ui/button"

/**
 * Sticky top header bar displayed across the main content area.
 * Contains the mobile hamburger menu trigger and user menu dropdown.
 * 
 * Layout structure:
 * - Left side: Mobile hamburger button (hidden on desktop)
 * - Right side: User profile dropdown menu
 * 
 * Features:
 * - Sticky positioning for always-visible navigation access
 * - Backdrop blur effect for visual depth
 * - Integrates with SidebarContext for mobile drawer control
 * - Responsive design adapting to viewport size
 * 
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <NavBar />
 *   <div className="flex flex-col">
 *     <TopHeader />
 *     <main>{children}</main>
 *   </div>
 * </SidebarProvider>
 * ```
 */
export function TopHeader() {
  const { toggle, isMobile } = useSidebar()

  return (
    <header 
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6"
      role="banner"
    >
      {/* Left section: Mobile hamburger menu */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="size-9"
            aria-label="Open navigation menu"
            aria-expanded={false}
            aria-controls="mobile-sidebar"
          >
            <Menu className="size-5" />
          </Button>
        )}
        
        {/* Desktop: Placeholder for breadcrumbs or page context */}
        {!isMobile && (
          <div className="hidden md:block">
            {/* Future: Breadcrumb navigation could be added here */}
          </div>
        )}
      </div>

      {/* Right section: User menu dropdown */}
      <div className="flex items-center gap-3">
        <UserMenu />
      </div>
    </header>
  )
}
