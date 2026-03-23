"use client";

import { motion } from "framer-motion";
import { Box, Play, Square, AlertTriangle } from "lucide-react";
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
  icon: React.ReactNode;
  colorClass: string;
  glowClass: string;
  delay: number;
}

function StatCard({ label, value, icon, colorClass, glowClass, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
      className={cn(
        "relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8 p-4",
        "hover:ring-foreground/15 transition-all duration-300",
        "group"
      )}
    >
      {/* Background glow */}
      <div 
        className={cn(
          "absolute -top-8 -right-8 size-24 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-30",
          glowClass
        )} 
      />
      
      <div className="relative flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center size-10 rounded-lg",
          "bg-gradient-to-br",
          colorClass
        )}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function StatsCards({ total, running, stopped, failed }: StatsCardsProps) {
  const stats = [
    {
      label: "Total Containers",
      value: total,
      icon: <Box className="size-5 text-white" />,
      colorClass: "from-primary/80 to-primary",
      glowClass: "bg-primary",
      delay: 0.05,
    },
    {
      label: "Running",
      value: running,
      icon: <Play className="size-5 text-white" />,
      colorClass: "from-emerald-500/80 to-emerald-500",
      glowClass: "bg-emerald-500",
      delay: 0.1,
    },
    {
      label: "Stopped",
      value: stopped,
      icon: <Square className="size-5 text-white" />,
      colorClass: "from-muted-foreground/60 to-muted-foreground/80",
      glowClass: "bg-muted-foreground",
      delay: 0.15,
    },
    {
      label: "Failed",
      value: failed,
      icon: <AlertTriangle className="size-5 text-white" />,
      colorClass: "from-destructive/80 to-destructive",
      glowClass: "bg-destructive",
      delay: 0.2,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
