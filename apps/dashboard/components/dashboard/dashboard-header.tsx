"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  containerCount: number;
  onCreateClick: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function DashboardHeader({ containerCount, onCreateClick }: DashboardHeaderProps) {
  return (
    <motion.header
      className="mb-6 flex items-start justify-between"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Containers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {containerCount === 0
            ? "No containers yet — create your first one"
            : `Manage your ${containerCount} container${containerCount !== 1 ? "s" : ""}`}
        </p>
      </div>
      <Button 
        onClick={onCreateClick}
        className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
      >
        <Plus className="size-4" />
        New Container
      </Button>
    </motion.header>
  );
}
