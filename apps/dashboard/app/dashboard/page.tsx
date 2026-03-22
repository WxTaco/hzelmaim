"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Play, Square, RotateCcw, Loader2, ServerCrash, Plus, X, KeyRound, Copy, Check } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface CreateContainerResult extends ContainerRecord {
  initial_password?: string;
}

function OptionGroup<T extends number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors",
              value === opt
                ? "bg-foreground text-background ring-foreground"
                : "bg-transparent text-muted-foreground ring-foreground/15 hover:text-foreground hover:ring-foreground/30"
            )}
          >
            {format(opt)}
          </button>
        ))}
      </div>
    </div>
  );
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

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [hostname, setHostname] = useState("");
  const [cpuCores, setCpuCores] = useState<1 | 2 | 4 | 8>(1);
  const [memoryMb, setMemoryMb] = useState<512 | 1024 | 2048 | 4096>(512);
  const [diskGb, setDiskGb] = useState<16 | 20 | 24 | 32>(16);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const submitCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hostname.trim()) { setCreateError("Hostname is required"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiFetch<{ data: CreateContainerResult }>("/api/v1/containers", {
        method: "POST",
        body: JSON.stringify({ hostname: hostname.trim(), cpu_cores: cpuCores, memory_mb: memoryMb, disk_gb: diskGb }),
      });
      setCreatedPassword(res.data.initial_password ?? null);
      setShowCreate(false);
      setHostname("");
      setCpuCores(1);
      setMemoryMb(512);
      setDiskGb(16);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create container");
    } finally {
      setCreating(false);
    }
  };

  const copyPassword = () => {
    if (!createdPassword) return;
    navigator.clipboard.writeText(createdPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        className="mb-6 flex items-start justify-between gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div>
          <h1 className="text-base font-semibold tracking-tight">Containers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {containers.length === 0
              ? "No containers yet."
              : `${containers.length} container${containers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          size="sm"
          variant={showCreate ? "outline" : "default"}
          onClick={() => { setShowCreate((v) => !v); setCreateError(null); }}
        >
          {showCreate ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showCreate ? "Cancel" : "New"}
        </Button>
      </motion.header>

      {/* One-time password banner */}
      <AnimatePresence>
        {createdPassword && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/8 ring-1 ring-amber-500/25 px-4 py-3">
              <KeyRound className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Save your root password — it won&apos;t be shown again</p>
                <p className="mt-1 font-mono text-sm break-all">{createdPassword}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={copyPassword} title="Copy password">
                  {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setCreatedPassword(null)} title="Dismiss">
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            onSubmit={submitCreate}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mb-5 overflow-hidden"
          >
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-5 py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hostname">Hostname</Label>
                <Input
                  id="hostname"
                  placeholder="my-container"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  disabled={creating}
                  autoFocus
                />
              </div>

              <OptionGroup
                label="CPU Cores"
                options={[1, 2, 4, 8] as const}
                value={cpuCores}
                onChange={setCpuCores}
                format={(v) => `${v} core${v !== 1 ? "s" : ""}`}
              />

              <OptionGroup
                label="Memory"
                options={[512, 1024, 2048, 4096] as const}
                value={memoryMb}
                onChange={setMemoryMb}
                format={(v) => v >= 1024 ? `${v / 1024} GB` : `${v} MB`}
              />

              <OptionGroup
                label="Disk"
                options={[16, 20, 24, 32] as const}
                value={diskGb}
                onChange={setDiskGb}
                format={(v) => `${v} GB`}
              />

              {createError && (
                <p className="text-xs text-destructive">{createError}</p>
              )}

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={creating}>
                  {creating && <Loader2 className="size-3.5 animate-spin" />}
                  {creating ? "Creating…" : "Create container"}
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {containers.length === 0 && !showCreate ? (
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
                transition={{ delay: 0.15 + i * 0.055, duration: 0.4, ease: EASE }}
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

