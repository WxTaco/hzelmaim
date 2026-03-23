import { NavBar } from "@/components/nav-bar"
import { TopHeader } from "@/components/layout/top-header"
import { cookies } from "next/headers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Note: In a real app, you'd get the user from session/auth
  // For now we pass null and let the UserMenu handle client-side token reading
  const user = null

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - hidden on mobile */}
      <NavBar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:ml-56">
        {/* Sticky top header with mobile hamburger and user menu */}
        <TopHeader user={user} />

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
