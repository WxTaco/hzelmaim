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
  Check,
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
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Our Promise</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Built on Transparency
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              We built hzel to solve the industry problems we&apos;ve discussed.
              Here&apos;s how we do things differently.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                highlights={feature.highlights}
                delay={Math.min(index * 0.05, 0.25)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Comparison</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              The hzel Difference
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              A clear comparison of what sets us apart from typical hosting providers.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-12 overflow-hidden rounded-lg border border-border bg-card"
          >
            {/* Header */}
            <div className="hidden border-b border-border bg-accent/50 px-6 py-4 sm:grid sm:grid-cols-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Practice
              </div>
              <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Typical Providers
              </div>
              <div className="text-center text-xs font-medium uppercase tracking-wider text-primary">
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
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-lg border border-border bg-card p-8 sm:p-12 lg:p-16"
          >
            {/* Subtle glow */}
            <div 
              className="pointer-events-none absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at top right, rgba(0, 164, 255, 0.05) 0%, transparent 50%)"
              }}
            />
            
            <div className="relative flex flex-col items-center text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="lg:max-w-xl">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Ready to experience hosting differently?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Join a platform built on transparency and user empowerment. No surprises, no hidden agendas.
                </p>
              </div>
              <div className="mt-8 lg:mt-0 lg:ml-8">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2.5 rounded-md bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                >
                  Sign in to Get Started
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
      className="flex flex-col rounded-lg border border-border bg-card p-6 card-hover"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-accent text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
        {description}
      </p>
      <ul className="mt-6 space-y-2 border-t border-border pt-6">
        {highlights.map((highlight, index) => (
          <li
            key={index}
            className="flex items-center gap-2.5 text-sm text-muted-foreground"
          >
            <Check className="h-4 w-4 shrink-0 text-primary" />
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
      className={`flex flex-col gap-3 px-6 py-5 sm:grid sm:grid-cols-3 sm:items-center sm:gap-0 ${!isLast ? "border-b border-border" : ""}`}
    >
      <div className="text-sm font-medium">{practice}</div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-center sm:gap-0">
        <span className="text-xs text-muted-foreground/50 sm:hidden">Typical:</span>
        {typical}
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-primary sm:justify-center sm:gap-0">
        <span className="text-xs text-muted-foreground/50 sm:hidden">hzel:</span>
        {ours}
      </div>
    </div>
  );
}
