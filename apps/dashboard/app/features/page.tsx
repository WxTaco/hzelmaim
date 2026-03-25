"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Scale,
  Shield,
  Cpu,
  Eye,
  Zap,
  DollarSign,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

const features = [
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Fair Pricing",
    description:
      "What you see is what you pay. No surprise renewals, no hidden fees, no bait-and-switch tactics. Our pricing stays consistent from day one.",
    highlights: [
      "Transparent pricing tiers",
      "No renewal price jumps",
      "All features included",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Full Data Control",
    description:
      "Your data belongs to you. We provide the tools, you maintain complete ownership. Export everything, anytime, in standard formats.",
    highlights: [
      "Complete data portability",
      "Standard export formats",
      "No vendor lock-in",
    ],
  },
  {
    icon: <Cpu className="h-5 w-5" />,
    title: "No Overcrowding",
    description:
      "We strictly limit how many VPS instances share a physical server. Your resources are actually yours, not a theoretical maximum.",
    highlights: [
      "Guaranteed resource allocation",
      "Limited instances per node",
      "Consistent performance",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Minimal Data Collection",
    description:
      "We collect only what's essential to run your services. No usage analytics, no behavioral tracking, no selling data to third parties.",
    highlights: [
      "Essential data only",
      "No behavioral tracking",
      "Privacy by default",
    ],
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Simple to Use",
    description:
      "Complex doesn't mean powerful. Our interface is designed for clarity, whether you're managing one container or a hundred.",
    highlights: [
      "Clean dashboard interface",
      "One-click deployments",
      "Clear documentation",
    ],
  },
  {
    icon: <DollarSign className="h-5 w-5" />,
    title: "Reasonable Rates",
    description:
      "We price our services to be sustainable for us and affordable for you. Quality hosting shouldn't require enterprise budgets.",
    highlights: [
      "Competitive pricing",
      "No enterprise markups",
      "Value-focused tiers",
    ],
  },
];

const comparisonData = [
  {
    practice: "Pricing Consistency",
    typical: "Promotional rates that increase",
    ours: "Same price, always",
  },
  {
    practice: "Server Density",
    typical: "100+ VPS per node",
    ours: "Strictly limited capacity",
  },
  {
    practice: "Data Collection",
    typical: "Extensive analytics & tracking",
    ours: "Essential metrics only",
  },
  {
    practice: "Data Ownership",
    typical: "Complex export processes",
    ours: "Full control, easy export",
  },
  {
    practice: "Hidden Fees",
    typical: "Bandwidth, backups, support",
    ours: "All features included",
  },
];

export default function FeaturesPage() {
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
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Our Commitment to You
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:mt-6 sm:text-lg">
              We built hzel to solve the industry problems we&apos;ve discussed.
              Here&apos;s how we do things differently.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                highlights={feature.highlights}
                delay={index * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="border-t border-border/50 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center sm:mb-12"
          >
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              The hzel Difference
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
              A clear comparison of what sets us apart from typical hosting
              providers.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Header - Hidden on mobile, shown on sm+ */}
            <div className="hidden border-b border-border bg-muted/50 p-4 sm:grid sm:grid-cols-3">
              <div className="text-sm font-medium text-muted-foreground">
                Practice
              </div>
              <div className="text-center text-sm font-medium text-muted-foreground">
                Typical Providers
              </div>
              <div className="text-center text-sm font-medium text-primary">
                hzel
              </div>
            </div>

            {/* Rows */}
            {comparisonData.map((row, index) => (
              <ComparisonRow
                key={row.practice}
                practice={row.practice}
                typical={row.typical}
                ours={row.ours}
                isLast={index === comparisonData.length - 1}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 py-12 sm:py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl px-4 text-center sm:px-6"
        >
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Ready to experience hosting differently?
          </h2>
          <p className="mt-4 text-pretty text-sm text-muted-foreground sm:text-base">
            Join a platform built on transparency and user empowerment. No
            surprises, no hidden agendas.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:px-8 sm:py-4 sm:text-base"
            >
              Sign in to Get Started
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  highlights,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mb-4 sm:h-10 sm:w-10">
        {icon}
      </div>
      <h3 className="mb-2 text-sm font-semibold sm:text-base">{title}</h3>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {description}
      </p>
      <ul className="mt-auto space-y-2">
        {highlights.map((highlight, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
            {highlight}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function ComparisonRow({
  practice,
  typical,
  ours,
  isLast = false,
}: {
  practice: string;
  typical: string;
  ours: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 p-4 sm:grid sm:grid-cols-3 sm:gap-0 ${!isLast ? "border-b border-border" : ""}`}
    >
      <div className="text-sm font-medium">{practice}</div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-center sm:gap-0">
        <span className="text-xs text-muted-foreground/60 sm:hidden">
          Typical:
        </span>
        {typical}
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-primary sm:justify-center sm:gap-0">
        <span className="text-xs text-muted-foreground/60 sm:hidden">
          hzel:
        </span>
        {ours}
      </div>
    </div>
  );
}
