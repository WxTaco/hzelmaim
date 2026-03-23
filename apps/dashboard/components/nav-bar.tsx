"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Boxes, ScrollText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Match the easing used on the login page for a seamless transition feel.
const EASE = [0.22, 1, 0.36, 1] as const;

const WORDMARK_URL = process.env.NEXT_PUBLIC_WORDMARK_URL ?? "https://content.hzel.org/branding/wordmark.svg";

const NAV_ITEMS = [
  { label: "Containers", href: "/dashboard", icon: Boxes },
  { label: "Logs", href: "/dashboard/logs", icon: ScrollText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

function isItemActive(href: string, pathname: string): boolean {
  // The root dashboard path maps to Containers; avoid it greedily matching
  // every sub-route by only accepting an exact hit or /dashboard/containers/*.
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname === "/dashboard/containers" ||
      pathname.startsWith("/dashboard/containers/")
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <motion.aside
      className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col border-r border-border bg-background md:flex"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {/* Wordmark (includes logo) */}
      <motion.div
        className="flex h-14 shrink-0 items-center border-b border-border px-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={WORDMARK_URL} alt="hzel" className="h-7 w-auto" />
      </motion.div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon }, i) => {
          const active = isItemActive(href, pathname);

          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15 + i * 0.055,
                duration: 0.4,
                ease: EASE,
              }}
            >
              <Link
                href={href}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {/* Sliding active indicator bar */}
                {active && (
                  <motion.span
                    layoutId="nav-active-bar"
                    className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                    transition={{ duration: 0.2, ease: EASE }}
                  />
                )}
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </motion.aside>
  );
}

