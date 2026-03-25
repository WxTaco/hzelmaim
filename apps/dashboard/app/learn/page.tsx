"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Server,
  Users,
  DollarSign,
  Lock,
  ArrowRight,
  Database,
  Globe,
  Shield,
  Cpu,
} from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

export default function LearnPage() {
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
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Understanding the Industry</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              How Hosting Providers Work
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              Before choosing a provider, it helps to understand what&apos;s
              happening behind the scenes—and why certain practices can impact
              your experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Education Cards */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            <EducationCard
              icon={<Server className="h-5 w-5" />}
              title="What is a VPS?"
              description="A Virtual Private Server (VPS) is like renting a portion of a powerful computer. The physical machine is divided into isolated virtual environments, each acting as its own server."
              learnMore="Unlike shared hosting where resources are pooled, a VPS gives you guaranteed CPU, RAM, and storage. This means predictable performance regardless of what other users on the same physical machine are doing."
              delay={0}
            />
            <EducationCard
              icon={<Users className="h-5 w-5" />}
              title="The Overcrowding Problem"
              description="Many providers pack too many virtual servers onto one machine to maximize profit. This means your 'dedicated' resources are actually competing with dozens of neighbors."
              learnMore="When a node is overcrowded, you'll experience slower disk I/O, network latency spikes, and CPU throttling during peak hours. Your '4 cores' might feel like 1 core when everyone's busy."
              delay={0.1}
            />
            <EducationCard
              icon={<DollarSign className="h-5 w-5" />}
              title="Hidden Pricing Tactics"
              description="Low introductory rates often skyrocket after the first billing cycle. Some providers also charge extra for bandwidth, backups, or basic support."
              learnMore="Watch for: promotional pricing that doubles or triples on renewal, bandwidth overage charges, paid backup services, premium support tiers, and 'optional' security features that should be standard."
              delay={0.2}
            />
            <EducationCard
              icon={<Lock className="h-5 w-5" />}
              title="Data Collection Concerns"
              description="Hosting providers have access to your server. Some monetize usage patterns, install tracking software, or share data with third parties."
              learnMore="Your provider can see traffic patterns, resource usage, and potentially inspect unencrypted data. Some sell this data for marketing or analytics. Always read privacy policies carefully."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Key Concepts Section */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Fundamentals</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Key Concepts Explained
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Essential knowledge for evaluating any hosting provider.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <ConceptCard
              icon={<Database className="h-5 w-5" />}
              title="Resource Allocation"
              description="How providers divide physical resources among virtual servers. Dedicated means guaranteed; burstable means shared."
              delay={0}
            />
            <ConceptCard
              icon={<Globe className="h-5 w-5" />}
              title="Network Quality"
              description="Bandwidth, latency, and peering agreements determine how fast your server communicates with the world."
              delay={0.1}
            />
            <ConceptCard
              icon={<Shield className="h-5 w-5" />}
              title="Security Practices"
              description="DDoS protection, firewall options, and isolation between customers affect your overall security."
              delay={0.2}
            />
            <ConceptCard
              icon={<Cpu className="h-5 w-5" />}
              title="Hardware Generation"
              description="Newer CPUs and NVMe storage vastly outperform older hardware. Same specs, very different performance."
              delay={0.3}
            />
          </div>
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
                Ready to learn more?
              </h3>
              <p className="mt-2 text-muted-foreground">
                Explore our glossary for detailed terminology explanations.
              </p>
            </div>
            <Link
              href="/glossary"
              className="group inline-flex items-center gap-2.5 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              View Glossary
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

function EducationCard({
  icon,
  title,
  description,
  learnMore,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  learnMore: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-lg border border-border bg-card p-6 card-hover sm:p-8"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-accent text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {learnMore}
        </p>
      </div>
    </motion.div>
  );
}

function ConceptCard({
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
      className="rounded-lg border border-border bg-card p-5 card-hover sm:p-6"
    >
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-muted-foreground">
        {icon}
      </div>
      <h4 className="text-sm font-semibold sm:text-base">{title}</h4>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {description}
      </p>
    </motion.div>
  );
}
