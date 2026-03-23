"use client";

import { motion } from "framer-motion";
import { Box, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateClick: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="relative mb-6">
        {/* Decorative rings */}
        <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-r from-primary/10 to-transparent blur-2xl" />
        <div className="relative flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-card to-card/50 ring-1 ring-foreground/10">
          <Box className="size-8 text-muted-foreground" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-2">No containers yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Create your first container to get started with your development environment.
      </p>
      
      <Button 
        onClick={onCreateClick}
        className="gap-2 shadow-lg shadow-primary/20"
      >
        <Plus className="size-4" />
        Create Your First Container
      </Button>
    </motion.div>
  );
}
