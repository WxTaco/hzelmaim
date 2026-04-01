"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LOGO_URL =
  process.env.NEXT_PUBLIC_LOGO_URL ??
  "https://content.hzel.org/branding/logo.svg";



export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-md transition-all duration-300 ${
          scrolled
            ? "border-border/80 nav-scrolled"
            : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="hzel" className="h-7 w-auto" />
            <span className="text-base font-semibold tracking-tight">hzel</span>
          </Link>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/learn"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Learn
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="group flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-primary-sm"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {/* Brand column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO_URL} alt="hzel" className="h-5 w-auto opacity-70" />
                <span className="text-sm font-semibold">hzel</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Transparent, user-first hosting. No hidden costs, no overcrowding,
                no surprises.
              </p>
            </div>

            {/* Legal / misc column — PLACEHOLDER */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Company
              </p>
              <div className="flex flex-col gap-2">
                {/* PLACEHOLDER: Add real links when pages exist */}
                <Link href="/learn" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Learn</Link>
                <span className="text-sm text-muted-foreground/40 italic">About</span>
                <span className="text-sm text-muted-foreground/40 italic">Privacy Policy</span>
                <span className="text-sm text-muted-foreground/40 italic">Terms of Service</span>
                <span className="text-sm text-muted-foreground/40 italic">Contact</span>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} hzel. All rights reserved.
            </p>
            {/* PLACEHOLDER: social icon links */}
            <p className="text-xs text-muted-foreground italic">[Social links]</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
