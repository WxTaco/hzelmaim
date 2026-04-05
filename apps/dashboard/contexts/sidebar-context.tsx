"use client"

import * as React from "react"

/**
 * Possible states for the sidebar visibility on mobile devices.
 * @typedef {'open' | 'closed'} SidebarState
 */
type SidebarState = "open" | "closed"

/**
 * Context value shape for sidebar state management.
 * Provides state and methods to control sidebar visibility across the application.
 */
interface SidebarContextValue {
  /** Current sidebar state - 'open' or 'closed' */
  state: SidebarState
  /** Whether the sidebar is currently open */
  isOpen: boolean
  /** Opens the sidebar */
  open: () => void
  /** Closes the sidebar */
  close: () => void
  /** Toggles the sidebar open/closed state */
  toggle: () => void
  /** Whether the current viewport is mobile-sized */
  isMobile: boolean
}

/**
 * React context for managing sidebar visibility state.
 * Used by NavBar, TopHeader, and MobileNav to coordinate sidebar behavior.
 * @internal
 */
const SidebarContext = React.createContext<SidebarContextValue | null>(null)

/**
 * Breakpoint width (in pixels) below which the layout is considered mobile.
 * Matches Tailwind's `md` breakpoint (768px).
 */
const MOBILE_BREAKPOINT = 768

/**
 * Provider component that manages sidebar state and responsive behavior.
 * Wraps the dashboard layout to provide sidebar state to all child components.
 * 
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <NavBar />
 *   <TopHeader />
 *   <main>{children}</main>
 * </SidebarProvider>
 * ```
 * 
 * @param props - Component props
 * @param props.children - Child components that need sidebar state access
 * @param props.defaultOpen - Initial open state (defaults to false on mobile)
 */
interface SidebarProviderProps {
  children: React.ReactNode
  /** Initial sidebar open state. Defaults to false. */
  defaultOpen?: boolean
}

export function SidebarProvider({ 
  children, 
  defaultOpen = false 
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [isMobile, setIsMobile] = React.useState(false)

  /**
   * Effect to detect mobile viewport and handle responsive sidebar behavior.
   * Sets up a resize listener to track viewport changes and auto-close
   * the sidebar when transitioning to mobile.
   */
  React.useEffect(() => {
    // Check initial viewport size (no auto-close here — that's the resize handler's job)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Initial check
    checkMobile()

    // Listen for resize events with debouncing via matchMedia
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      // Auto-close sidebar when the viewport shrinks into mobile
      if (e.matches) {
        setIsOpen(false)
      }
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  /**
   * Opens the sidebar (mobile drawer or desktop sidebar).
   */
  const open = React.useCallback(() => setIsOpen(true), [])

  /**
   * Closes the sidebar.
   */
  const close = React.useCallback(() => setIsOpen(false), [])

  /**
   * Toggles the sidebar between open and closed states.
   */
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])

  /**
   * Memoized context value to prevent unnecessary re-renders.
   */
  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: isOpen ? "open" : "closed",
      isOpen,
      open,
      close,
      toggle,
      isMobile,
    }),
    [isOpen, open, close, toggle, isMobile]
  )

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

/**
 * Hook to access sidebar state and controls from any component within the provider.
 * Throws an error if used outside of a SidebarProvider.
 * 
 * @example
 * ```tsx
 * function MenuButton() {
 *   const { toggle, isOpen } = useSidebar()
 *   return (
 *     <button onClick={toggle}>
 *       {isOpen ? 'Close' : 'Open'} Menu
 *     </button>
 *   )
 * }
 * ```
 * 
 * @returns Sidebar context value with state and control methods
 * @throws Error if used outside of SidebarProvider
 */
export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}
