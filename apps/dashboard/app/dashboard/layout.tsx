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
      {/* Offset the content area to clear the fixed sidebar (w-56 = 224px). */}
      <main className="ml-56 flex-1">{children}</main>
    </>
  );
}

