"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { X, Check, ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

const myths = [
  {
    myth: "More expensive hosting is always better quality",
    reality:
      "Price often reflects marketing budgets, not infrastructure quality. Many premium providers use the same underlying hardware as budget options but charge more for brand recognition. What matters is the actual resource allocation, support quality, and transparency—not the price tag.",
    takeaway:
      "Compare actual specs and user reviews, not just prices and brand names.",
  },
  {
    myth: "'Unlimited' bandwidth and storage is actually unlimited",
    reality:
      "There's no such thing as truly unlimited resources. These plans always have 'fair use' policies buried in the terms of service. Once you exceed unspecified thresholds, providers can throttle, suspend, or charge overage fees. Honest providers give you clear, guaranteed allocations instead.",
    takeaway:
      "Look for providers with clearly defined resource limits—they're being honest.",
  },
  {
    myth: "You need enterprise hosting for a small business website",
    reality:
      "Most small to medium websites perform perfectly on entry-level VPS plans. A well-optimized WordPress site can serve thousands of daily visitors on 2GB of RAM. Start small, monitor your actual usage, and scale only when real metrics justify it.",
    takeaway:
      "Start with modest resources and scale based on actual data, not fear.",
  },
  {
    myth: "All VPS providers deliver the same performance for the same specs",
    reality:
      "A '4 CPU / 8GB RAM' VPS can perform drastically differently between providers. Overcrowded nodes, outdated hardware, poor network infrastructure, and 'burstable' vs 'dedicated' resources all impact real-world performance. Identical specs don't guarantee identical experiences.",
    takeaway:
      "Test actual performance with benchmarks, not just spec sheets.",
  },
  {
    myth: "Your data is automatically safe because it's 'in the cloud'",
    reality:
      "Cloud providers are responsible for infrastructure, but you're responsible for your data. Servers can fail, providers can go bankrupt, and accounts can be suspended. Without your own backup strategy and data portability plan, you're at risk of losing everything.",
    takeaway:
      "Always maintain your own backups and ensure you can export your data.",
  },
  {
    myth: "Managed hosting means you don't need to understand anything",
    reality:
      "While managed services handle server maintenance, you still benefit from understanding basics like resource usage, security practices, and how your applications work. This knowledge helps you make better decisions, troubleshoot issues faster, and avoid being upsold on services you don't need.",
    takeaway:
      "Basic hosting knowledge protects you from bad advice and unnecessary costs.",
  },
  {
    myth: "Promotional pricing reflects the actual value",
    reality:
      "The $3.99/month price is just the hook. Real costs emerge on renewal—often 3-4x higher. Calculate based on regular pricing, not promotions. A provider charging $10/month consistently is often cheaper long-term than one charging $4/month initially then $15/month after.",
    takeaway: "Always check renewal rates before committing to a provider.",
  },
  {
    myth: "More data centers means better performance for you",
    reality:
      "Having 50 data centers worldwide doesn't help if none are near your users. What matters is having the right location(s) for your audience. A provider with 3 well-placed data centers may serve you better than one with 30 in locations you don't need.",
    takeaway:
      "Choose data center locations based on where your users actually are.",
  },
];

export default function MythsPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 lg:py-32">
        {/* Background gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0, 164, 255, 0.06) 0%, transparent 60%)",
          }}
        />
        
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Debunked</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Myth vs Reality
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              Common misconceptions about web hosting that providers often exploit—and the truth behind them.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Myths List */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {myths.map((item, index) => (
              <MythCard
                key={index}
                myth={item.myth}
                reality={item.reality}
                takeaway={item.takeaway}
                delay={Math.min(index * 0.05, 0.3)}
                index={index + 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Summary Section */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-lg border border-border bg-card p-8 sm:p-10 lg:p-12"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Summary</p>
            <h2 className="mt-3 text-xl font-semibold sm:text-2xl">
              The Bottom Line
            </h2>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground sm:text-base leading-relaxed">
              <p>
                The hosting industry relies on information asymmetry—providers
                know more than customers, and some exploit this gap. By
                understanding these common misconceptions, you can:
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Make purchasing decisions based on facts, not fear",
                  "Recognize marketing tactics that don't serve your interests",
                  "Choose providers based on transparency and actual value",
                  "Protect yourself with proper backups and data ownership",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-between gap-8 rounded-lg border border-border bg-card p-8 sm:flex-row sm:p-10 lg:p-12"
          >
            <div>
              <h3 className="text-xl font-semibold sm:text-2xl">
                See how we do things differently
              </h3>
              <p className="mt-2 text-muted-foreground">
                Explore our commitment to transparent, user-first hosting.
              </p>
            </div>
            <Link
              href="/features"
              className="group inline-flex items-center gap-2.5 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              View Features
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

function MythCard({
  myth,
  reality,
  takeaway,
  delay,
  index,
}: {
  myth: string;
  reality: string;
  takeaway: string;
  delay: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      {/* Myth */}
      <div className="flex items-start gap-4 border-b border-border p-5 sm:p-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10">
          <X className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-destructive">
              Myth #{index}
            </span>
          </div>
          <p className="mt-1.5 font-medium text-foreground">
            {myth}
          </p>
        </div>
      </div>
      {/* Reality */}
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Check className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Reality
          </span>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {reality}
          </p>
          <div className="mt-4 rounded-md bg-accent p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Takeaway:</span>{" "}
              {takeaway}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
