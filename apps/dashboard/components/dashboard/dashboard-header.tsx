"use client";

import { motion } from "framer-motion";

interface DashboardHeaderProps {
  containerCount: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * DashboardHeader - Minimal page header for the VPS dashboard.
 */
export function DashboardHeader({ containerCount }: DashboardHeaderProps) {
  return (
    <motion.header
      className="mb-6"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <h1 className="text-xl font-semibold tracking-tight">VPS</h1>
      {containerCount === 0 && (
        <p className="text-sm text-muted-foreground mt-1">
          Get started by creating your first VPS
        </p>
      )}
    </motion.header>
  );
}
