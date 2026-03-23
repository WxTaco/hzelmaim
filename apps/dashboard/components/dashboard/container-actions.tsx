"use client";

import { Loader2, Play, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContainerRecord } from "./container-card";

interface ContainerActionsProps {
  containerId: string;
  state: ContainerRecord["state"];
  busy: boolean;
  onAction: (id: string, action: "start" | "stop" | "restart") => Promise<void>;
}

export function ContainerActions({ containerId, state, busy, onAction }: ContainerActionsProps) {
  if (state === "provisioning") {
    return (
      <div className="flex items-center justify-center w-16">
        <Loader2 className="size-4 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {state === "stopped" && (
        <Button 
          variant="ghost" 
          size="icon-sm" 
          disabled={busy} 
          onClick={() => onAction(containerId, "start")} 
          title="Start"
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
            onClick={() => onAction(containerId, "restart")} 
            title="Restart"
            className="hover:bg-blue-500/10 hover:text-blue-400"
          >
            {busy ? <Loader2 className="animate-spin" /> : <RotateCcw className="text-muted-foreground hover:text-blue-400" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            disabled={busy} 
            onClick={() => onAction(containerId, "stop")} 
            title="Stop"
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Square className="text-muted-foreground hover:text-destructive" />}
          </Button>
        </>
      )}
      {state === "failed" && (
        <Button 
          variant="ghost" 
          size="icon-sm" 
          disabled={busy} 
          onClick={() => onAction(containerId, "restart")} 
          title="Retry"
          className="hover:bg-primary/10 hover:text-primary"
        >
          {busy ? <Loader2 className="animate-spin" /> : <RotateCcw className="text-muted-foreground" />}
        </Button>
      )}
    </div>
  );
}
