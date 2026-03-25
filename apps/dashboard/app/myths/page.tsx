"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { HelpCircle, X, Check, ArrowRight } from "lucide-react";
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
      <section className="border-b border-border/50 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Myth vs Reality
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Let&apos;s clear up some common misconceptions about web hosting
              that providers often exploit.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Myths List */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="space-y-4 sm:space-y-6">
            {myths.map((item, index) => (
              <MythCard
                key={index}
                myth={item.myth}
                reality={item.reality}
                takeaway={item.takeaway}
                delay={index * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Summary Section */}
      <section className="border-t border-border/50 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-border bg-card p-6 sm:p-8"
          >
            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">
              The Bottom Line
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground sm:text-base">
              <p>
                The hosting industry relies on information asymmetry—providers
                know more than customers, and some exploit this gap. By
                understanding these common misconceptions, you can:
              </p>
              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Make purchasing decisions based on facts, not fear</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Recognize marketing tactics that don&apos;t serve your
                    interests
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Choose providers based on transparency and actual value
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Protect yourself with proper backups and data ownership
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold sm:text-2xl">
              See how we do things differently
            </h3>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Explore our commitment to transparent, user-first hosting.
            </p>
            <Link
              href="/features"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:px-6 sm:py-3"
            >
              View Features
              <ArrowRight className="h-4 w-4" />
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
}: {
  myth: string;
  reality: string;
  takeaway: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Myth */}
      <div className="flex items-start gap-3 border-b border-border bg-destructive/5 p-4 sm:gap-4 sm:p-5">
        <div className="shrink-0 rounded-full bg-destructive/10 p-1.5 sm:p-2">
          <X className="h-3.5 w-3.5 text-destructive sm:h-4 sm:w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-destructive">
            Myth
          </p>
          <p className="mt-1 text-sm font-medium text-foreground sm:text-base">
            {myth}
          </p>
        </div>
      </div>
      {/* Reality */}
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="shrink-0 rounded-full bg-primary/10 p-1.5 sm:p-2">
          <Check className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Reality
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {reality}
          </p>
          <div className="mt-3 rounded-lg bg-muted/50 p-2.5 sm:mt-4 sm:p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Takeaway:</span>{" "}
              {takeaway}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
