"use client";

import { motion } from "framer-motion";

/**
 * Props for the DashboardHeader component.
 */
interface DashboardHeaderProps {
  /** Number of containers to display in subtitle */
  containerCount: number;
}

/** Animation easing curve for smooth transitions */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * DashboardHeader - Page header for the container management dashboard.
 * 
 * Displays the page title and a dynamic subtitle showing the current
 * container count. The create functionality has been moved to the
 * CreateContainerCard component which appears in the container list.
 * 
 * @param props - Component props
 * @param props.containerCount - Number of existing containers
 * 
 * @example
 * ```tsx
 * <DashboardHeader containerCount={containers.length} />
 * ```
 */
export function DashboardHeader({ containerCount }: DashboardHeaderProps) {
  return (
    <motion.header
      className="mb-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
        Containers
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {containerCount === 0
          ? "Get started by creating your first container"
          : `Manage your ${containerCount} container${containerCount !== 1 ? "s" : ""}`}
      </p>
    </motion.header>
  );
}
