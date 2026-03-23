"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { ServerCrash, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ContainerList } from "@/components/dashboard/container-list";
import { CreateContainerDialog, type CreateContainerData } from "@/components/dashboard/create-container-dialog";
import { PasswordBanner } from "@/components/dashboard/password-banner";
import type { ContainerRecord } from "@/components/dashboard/container-card";

interface CreateContainerResult extends ContainerRecord {
  initial_password?: string;
}

export default function DashboardPage() {
  const [containers, setContainers] = useState<ContainerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<Set<string>>(new Set());

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  // Compute stats from containers
  const stats = useMemo(() => ({
    total: containers.length,
    running: containers.filter(c => c.state === "running").length,
    stopped: containers.filter(c => c.state === "stopped").length,
    failed: containers.filter(c => c.state === "failed").length,
  }), [containers]);

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

  const handleCreate = async (data: CreateContainerData) => {
    const res = await apiFetch<{ data: CreateContainerResult }>("/api/v1/containers", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setCreatedPassword(res.data.initial_password ?? null);
    await load();
  };

  // Loading state
  if (loading) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded-md bg-muted animate-pulse mt-2" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 gap-4 text-center max-w-4xl mx-auto">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-destructive/10">
          <ServerCrash className="size-8 text-destructive" />
        </div>
        <div>
          <p className="text-lg font-semibold">Failed to load containers</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { setLoading(true); setError(null); load(); }}
          className="mt-2"
        >
          <Loader2 className="size-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <DashboardHeader
        containerCount={containers.length}
        onCreateClick={() => setShowCreateDialog(true)}
      />

      <AnimatePresence>
        {createdPassword && (
          <PasswordBanner
            password={createdPassword}
            onDismiss={() => setCreatedPassword(null)}
          />
        )}
      </AnimatePresence>

      {containers.length > 0 && (
        <StatsCards
          total={stats.total}
          running={stats.running}
          stopped={stats.stopped}
          failed={stats.failed}
        />
      )}

      <ContainerList
        containers={containers}
        actingIds={acting}
        onAction={doAction}
        onCreateClick={() => setShowCreateDialog(true)}
      />

      <CreateContainerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
      />
    </div>
  );
}
