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
  BookOpen,
  HelpCircle,
  X,
  Check,
} from "lucide-react";
import { useState } from "react";

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
              href="#glossary"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Glossary
            </Link>
            <Link
              href="#myths"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Myths
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

      {/* Interactive Glossary Section */}
      <section id="glossary" className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Hosting Glossary
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
              New to hosting? Click on any term below to learn what it means in
              plain language.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <GlossaryTerm
              term="VPS (Virtual Private Server)"
              definition="Think of it like renting an apartment in a building. You share the physical building (server) with others, but your space (virtual server) is completely private and isolated. You get guaranteed resources like CPU, RAM, and storage."
              example="A 2 CPU / 4GB RAM VPS means you have 2 processor cores and 4 gigabytes of memory dedicated to your applications."
              delay={0}
            />
            <GlossaryTerm
              term="CPU Cores"
              definition="The 'brains' of your server that process instructions. More cores mean your server can handle more tasks simultaneously, like running multiple applications or serving more visitors at once."
              example="A blog might need 1 core, while a busy web application might need 4+ cores."
              delay={0.05}
            />
            <GlossaryTerm
              term="RAM (Memory)"
              definition="Your server's short-term memory where active programs and data are stored for quick access. More RAM allows your server to run more applications simultaneously without slowing down."
              example="4GB RAM can handle a small website and database, while 16GB+ is better for complex applications."
              delay={0.1}
            />
            <GlossaryTerm
              term="Bandwidth"
              definition="The amount of data that can be transferred to and from your server, usually measured monthly. This includes all uploads and downloads—web pages served, files transferred, API calls, etc."
              example="If 1000 visitors view a 2MB page, that's roughly 2GB of bandwidth used."
              delay={0.15}
            />
            <GlossaryTerm
              term="SSD Storage"
              definition="The permanent storage space on your server where your files, databases, and applications live. SSDs (Solid State Drives) are much faster than traditional hard drives, making your server more responsive."
              example="A basic website might use 10GB, while a media-heavy application could need 100GB+."
              delay={0.2}
            />
            <GlossaryTerm
              term="Uptime"
              definition="The percentage of time your server is operational and accessible. 99.9% uptime means your server could be down for about 8.76 hours per year. Higher uptime = more reliable hosting."
              example="99.99% uptime allows only ~52 minutes of downtime per year."
              delay={0.25}
            />
            <GlossaryTerm
              term="Node / Host Machine"
              definition="The physical server hardware that runs multiple virtual servers (VPS). The quality and capacity of this machine directly affects all VPS performance on it."
              example="If a node is overcrowded with too many VPS, everyone's performance suffers."
              delay={0.3}
            />
            <GlossaryTerm
              term="Container"
              definition="A lightweight, isolated environment that packages an application with everything it needs to run. Containers are more efficient than full VPS but share the host's operating system."
              example="Docker containers let you run apps consistently across development and production."
              delay={0.35}
            />
            <GlossaryTerm
              term="Latency"
              definition="The time delay between a request and response, often measured in milliseconds (ms). Lower latency means faster response times for your users. Server location affects latency significantly."
              example="A server in New York will have lower latency for US East Coast users than one in Singapore."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Myth vs Reality Section */}
      <section id="myths" className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Myth vs Reality
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
              Let&apos;s clear up some common misconceptions about web hosting
              that providers often exploit.
            </p>
          </motion.div>

          <div className="space-y-6">
            <MythCard
              myth="More expensive hosting is always better quality"
              reality="Price often reflects marketing budgets, not infrastructure quality. Many premium providers use the same underlying hardware as budget options but charge more for brand recognition. What matters is the actual resource allocation, support quality, and transparency—not the price tag."
              delay={0}
            />
            <MythCard
              myth="'Unlimited' bandwidth and storage is actually unlimited"
              reality="There's no such thing as truly unlimited resources. These plans always have 'fair use' policies buried in the terms of service. Once you exceed unspecified thresholds, providers can throttle, suspend, or charge overage fees. Honest providers give you clear, guaranteed allocations instead."
              delay={0.1}
            />
            <MythCard
              myth="You need enterprise hosting for a small business website"
              reality="Most small to medium websites perform perfectly on entry-level VPS plans. A well-optimized WordPress site can serve thousands of daily visitors on 2GB of RAM. Start small, monitor your actual usage, and scale only when real metrics justify it."
              delay={0.2}
            />
            <MythCard
              myth="All VPS providers deliver the same performance for the same specs"
              reality="A '4 CPU / 8GB RAM' VPS can perform drastically differently between providers. Overcrowded nodes, outdated hardware, poor network infrastructure, and 'burstable' vs 'dedicated' resources all impact real-world performance. Identical specs don't guarantee identical experiences."
              delay={0.3}
            />
            <MythCard
              myth="Your data is automatically safe because it's 'in the cloud'"
              reality="Cloud providers are responsible for infrastructure, but you're responsible for your data. Servers can fail, providers can go bankrupt, and accounts can be suspended. Without your own backup strategy and data portability plan, you're at risk of losing everything."
              delay={0.4}
            />
            <MythCard
              myth="Managed hosting means you don't need to understand anything"
              reality="While managed services handle server maintenance, you still benefit from understanding basics like resource usage, security practices, and how your applications work. This knowledge helps you make better decisions, troubleshoot issues faster, and avoid being upsold on services you don't need."
              delay={0.5}
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

function GlossaryTerm({
  term,
  definition,
  example,
  delay,
}: {
  term: string;
  definition: string;
  example: string;
  delay: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-card/80"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground">{term}</h3>
          <motion.div
            animate={{ rotate: isExpanded ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 mt-0.5"
          >
            <HelpCircle className="h-4 w-4 text-primary" />
          </motion.div>
        </div>
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
            marginTop: isExpanded ? 12 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            {definition}
          </p>
          <div className="mt-3 rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Example:</span>{" "}
              {example}
            </p>
          </div>
        </motion.div>
      </button>
    </motion.div>
  );
}

function MythCard({
  myth,
  reality,
  delay,
}: {
  myth: string;
  reality: string;
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
      <div className="flex items-start gap-4 border-b border-border bg-destructive/5 p-5">
        <div className="shrink-0 rounded-full bg-destructive/10 p-2">
          <X className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-destructive">
            Myth
          </p>
          <p className="mt-1 font-medium text-foreground">{myth}</p>
        </div>
      </div>
      {/* Reality */}
      <div className="flex items-start gap-4 p-5">
        <div className="shrink-0 rounded-full bg-primary/10 p-2">
          <Check className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Reality
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {reality}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
