import { NavBar } from "@/components/nav-bar";
import { UserMenu } from "@/components/user-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <UserMenu />
      {/* On md+ offset the content area to clear the fixed sidebar (w-56 = 224px).
          Below md the sidebar is hidden so no offset is needed. */}
      <main className="ml-0 flex-1 md:ml-56">{children}</main>
    </>
  );
}

