"use client";

// Modernized landing page with brand color #00a4ff
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Server, BookOpen, Sparkles, Shield } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0, 164, 255, 0.08) 0%, transparent 60%)",
          }}
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block text-foreground">Hosting that puts</span>
              <span className="block text-gradient mt-1">you in control</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-8 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl leading-relaxed"
          >
            Most hosting providers hide their practices behind complex jargon.
            We believe you deserve to understand exactly what you&apos;re
            getting—and why it matters.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/login"
              className="group flex w-full items-center justify-center gap-2.5 rounded-md bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 sm:w-auto"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/learn"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-8 py-3.5 text-sm font-medium transition-all hover:border-muted-foreground/30 hover:bg-accent sm:w-auto"
            >
              Learn how hosting works
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-10 sm:grid-cols-4 md:mt-24"
          >
            {[
              { value: "99.9%", label: "Uptime SLA" },
              { value: "0%", label: "Hidden fees" },
              { value: "100%", label: "Data ownership" },
              { value: "24/7", label: "Monitoring" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Section Cards */}
      <section className="border-t border-border py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Education</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Why hosting education matters
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Understanding the industry helps you make better decisions and avoid common pitfalls.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:gap-8">
            <SectionCard
              icon={<Server className="h-5 w-5" />}
              title="Understand Your Server"
              description="Learn what VPS, containers, and cloud infrastructure really mean—in plain language that anyone can understand."
              href="/learn"
              delay={0}
            />
            <SectionCard
              icon={<BookOpen className="h-5 w-5" />}
              title="Know the Terminology"
              description="Our comprehensive glossary breaks down technical jargon so you can make informed choices with confidence."
              href="/glossary"
              delay={0.1}
            />
            <SectionCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Avoid Common Myths"
              description="Discover the misconceptions that providers exploit—and learn how to see through marketing tactics."
              href="/myths"
              delay={0.2}
            />
            <SectionCard
              icon={<Shield className="h-5 w-5" />}
              title="See Our Difference"
              description="Explore how we do things differently with transparent, user-first hosting that respects your data."
              href="/features"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
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

function SectionCard({
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
        className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-all card-hover sm:p-8"
      >
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-accent text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
          {description}
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
          Explore
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}
