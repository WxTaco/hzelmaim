"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, RotateCcw, Loader2, ServerCrash } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContainerRecord } from "@/components/dashboard/container-card";
import { WebTerminal } from "@/components/dashboard/web-terminal";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ContainerMetrics {
  cpu_percent: number;
  memory_used_mb: number;
  memory_limit_mb: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
}

function StateBadge({ state }: { state: ContainerRecord["state"] }) {
  const cfg = (
    {
      running: "bg-green-500/10 text-green-500 ring-green-500/20",
      stopped: "bg-muted text-muted-foreground ring-foreground/10",
      provisioning: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
      failed: "bg-destructive/10 text-destructive ring-destructive/20",
    } as Record<string, string>
  )[state] ?? "bg-muted text-muted-foreground ring-foreground/10";
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset", cfg)}>
      {state}
    </span>
  );
}

function MetricBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{unit === "%" ? `${value.toFixed(1)}%` : `${value} / ${max} MB`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
        />
      </div>
    </div>
  );
}

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(1)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

export default function ContainerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [container, setContainer] = useState<ContainerRecord | null>(null);
  const [metrics, setMetrics] = useState<ContainerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cRes, mRes] = await Promise.allSettled([
        apiFetch<{ data: ContainerRecord }>(`/api/v1/containers/${id}`),
        apiFetch<{ data: ContainerMetrics }>(`/api/v1/containers/${id}/metrics`),
      ]);
      if (cRes.status === "fulfilled") setContainer(cRes.value.data);
      else throw new Error((cRes.reason as Error)?.message ?? "Failed to load container");
      if (mRes.status === "fulfilled") setMetrics(mRes.value.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load container");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: "start" | "stop" | "restart") => {
    setActing(true);
    try {
      const res = await apiFetch<{ data: ContainerRecord }>(`/api/v1/containers/${id}/${action}`, { method: "POST" });
      // Backend polls Proxmox until the transition is confirmed; update
      // the displayed record directly from the verified response.
      setContainer(res.data);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6 h-5 w-16 rounded-lg bg-muted animate-pulse" />
        <div className="mb-2 h-7 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="mt-6 h-40 rounded-xl bg-muted animate-pulse" />
        <div className="mt-4 h-32 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
        <ServerCrash className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Failed to load container</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); load(); }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
      </motion.div>

      {/* Header */}
      <motion.header
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: EASE }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight truncate">{container.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{container.node_name} · CT{container.proxmox_ctid}</p>
        </div>
        <StateBadge state={container.state} />
      </motion.header>

      {/* Info card */}
      <motion.div
        className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 mb-4 grid grid-cols-2 gap-y-3 text-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
      >
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Node</p>
          <p className="font-medium">{container.node_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">CT ID</p>
          <p className="font-medium">{container.proxmox_ctid}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-0.5">Created</p>
          <p className="font-medium">{new Date(container.created_at).toLocaleString()}</p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex items-center gap-2 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
      >
        {container.state === "stopped" && (
          <Button variant="outline" size="sm" disabled={acting} onClick={() => doAction("start")}>
            {acting ? <Loader2 className="animate-spin" /> : <Play />}
            Start
          </Button>
        )}
        {container.state === "running" && (
          <>
            <Button variant="outline" size="sm" disabled={acting} onClick={() => doAction("restart")}>
              {acting ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Restart
            </Button>
            <Button variant="outline" size="sm" disabled={acting} onClick={() => doAction("stop")}>
              {acting ? <Loader2 className="animate-spin" /> : <Square />}
              Stop
            </Button>
          </>
        )}
      </motion.div>

      {/* Metrics */}
      {metrics && (
        <motion.div
          className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4 flex flex-col gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metrics</p>
          <MetricBar label="CPU" value={metrics.cpu_percent} max={100} unit="%" />
          <MetricBar label="Memory" value={metrics.memory_used_mb} max={metrics.memory_limit_mb} unit="MB" />
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Network In</p>
              <p className="text-sm font-medium tabular-nums">{fmtBytes(metrics.network_rx_bytes)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Network Out</p>
              <p className="text-sm font-medium tabular-nums">{fmtBytes(metrics.network_tx_bytes)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Terminal — only available when the container is running */}
      {container.state === "running" && (
        <motion.div
          className="mt-4 rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4 flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: EASE }}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Terminal</p>
          <WebTerminal containerId={id} />
        </motion.div>
      )}
    </div>
  );
}

