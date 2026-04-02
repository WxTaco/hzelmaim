"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ContainerActions } from "./container-actions";

export interface ContainerRecord {
  id: string;
  proxmox_ctid: number;
  name: string;
  node_name: string;
  cpu_cores: number;
  memory_mb: number;
  disk_gb: number;
  state: "provisioning" | "running" | "stopped" | "failed";
  created_at: string;
}

interface ContainerCardProps {
  container: ContainerRecord;
  index: number;
  busy: boolean;
  onAction: (id: string, action: "start" | "stop" | "restart") => Promise<void>;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Minimal state indicator - just the colored dot for visual status
 * The border color already indicates state, so this is supplementary
 */
function StateIndicator({ state }: { state: ContainerRecord["state"] }) {
  const cfg = {
    running: "bg-emerald-500",
    stopped: "bg-muted-foreground/50",
    provisioning: "bg-blue-400 animate-pulse",
    failed: "bg-destructive",
  }[state] ?? "bg-muted-foreground/50";

  return (
    <span 
      className={cn("size-2 rounded-full shrink-0", cfg)}
      role="status"
      aria-label={`Status: ${state}`}
    />
  );
}

const borderColorMap: Record<ContainerRecord["state"], string> = {
  running: "border-l-emerald-500",
  stopped: "border-l-muted-foreground/30",
  provisioning: "border-l-blue-400",
  failed: "border-l-destructive",
};

export function ContainerCard({ container, index, busy, onAction }: ContainerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.05, duration: 0.4, ease: EASE }}
      className={cn(
        "flex items-center gap-4 rounded-xl bg-card ring-1 ring-foreground/8 px-4 py-3",
        "border-l-4 transition-all duration-200",
        "hover:ring-foreground/15 hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/10",
        borderColorMap[container.state]
      )}
    >
      {/* State indicator dot */}
      <StateIndicator state={container.state} />

      {/* Main content area - simplified */}
      <Link href={`/dashboard/containers/${container.id}`} className="min-w-0 flex-1 group/link">
        <p className="text-sm font-semibold truncate group-hover/link:text-primary transition-colors">
          {container.name}
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          {container.state}
        </p>
      </Link>

      {/* Actions - streamlined */}
      <ContainerActions
        containerId={container.id}
        containerName={container.name}
        state={container.state}
        busy={busy}
        onAction={onAction}
      />
    </motion.div>
  );
}
