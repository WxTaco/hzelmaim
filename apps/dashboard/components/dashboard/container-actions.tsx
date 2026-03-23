"use client";

import { useState } from "react";
import { Loader2, Play, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ContainerRecord } from "./container-card";

interface ContainerActionsProps {
  containerId: string;
  containerName?: string;
  state: ContainerRecord["state"];
  busy: boolean;
  onAction: (id: string, action: "start" | "stop" | "restart") => Promise<void>;
}

type ActionType = "start" | "stop" | "restart" | null;

const actionConfig = {
  start: {
    title: "Start Container",
    description: "Are you sure you want to start this container? It will begin consuming resources.",
    confirmLabel: "Start",
    variant: "default" as const,
  },
  stop: {
    title: "Stop Container",
    description: "Are you sure you want to stop this container? Any unsaved work may be lost.",
    confirmLabel: "Stop",
    variant: "destructive" as const,
  },
  restart: {
    title: "Restart Container",
    description: "Are you sure you want to restart this container? It will be briefly unavailable during the restart.",
    confirmLabel: "Restart",
    variant: "default" as const,
  },
};

export function ContainerActions({
  containerId,
  containerName,
  state,
  busy,
  onAction,
}: ContainerActionsProps) {
  const [pendingAction, setPendingAction] = useState<ActionType>(null);
  const [confirming, setConfirming] = useState(false);

  const handleActionClick = (action: ActionType) => {
    setPendingAction(action);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setConfirming(true);
    try {
      await onAction(containerId, pendingAction);
    } finally {
      setConfirming(false);
      setPendingAction(null);
    }
  };

  const handleCancel = () => {
    setPendingAction(null);
  };

  if (state === "provisioning") {
    return (
      <div className="flex items-center justify-center w-16">
        <Loader2 className="size-4 animate-spin text-blue-400" aria-label="Provisioning" />
      </div>
    );
  }

  const config = pendingAction ? actionConfig[pendingAction] : null;

  return (
    <>
      <div className="flex items-center gap-1" role="group" aria-label="Container actions">
        {state === "stopped" && (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={() => handleActionClick("start")}
            aria-label="Start container"
            className="hover:bg-emerald-500/10 hover:text-emerald-500"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Play className="text-emerald-500" />}
          </Button>
        )}
        {state === "running" && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              onClick={() => handleActionClick("restart")}
              aria-label="Restart container"
              className="hover:bg-blue-500/10 hover:text-blue-400"
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RotateCcw className="text-muted-foreground hover:text-blue-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              onClick={() => handleActionClick("stop")}
              aria-label="Stop container"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Square className="text-muted-foreground hover:text-destructive" />
              )}
            </Button>
          </>
        )}
        {state === "failed" && (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={() => handleActionClick("restart")}
            aria-label="Retry container"
            className="hover:bg-primary/10 hover:text-primary"
          >
            {busy ? <Loader2 className="animate-spin" /> : <RotateCcw className="text-muted-foreground" />}
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {config && (
        <ConfirmDialog
          open={pendingAction !== null}
          onOpenChange={(open) => !open && handleCancel()}
          title={config.title}
          description={
            containerName
              ? `${config.description.replace("this container", `"${containerName}"`)}`
              : config.description
          }
          confirmLabel={config.confirmLabel}
          variant={config.variant}
          loading={confirming}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
