"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Server, Users, DollarSign, Lock } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

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

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.70 0.14 180 / 15%) 0%, transparent 60%)",
          }}
        />

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="relative mx-auto max-w-4xl px-4 text-center sm:px-6"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
          >
            Hosting that puts{" "}
            <span className="text-primary">you in control</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:w-auto"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/learn"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium transition-all hover:bg-muted sm:w-auto"
            >
              Learn how hosting works
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Quick Overview Cards */}
      <section className="border-t border-border/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center sm:mb-16"
          >
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Why hosting education matters
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
              Understanding the industry helps you make better decisions and
              avoid common pitfalls.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:gap-8">
            <OverviewCard
              icon={<Server className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Understand Your Server"
              description="Learn what VPS, containers, and cloud infrastructure really mean—in plain language."
              href="/learn"
              delay={0}
            />
            <OverviewCard
              icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Know the Terminology"
              description="Our glossary breaks down technical jargon so you can make informed choices."
              href="/glossary"
              delay={0.1}
            />
            <OverviewCard
              icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="Avoid Common Myths"
              description="Discover the misconceptions that providers exploit—and how to see through them."
              href="/myths"
              delay={0.2}
            />
            <OverviewCard
              icon={<Lock className="h-5 w-5 sm:h-6 sm:w-6" />}
              title="See Our Difference"
              description="Explore how we do things differently with transparent, user-first hosting."
              href="/features"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 py-16 sm:py-20">
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

function OverviewCard({
  icon,
  title,
  description,
  href,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Link
        href={href}
        className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-card/80 sm:p-6"
      >
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mb-4 sm:h-12 sm:w-12">
          {icon}
        </div>
        <h3 className="mb-2 text-base font-semibold sm:text-lg">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
          Explore
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}
