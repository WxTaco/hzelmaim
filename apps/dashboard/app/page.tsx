"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden pb-16">
        {/* Background gradient — visible atmospheric bloom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(0, 164, 255, 0.18) 0%, transparent 65%)",
          }}
        />
        {/* Subtle grid texture */}
        <div className="pointer-events-none absolute inset-0 hero-grid" />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-7 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="block text-foreground">The hosting provider</span>
              <span className="block text-gradient mt-1">that explains itself.</span>
            </motion.h1>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl leading-relaxed"
            >
              Dedicated resources with published limits. Consistent pricing with
              no renewal markups. Full data ownership — always.
            </motion.p>

            {/* Stats row — builds trust BEFORE the CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-12 grid grid-cols-3 gap-x-10 gap-y-6 sm:gap-x-16"
            >
              {[
                { value: "99.9%", label: "Uptime SLA" },
                { value: "0%", label: "Hidden fees" },
                { value: "100%", label: "Data ownership" },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="stat-value text-foreground">{stat.value}</div>
                  <div className="mt-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* CTAs — clear primary vs secondary hierarchy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
            >
              <Link
                href="/login"
                className="group flex items-center gap-2.5 rounded-md bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-primary-sm"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

            </motion.div>


          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* Product Feature Highlights */}
      <section className="border-t border-border py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">What you get</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Built differently, by design
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Every policy is published. Every limit is stated upfront. No exceptions.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {[
              {
                label: "Fair Pricing",
                detail: "Same rate on renewal — no promotional bait-and-switch.",
                accent: "text-primary",
              },
              {
                label: "No Overcrowding",
                detail: "Maximum 48 VPS per physical node. Published and enforced.",
                accent: "text-primary",
              },
              {
                label: "Full Data Ownership",
                detail: "Export everything, anytime, in standard formats. No lock-in.",
                accent: "text-primary",
              },
              {
                label: "Privacy by Default",
                detail: "We collect only what's needed to run your service. Nothing sold.",
                accent: "text-primary",
              },
              {
                label: "Dedicated Resources",
                detail: "Your allocated CPU and RAM are guaranteed — not burstable marketing.",
                accent: "text-primary",
              },
              {
                label: "All Features Included",
                detail: "No paid support tiers, no optional security add-ons.",
                accent: "text-primary",
              },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: Math.min(i * 0.07, 0.28) }}
                className="rounded-lg border border-border bg-card p-6 card-hover"
              >
                <p className={`text-sm font-semibold ${f.accent}`}>{f.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.detail}</p>
              </motion.div>
            ))}
          </div>


        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-xl border border-primary/20 bg-card p-8 sm:p-12 lg:p-16 border-glow"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(0, 164, 255, 0.08) 0%, transparent 60%)",
              }}
            />
            <div className="relative flex flex-col items-center text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="lg:max-w-xl">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Start with transparency. Start with hzel.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  No hidden agendas. No surprise bills. Just reliable hosting
                  that works the way it&apos;s described.
                </p>
              </div>
              <div className="mt-8 flex flex-col items-center gap-3 lg:mt-0 lg:ml-8 lg:items-start">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2.5 rounded-md bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-primary-sm"
                >
                  Create Account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>

              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

