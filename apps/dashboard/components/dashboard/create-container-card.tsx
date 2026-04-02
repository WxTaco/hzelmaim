"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateContainerCardProps {
  onCreateClick: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * CreateContainerCard - Streamlined card for creating new VPS instances.
 * Uses a minimal design consistent with container cards.
 */
export function CreateContainerCard({ onCreateClick }: CreateContainerCardProps) {
  return (
    <motion.button
      onClick={onCreateClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35, ease: EASE }}
      className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-foreground/10 px-4 py-3 transition-all hover:border-primary/40 hover:bg-card/50 w-full text-left"
    >
      {/* Plus indicator */}
      <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        <Plus className="size-3.5" />
      </span>

      {/* Text */}
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        Create new VPS
      </span>
    </motion.button>
  );
}
