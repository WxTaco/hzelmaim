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

function StateBadge({ state }: { state: ContainerRecord["state"] }) {
  const cfg = {
    running: {
      classes: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/30",
      pulse: true,
    },
    stopped: {
      classes: "bg-muted text-muted-foreground ring-foreground/10",
      pulse: false,
    },
    provisioning: {
      classes: "bg-blue-500/10 text-blue-400 ring-blue-500/30",
      pulse: true,
    },
    failed: {
      classes: "bg-destructive/10 text-destructive ring-destructive/30",
      pulse: false,
    },
  }[state] ?? { classes: "bg-muted text-muted-foreground ring-foreground/10", pulse: false };

  return (
    <span className={cn(
      "relative inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0",
      cfg.classes
    )}>
      {cfg.pulse && (
        <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-current animate-pulse" />
      )}
      <span className={cfg.pulse ? "ml-1.5" : ""}>{state}</span>
    </span>
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
      <Link href={`/dashboard/containers/${container.id}`} className="min-w-0 flex-1 group/link">
        <p className="text-sm font-semibold truncate group-hover/link:text-primary transition-colors">
          {container.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {container.node_name} · CT{container.proxmox_ctid}
        </p>
      </Link>

      <StateBadge state={container.state} />

      <ContainerActions
        containerId={container.id}
        state={container.state}
        busy={busy}
        onAction={onAction}
      />
    </motion.div>
  );
}
