"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Loader2,
  ServerCrash,
  Info,
  Activity,
  Terminal,
  Cpu,
  HardDrive,
  Network,
} from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        cfg
      )}
      role="status"
      aria-label={`Container status: ${state}`}
    >
      {state}
    </span>
  );
}

function MetricBar({
  label,
  value,
  max,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorClass =
    pct > 80 ? "bg-destructive" : pct > 60 ? "bg-yellow-500" : "bg-primary";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {Icon && <Icon className="size-4" />}
          {label}
        </span>
        <span className="font-medium tabular-nums">
          {unit === "%" ? `${value.toFixed(1)}%` : `${value.toFixed(0)} / ${max} MB`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
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

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (action: "start" | "stop" | "restart") => {
    setActing(true);
    try {
      const res = await apiFetch<{ data: ContainerRecord }>(
        `/api/v1/containers/${id}/${action}`,
        { method: "POST" }
      );
      setContainer(res.data);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6 h-5 w-16 rounded-lg bg-muted animate-pulse" />
        <div className="mb-2 h-7 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="mt-6 h-10 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="mt-6 h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
        <ServerCrash className="size-10 text-muted-foreground" />
        <p className="text-base font-medium">Failed to load container</p>
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            setError(null);
            load();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Containers
        </button>
      </motion.div>

      {/* Header with Actions */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: EASE }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight truncate">
              {container.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {container.node_name} · CT{container.proxmox_ctid}
            </p>
          </div>
          <StateBadge state={container.state} />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {container.state === "stopped" && (
            <Button
              variant="outline"
              size="sm"
              disabled={acting}
              onClick={() => doAction("start")}
            >
              {acting ? <Loader2 className="animate-spin" /> : <Play className="size-4" />}
              Start
            </Button>
          )}
          {container.state === "running" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => doAction("restart")}
              >
                {acting ? <Loader2 className="animate-spin" /> : <RotateCcw className="size-4" />}
                Restart
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => doAction("stop")}
              >
                {acting ? <Loader2 className="animate-spin" /> : <Square className="size-4" />}
                Stop
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Tabbed Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
      >
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <Info className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5">
              <Activity className="size-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger
              value="terminal"
              className="gap-1.5"
              disabled={container.state !== "running"}
            >
              <Terminal className="size-4" />
              Terminal
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="size-4 text-muted-foreground" />
                  Container Information
                </CardTitle>
                <CardDescription>
                  Basic details about this container instance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Name
                    </dt>
                    <dd className="text-sm font-medium">{container.name}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Status
                    </dt>
                    <dd>
                      <StateBadge state={container.state} />
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Node
                    </dt>
                    <dd className="text-sm font-medium">{container.node_name}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Container ID
                    </dt>
                    <dd className="text-sm font-medium font-mono">
                      CT{container.proxmox_ctid}
                    </dd>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Created
                    </dt>
                    <dd className="text-sm font-medium">
                      {new Date(container.created_at).toLocaleString(undefined, {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            {metrics ? (
              <>
                {/* Resource Usage */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="size-4 text-muted-foreground" />
                      Resource Usage
                    </CardTitle>
                    <CardDescription>
                      Current CPU and memory utilization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <MetricBar
                      label="CPU Usage"
                      value={metrics.cpu_percent}
                      max={100}
                      unit="%"
                      icon={Cpu}
                    />
                    <MetricBar
                      label="Memory Usage"
                      value={metrics.memory_used_mb}
                      max={metrics.memory_limit_mb}
                      unit="MB"
                      icon={HardDrive}
                    />
                  </CardContent>
                </Card>

                {/* Network Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="size-4 text-muted-foreground" />
                      Network Statistics
                    </CardTitle>
                    <CardDescription>
                      Total data transferred since container start
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Data Received
                        </p>
                        <p className="text-2xl font-semibold tabular-nums">
                          {fmtBytes(metrics.network_rx_bytes)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Data Sent
                        </p>
                        <p className="text-2xl font-semibold tabular-nums">
                          {fmtBytes(metrics.network_tx_bytes)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Activity className="size-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No metrics available</p>
                  <p className="text-xs mt-1">
                    {container.state === "running"
                      ? "Metrics data is loading..."
                      : "Start the container to view metrics"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Terminal Tab */}
          <TabsContent value="terminal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="size-4 text-muted-foreground" />
                  Web Terminal
                </CardTitle>
                <CardDescription>
                  Interactive shell access to the container
                </CardDescription>
              </CardHeader>
              <CardContent>
                {container.state === "running" ? (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <WebTerminal containerId={id} />
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Terminal className="size-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">Terminal unavailable</p>
                    <p className="text-xs mt-1">
                      Start the container to access the terminal
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
