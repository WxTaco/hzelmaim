"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  total: number;
  running: number;
  stopped: number;
  failed: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

interface StatCardProps {
  label: string;
  value: number;
  dotColor: string;
  delay: number;
}

function StatCard({ label, value, dotColor, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: EASE }}
      className="rounded-xl bg-card ring-1 ring-foreground/8 p-3 hover:ring-foreground/15 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full shrink-0", dotColor)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight mt-1 ml-4">{value}</p>
    </motion.div>
  );
}

export function StatsCards({ total, running, stopped, failed }: StatsCardsProps) {
  const stats = [
    { label: "Total", value: total, dotColor: "bg-primary", delay: 0.05 },
    { label: "Running", value: running, dotColor: "bg-emerald-500", delay: 0.08 },
    { label: "Stopped", value: stopped, dotColor: "bg-muted-foreground/50", delay: 0.11 },
    { label: "Failed", value: failed, dotColor: "bg-destructive", delay: 0.14 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
