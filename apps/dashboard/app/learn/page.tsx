"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Data ────────────────────────────────────────────────────────────────────

const PITFALLS = [
  {
    id: "pricing",
    number: "01",
    label: "PITFALL 01 · PRICING",
    heading: "The Discount That Expires with Your Trust",
    body: "Introductory rates as low as 80–96% off are not generosity — they are a calculated bet that most customers will stay past the renewal deadline rather than endure the friction of switching. The actual business model is the renewal price.",
    callout: [
      "Promotional rates can be 3–8× lower than the renewal price billed automatically after month one or year one.",
      "Cancellation is intentionally friction-heavy: phone-only queues, business-hours-only support, and multi-step retention flows.",
      "Auto-renewal language is buried in terms of service, not the checkout page.",
    ],
    mythLabel: "Industry Claim",
    mythQuote: '"Get started for just $1.99 / month"',
    mythDetail: "Then: $15.99 / mo at renewal — an 8× jump, billed automatically.",
    realityLabel: "hzel Reality",
    realityStatement: "One price. Forever.",
    realityDetail: "The rate you see today is the rate on your invoice next year. No introductory period. No renewal surprise.",
    extra: "pricing-table",
  },
  {
    id: "overcrowding",
    number: "02",
    label: "PITFALL 02 · INFRASTRUCTURE",
    heading: "Your Neighbor's Traffic Spike Is Your Problem",
    body: "Overselling is the practice of provisioning more virtual machines than a physical node's hardware can actually support simultaneously. It works on averages — most tenants are idle most of the time — until they are not.",
    callout: [
      "Providers routinely sell 150–300% of physical node capacity, relying on low average utilization.",
      "SLA uptime clauses cover availability, not performance. A throttled server is technically \u201cup\u201d.",
      "Peak hours — when your users need you most — are exactly when oversold nodes degrade.",
    ],
    mythLabel: "Industry Claim",
    mythQuote: '"Guaranteed 99.9% uptime SLA"',
    mythDetail: "Uptime ≠ performance. A slow, throttled server satisfies the SLA.",
    realityLabel: "hzel Reality",
    realityStatement: "Maximum 48 VPS per physical node. Published and enforced.",
    realityDetail: "We set our density limit conservatively and document it. You can hold us to it.",
    extra: "density-grid",
  },
  {
    id: "resources",
    number: "03",
    label: "PITFALL 03 · RESOURCES",
    heading: "The CPU You Have vs. the CPU You're Allowed to Borrow",
    body: '"Burstable" means you receive your advertised resources only when the host has spare capacity sitting idle. Under sustained load — a deploy, a traffic spike, a batch job — burstable allocations are throttled to a fraction of the marketed spec.',
    callout: [
      "Marketing specs list the burst ceiling. The sustainable baseline is a fraction of that — sometimes as low as 10%.",
      "Throttling is silent: your process slows down with no warning, no alert, no log entry.",
      "Benchmark results in hosting reviews are almost always measured in burst conditions, not sustained load.",
    ],
    mythLabel: "Industry Claim",
    mythQuote: '"4 vCPU / 8 GB RAM"',
    mythDetail: "Burstable. Baseline: ~0.5 vCPU sustained. Throttled silently under load.",
    realityLabel: "hzel Reality",
    realityStatement: "When we say 2 vCPU, we mean 2 vCPU.",
    realityDetail: "Dedicated allocation. No burst ceiling. No throttle cliff. The number in your plan is the number available to your process at 3 AM on a Monday and at 3 PM on a Friday.",
    extra: "resource-bar",
  },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function MythCard({ quote, detail }: { quote: string; detail: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Industry Claim
        </span>
      </div>
      <p className="font-medium italic text-foreground">{quote}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function RealityCard({ statement, detail }: { statement: string; detail: string }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          hzel Reality
        </span>
      </div>
      <p className="font-semibold text-foreground">{statement}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function PricingTable() {
  const rows = [
    { label: "Month 1", competitor: "$1.99", hzel: "$X.XX" },
    { label: "Month 13", competitor: "$15.99", hzel: "$X.XX" },
    { label: "Month 25", competitor: "$15.99", hzel: "$X.XX" },
    { label: "2-yr difference", competitor: "+$167.52", hzel: "$0.00", highlight: true },
  ];
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="py-2.5 pl-4 text-left text-xs font-semibold text-muted-foreground">Period</th>
            <th className="py-2.5 px-4 text-right text-xs font-semibold text-amber-400">Typical Provider</th>
            <th className="py-2.5 pr-4 text-right text-xs font-semibold text-primary">hzel</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={`border-b border-border last:border-0 ${r.highlight ? "bg-primary/5" : ""}`}>
              <td className="py-2.5 pl-4 text-muted-foreground">{r.label}</td>
              <td className={`py-2.5 px-4 text-right font-mono ${r.highlight ? "text-amber-400 font-semibold" : "text-foreground"}`}>{r.competitor}</td>
              <td className={`py-2.5 pr-4 text-right font-mono ${r.highlight ? "text-primary font-semibold" : "text-foreground"}`}>{r.hzel}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs italic text-muted-foreground/60">
        Illustrative comparison based on publicly observed renewal rates. hzel pricing shown at list rate.
      </p>
    </div>
  );
}

function DensityGrid() {
  const total = 30;
  const filledA = 26;
  const filledB = 12;
  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      {[
        { title: "Industry Standard", filled: filledA, color: "bg-amber-500/60" },
        { title: "hzel", filled: filledB, color: "bg-primary/70" },
      ].map(({ title, filled, color }) => (
        <div key={title} className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">{title}</p>
          <div className="grid grid-cols-6 gap-1 justify-items-center">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-sm transition-colors ${i < filled ? color : "bg-border/40"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {filled}/{total} slots used
          </p>
        </div>
      ))}
    </div>
  );
}

function ResourceBar() {
  return (
    <div className="mt-4 space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">CPU allocation over time</p>
      {[
        { label: "Burstable (typical)", segments: [100, 100, 30, 12, 12, 12, 12, 12], color: "bg-amber-500/70" },
        { label: "hzel Dedicated", segments: [70, 70, 70, 70, 70, 70, 70, 70], color: "bg-primary/70" },
      ].map(({ label, segments, color }) => (
        <div key={label}>
          <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
          <div className="flex h-5 items-end gap-0.5 overflow-hidden rounded">
            {segments.map((pct, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${color}`}
                style={{ height: `${pct}%` }}
              />
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs italic text-muted-foreground/60">Stylised representation. Burstable allocations throttle silently under sustained load.</p>
    </div>
  );
}

function PitfallExtra({ type }: { type: string }) {
  if (type === "pricing-table") return <PricingTable />;
  if (type === "density-grid") return <DensityGrid />;
  if (type === "resource-bar") return <ResourceBar />;
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeTab, setActiveTab] = useState<string>("pricing");

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    PITFALLS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveTab(id); },
        { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function scrollTo(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <PublicLayout>
      {/* ── § 1 Hero ──────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden pb-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(0,164,255,0.15) 0%, transparent 65%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 hero-grid" />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="inline-block rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
            >
              Industry Transparency Report
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
              className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="block text-foreground">The Hosting</span>
              <span className="block text-gradient mt-1">Playbook</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
              className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              A plain-language guide to the pricing tricks, infrastructure shortcuts,
              and resource deceptions quietly costing you money — and what we do instead.
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
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

      {/* ── § 2 Pitfall Navigator (sticky tab bar) ──────────────────────── */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PITFALLS.map(({ id, number, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
                  activeTab === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {number} · {label.split("·")[1].trim()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── § 3 Pitfall Sections ────────────────────────────────────────── */}
      {PITFALLS.map((p, pitfallIndex) => (
        <section
          key={p.id}
          id={p.id}
          ref={(el) => { sectionRefs.current[p.id] = el; }}
          className="border-t border-border py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className={`flex flex-col gap-12 lg:gap-16 ${pitfallIndex % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"}`}>

              {/* Left: text column */}
              <div className="flex-1 min-w-0">
                <motion.p
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="text-xs font-semibold uppercase tracking-widest text-primary"
                >
                  {p.label}
                </motion.p>

                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: 0.07, ease: EASE }}
                  className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  {p.heading}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
                  className="mt-4 text-base leading-relaxed text-muted-foreground"
                >
                  {p.body}
                </motion.p>

                {/* Callout box */}
                <motion.aside
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
                  className="mt-6 rounded-lg border border-border bg-muted/30 p-5"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    What&apos;s actually happening
                  </p>
                  <ul className="space-y-2.5">
                    {p.callout.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 translate-y-1.5 rounded-full bg-primary/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.aside>
              </div>

              {/* Right: myth/reality cards */}
              <div className="flex w-full flex-col gap-4 lg:w-[42%] lg:shrink-0">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                >
                  <MythCard quote={p.mythQuote} detail={p.mythDetail} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.5, delay: 0.28, ease: EASE }}
                >
                  <RealityCard statement={p.realityStatement} detail={p.realityDetail} />
                </motion.div>

                {/* CSS visual diagram */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: 0.38, ease: EASE }}
                >
                  <PitfallExtra type={p.extra} />
                </motion.div>
              </div>

            </div>
          </div>
        </section>
      ))}

      {/* ── § 4 Reality Check Strip ─────────────────────────────────────── */}
      <section className="border-t border-b border-border bg-card py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">The Complete Picture</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              What they say vs. what you actually get
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
            className="mt-10 overflow-hidden rounded-xl border border-border"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-3 pl-5 text-left text-xs font-semibold text-muted-foreground">Topic</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-amber-400">
                    <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Typical Provider</span>
                  </th>
                  <th className="py-3 pr-5 text-left text-xs font-semibold text-primary">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />hzel</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Pricing", "Promotional rate, then 3–8× at renewal", "One flat rate. No renewal markup."],
                  ["Node density", "150–300% oversold — no published limit", "Max 48 VPS per node. Published."],
                  ["CPU / RAM", "Burstable — throttled under sustained load", "Dedicated allocation. Guaranteed."],
                  ["Transparency", "Fine print, asterisks, and addenda", "Published limits, plain-language docs."],
                  ["Cancellation", "Phone queues, retention flows, delays", "Self-serve. Instant. No holds."],
                ].map(([topic, bad, good], i) => (
                  <tr
                    key={topic}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-background/40" : ""}`}
                  >
                    <td className="py-3.5 pl-5 font-medium text-foreground">{topic}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{bad}</td>
                    <td className="py-3.5 pr-5 text-foreground">{good}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ── § 5 CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative overflow-hidden rounded-xl border border-primary/20 bg-card p-8 sm:p-12 lg:p-16 border-glow"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(0,164,255,0.08) 0%, transparent 60%)",
              }}
            />
            <div className="relative flex flex-col items-center text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="lg:max-w-xl">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  You deserve a host that&apos;s straightforward.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  No hidden agendas. No surprise bills. One price, published limits, and
                  resources that mean what they say.
                </p>
              </div>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:mt-0 lg:ml-8 lg:items-start">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2.5 rounded-md bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-primary-sm"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
