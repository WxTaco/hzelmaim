"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Play, Square, RotateCcw, Loader2, ServerCrash } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ContainerRecord {
  id: string;
  proxmox_ctid: number;
  name: string;
  node_name: string;
  state: "provisioning" | "running" | "stopped" | "failed";
  created_at: string;
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
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0", cfg)}>
      {state}
    </span>
  );
}

export default function DashboardPage() {
  const [containers, setContainers] = useState<ContainerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: ContainerRecord[] }>("/api/v1/containers");
      setContainers(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load containers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (id: string, action: "start" | "stop" | "restart") => {
    setActing((s) => new Set(s).add(id));
    try {
      await apiFetch(`/api/v1/containers/${id}/${action}`, { method: "POST" });
    } finally {
      await load();
      setActing((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6 h-6 w-28 rounded-lg bg-muted animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-3 h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
        <ServerCrash className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Failed to load containers</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); load(); }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <motion.header
        className="mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <h1 className="text-base font-semibold tracking-tight">Containers</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {containers.length === 0
            ? "No containers yet."
            : `${containers.length} container${containers.length !== 1 ? "s" : ""}`}
        </p>
      </motion.header>

      {containers.length === 0 ? (
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35, ease: EASE }}
        >
          No containers found.
        </motion.p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {containers.map((c, i) => {
            const busy = acting.has(c.id);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: EASE }}
                className="flex items-center gap-4 rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3"
              >
                <Link href={`/dashboard/containers/${c.id}`} className="min-w-0 flex-1 group/link">
                  <p className="text-sm font-medium truncate group-hover/link:underline underline-offset-2">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.node_name} · CT{c.proxmox_ctid}</p>
                </Link>

                <StateBadge state={c.state} />

                <div className="flex items-center gap-1">
                  {c.state === "stopped" && (
                    <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => doAction(c.id, "start")} title="Start">
                      {busy ? <Loader2 className="animate-spin" /> : <Play />}
                    </Button>
                  )}
                  {c.state === "running" && (
                    <>
                      <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => doAction(c.id, "restart")} title="Restart">
                        {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                      </Button>
                      <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => doAction(c.id, "stop")} title="Stop">
                        {busy ? <Loader2 className="animate-spin" /> : <Square />}
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

