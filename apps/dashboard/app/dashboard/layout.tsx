import { NavBar, MobileSidebar } from "@/components/nav-bar"
import { TopHeader } from "@/components/layout/top-header"
import { SidebarProvider } from "@/contexts/sidebar-context"

/**
 * Props for the DashboardLayout component.
 */
interface DashboardLayoutProps {
  /** Child page content to render in the main content area */
  children: React.ReactNode
}

/**
 * Root layout component for all dashboard pages.
 * Provides the consistent navigation structure including sidebar, top header,
 * and mobile navigation drawer.
 * 
 * Layout Structure:
 * ```
 * +------------------+------------------------+
 * |                  |     TopHeader          |
 * |    NavBar        +------------------------+
 * |   (Desktop)      |                        |
 * |                  |    Main Content        |
 * |                  |     (children)         |
 * +------------------+------------------------+
 * ```
 * 
 * Responsive Behavior:
 * - Desktop (md+): Fixed sidebar on left, content offset by sidebar width
 * - Mobile: Sidebar hidden, hamburger menu in header triggers drawer
 * 
 * Context Providers:
 * - SidebarProvider: Manages sidebar open/close state across components
 * 
 * @param props - Component props
 * @param props.children - Page content to render in the main area
 * 
 * @example
 * ```tsx
 * // In app/dashboard/page.tsx
 * export default function DashboardPage() {
 *   return <div>Dashboard content here</div>
 * }
 * // Layout automatically wraps this with navigation
 * ```
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar - fixed position, hidden on mobile */}
        <NavBar />

        {/* Mobile sidebar drawer - only renders on mobile viewports */}
        <MobileSidebar />

        {/* Main content area - offset on desktop to account for sidebar */}
        <div className="flex flex-1 flex-col md:ml-56">
          {/* Sticky top header with hamburger menu (mobile) and user menu */}
          <TopHeader />

          {/* Page content with scrollable overflow */}
          <main className="flex-1 overflow-auto" role="main">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
