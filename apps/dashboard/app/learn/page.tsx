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
      <section className="border-b border-border/50 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Understanding Hosting Providers
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Before choosing a provider, it helps to understand what&apos;s
              happening behind the scenes—and why certain practices can impact
              your experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Education Cards */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            <EducationCard
              icon={<Server className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="What is a VPS?"
              description="A Virtual Private Server (VPS) is like renting a portion of a powerful computer. The physical machine is divided into isolated virtual environments, each acting as its own server."
              learnMore="Unlike shared hosting where resources are pooled, a VPS gives you guaranteed CPU, RAM, and storage. This means predictable performance regardless of what other users on the same physical machine are doing."
              delay={0}
            />
            <EducationCard
              icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="The Overcrowding Problem"
              description="Many providers pack too many virtual servers onto one machine to maximize profit. This means your 'dedicated' resources are actually competing with dozens of neighbors."
              learnMore="When a node is overcrowded, you'll experience slower disk I/O, network latency spikes, and CPU throttling during peak hours. Your '4 cores' might feel like 1 core when everyone's busy."
              delay={0.1}
            />
            <EducationCard
              icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Hidden Pricing Tactics"
              description="Low introductory rates often skyrocket after the first billing cycle. Some providers also charge extra for bandwidth, backups, or basic support."
              learnMore="Watch for: promotional pricing that doubles or triples on renewal, bandwidth overage charges, paid backup services, premium support tiers, and 'optional' security features that should be standard."
              delay={0.2}
            />
            <EducationCard
              icon={<Lock className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Data Collection Concerns"
              description="Hosting providers have access to your server. Some monetize usage patterns, install tracking software, or share data with third parties."
              learnMore="Your provider can see traffic patterns, resource usage, and potentially inspect unencrypted data. Some sell this data for marketing or analytics. Always read privacy policies carefully."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Deep Dive Section */}
      <section className="border-t border-border/50 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center sm:mb-12"
          >
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              Key Concepts Explained
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
              Essential knowledge for evaluating any hosting provider.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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
      <section className="border-t border-border/50 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold sm:text-2xl">
              Ready to learn more?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Explore our glossary for detailed terminology explanations.
            </p>
            <Link
              href="/glossary"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:px-6 sm:py-3"
            >
              View Glossary
              <ArrowRight className="h-4 w-4" />
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
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2 text-primary sm:mb-4 sm:p-2.5">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold sm:text-lg">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
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
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-10 sm:w-10">
        {icon}
      </div>
      <h4 className="mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base">
        {title}
      </h4>
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {description}
      </p>
    </motion.div>
  );
}
