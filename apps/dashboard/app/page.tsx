"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Server,
  Shield,
  DollarSign,
  Users,
  Lock,
  Zap,
  ArrowRight,
  CheckCircle2,
  Eye,
  Scale,
  Cpu,
} from "lucide-react";

const LOGO_URL =
  process.env.NEXT_PUBLIC_LOGO_URL ??
  "https://content.hzel.org/branding/logo.svg";
const WORDMARK_URL =
  process.env.NEXT_PUBLIC_WORDMARK_URL ??
  "https://content.hzel.org/branding/wordmark.svg";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="hzel" className="h-8 w-auto" />
            <span className="text-lg font-semibold tracking-tight">hzel</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="#learn"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Learn
            </Link>
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.62 0.22 264 / 15%) 0%, transparent 60%)",
          }}
        />

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="relative mx-auto max-w-4xl px-6 text-center"
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Eye className="h-4 w-4 text-primary" />
              Transparent Hosting, Simplified
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            Hosting that puts{" "}
            <span className="text-primary">you in control</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground"
          >
            Most hosting providers hide their practices behind complex jargon.
            We believe you deserve to understand exactly what you&apos;re
            getting—and why it matters.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#learn"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium transition-all hover:bg-muted"
            >
              Learn how hosting works
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Education Section */}
      <section id="learn" className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Understanding Hosting Providers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
              Before choosing a provider, it helps to understand what&apos;s
              happening behind the scenes—and why certain practices can impact
              your experience.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            <EducationCard
              icon={<Server className="h-6 w-6" />}
              title="What is a VPS?"
              description="A Virtual Private Server (VPS) is like renting a portion of a powerful computer. The physical machine is divided into isolated virtual environments, each acting as its own server."
              delay={0}
            />
            <EducationCard
              icon={<Users className="h-6 w-6" />}
              title="The Overcrowding Problem"
              description="Many providers pack too many virtual servers onto one machine to maximize profit. This means your 'dedicated' resources are actually competing with dozens of neighbors."
              delay={0.1}
            />
            <EducationCard
              icon={<DollarSign className="h-6 w-6" />}
              title="Hidden Pricing Tactics"
              description="Low introductory rates often skyrocket after the first billing cycle. Some providers also charge extra for bandwidth, backups, or basic support."
              delay={0.2}
            />
            <EducationCard
              icon={<Lock className="h-6 w-6" />}
              title="Data Collection Concerns"
              description="Hosting providers have access to your server. Some monetize usage patterns, install tracking software, or share data with third parties."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section id="features" className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Our Commitment to You
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
              We built hzel to solve these industry problems. Here&apos;s how we
              do things differently.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Scale className="h-5 w-5" />}
              title="Fair Pricing"
              description="What you see is what you pay. No surprise renewals, no hidden fees, no bait-and-switch tactics. Our pricing stays consistent from day one."
              highlights={[
                "Transparent pricing tiers",
                "No renewal price jumps",
                "All features included",
              ]}
              delay={0}
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Full Data Control"
              description="Your data belongs to you. We provide the tools, you maintain complete ownership. Export everything, anytime, in standard formats."
              highlights={[
                "Complete data portability",
                "Standard export formats",
                "No vendor lock-in",
              ]}
              delay={0.1}
            />
            <FeatureCard
              icon={<Cpu className="h-5 w-5" />}
              title="No Overcrowding"
              description="We strictly limit how many VPS instances share a physical server. Your resources are actually yours, not a theoretical maximum."
              highlights={[
                "Guaranteed resource allocation",
                "Limited instances per node",
                "Consistent performance",
              ]}
              delay={0.2}
            />
            <FeatureCard
              icon={<Eye className="h-5 w-5" />}
              title="Minimal Data Collection"
              description="We collect only what's essential to run your services. No usage analytics, no behavioral tracking, no selling data to third parties."
              highlights={[
                "Essential data only",
                "No behavioral tracking",
                "Privacy by default",
              ]}
              delay={0.3}
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Simple to Use"
              description="Complex doesn't mean powerful. Our interface is designed for clarity, whether you're managing one container or a hundred."
              highlights={[
                "Clean dashboard interface",
                "One-click deployments",
                "Clear documentation",
              ]}
              delay={0.4}
            />
            <FeatureCard
              icon={<DollarSign className="h-5 w-5" />}
              title="Reasonable Rates"
              description="We price our services to be sustainable for us and affordable for you. Quality hosting shouldn't require enterprise budgets."
              highlights={[
                "Competitive pricing",
                "No enterprise markups",
                "Value-focused tiers",
              ]}
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              The hzel Difference
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
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
            <div className="grid grid-cols-3 border-b border-border bg-muted/50 p-4 text-sm font-medium">
              <div className="text-muted-foreground">Practice</div>
              <div className="text-center text-muted-foreground">
                Typical Providers
              </div>
              <div className="text-center text-primary">hzel</div>
            </div>

            <ComparisonRow
              practice="Pricing Consistency"
              typical="Promotional rates that increase"
              ours="Same price, always"
            />
            <ComparisonRow
              practice="Server Density"
              typical="100+ VPS per node"
              ours="Strictly limited capacity"
            />
            <ComparisonRow
              practice="Data Collection"
              typical="Extensive analytics & tracking"
              ours="Essential metrics only"
            />
            <ComparisonRow
              practice="Data Ownership"
              typical="Complex export processes"
              ours="Full control, easy export"
            />
            <ComparisonRow
              practice="Hidden Fees"
              typical="Bandwidth, backups, support"
              ours="All features included"
              isLast
            />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl px-6 text-center"
        >
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to experience hosting differently?
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Join a platform built on transparency and user empowerment. No
            surprises, no hidden agendas.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Sign in to Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="hzel" className="h-6 w-auto" />
              <span className="text-sm text-muted-foreground">
                Transparent hosting for everyone.
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} hzel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EducationCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </motion.div>
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
      className="flex flex-col rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <ul className="mt-auto space-y-2">
        {highlights.map((highlight, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
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
      className={`grid grid-cols-3 p-4 text-sm ${!isLast ? "border-b border-border" : ""}`}
    >
      <div className="font-medium">{practice}</div>
      <div className="text-center text-muted-foreground">{typical}</div>
      <div className="text-center font-medium text-primary">{ours}</div>
    </div>
  );
}
