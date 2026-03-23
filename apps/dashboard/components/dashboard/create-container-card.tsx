"use client";

import { motion } from "framer-motion";
import { Plus, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the CreateContainerCard component.
 */
interface CreateContainerCardProps {
  /** Callback fired when the create button is clicked */
  onCreateClick: () => void;
}

/** Animation easing curve matching other dashboard components */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * CreateContainerCard - A special card that appears as the first item in the container list.
 * 
 * Distinguished from regular container cards by:
 * - Dotted border outline instead of solid
 * - Centered content layout with icon and "Create" button
 * - Subtle hover state with border color change
 * 
 * This component serves as the primary method for initiating container creation,
 * replacing the previous header button approach.
 * 
 * @param props - Component props
 * @param props.onCreateClick - Handler for initiating container creation flow
 * 
 * @example
 * ```tsx
 * <CreateContainerCard onCreateClick={() => setShowCreateDialog(true)} />
 * ```
 */
export function CreateContainerCard({ onCreateClick }: CreateContainerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
      className="group relative flex items-center gap-4 rounded-xl border-2 border-dashed border-foreground/15 bg-card/50 px-4 py-4 transition-all duration-200 hover:border-primary/50 hover:bg-card/80"
    >
      {/* Icon container with gradient background */}
      <div className="flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 transition-all duration-200 group-hover:ring-primary/40 group-hover:from-primary/30">
        <Server className="size-5 text-primary/70 group-hover:text-primary transition-colors" />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
          Add a new container
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Provision a new development environment
        </p>
      </div>

      {/* Create button */}
      <Button
        onClick={onCreateClick}
        size="sm"
        className="gap-1.5 shadow-md shadow-primary/15 hover:shadow-primary/25 transition-shadow"
      >
        <Plus className="size-4" />
        Create
      </Button>
    </motion.div>
  );
}
