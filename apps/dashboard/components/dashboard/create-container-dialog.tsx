"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CreateContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContainerData) => Promise<void>;
}

export interface CreateContainerData {
  hostname: string;
  cpu_cores: 1 | 2 | 4 | 8;
  memory_mb: 512 | 1024 | 2048 | 4096;
  disk_gb: 16 | 20 | 24 | 32;
}

function OptionGroup<T extends number>({
  label,
  description,
  options,
  value,
  onChange,
  format,
  disabled,
}: {
  label: string;
  description?: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            disabled={disabled}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium ring-1 ring-inset transition-all duration-200",
              value === opt
                ? "bg-primary text-primary-foreground ring-primary shadow-lg shadow-primary/20"
                : "bg-card text-muted-foreground ring-foreground/10 hover:text-foreground hover:ring-foreground/20 hover:bg-accent",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {format(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CreateContainerDialog({ open, onOpenChange, onSubmit }: CreateContainerDialogProps) {
  const [hostname, setHostname] = useState("");
  const [cpuCores, setCpuCores] = useState<1 | 2 | 4 | 8>(1);
  const [memoryMb, setMemoryMb] = useState<512 | 1024 | 2048 | 4096>(512);
  const [diskGb, setDiskGb] = useState<16 | 20 | 24 | 32>(16);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname.trim()) {
      setError("Hostname is required");
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      await onSubmit({
        hostname: hostname.trim(),
        cpu_cores: cpuCores,
        memory_mb: memoryMb,
        disk_gb: diskGb,
      });
      // Reset form
      setHostname("");
      setCpuCores(1);
      setMemoryMb(512);
      setDiskGb(16);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create container");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!creating) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Container</DialogTitle>
          <DialogDescription>
            Configure your container resources. You can adjust these later.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="hostname" className="text-sm font-medium">
              Hostname
            </Label>
            <Input
              id="hostname"
              placeholder="my-container"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              disabled={creating}
              className="h-10"
              autoFocus
            />
          </div>
          
          <div className="space-y-4 pt-2">
            <OptionGroup
              label="CPU Cores"
              description="Processing power allocation"
              options={[1, 2, 4, 8] as const}
              value={cpuCores}
              onChange={setCpuCores}
              format={(v) => `${v} core${v !== 1 ? "s" : ""}`}
              disabled={creating}
            />
            
            <OptionGroup
              label="Memory"
              description="RAM allocation"
              options={[512, 1024, 2048, 4096] as const}
              value={memoryMb}
              onChange={setMemoryMb}
              format={(v) => v >= 1024 ? `${v / 1024} GB` : `${v} MB`}
              disabled={creating}
            />
            
            <OptionGroup
              label="Disk Space"
              description="Storage capacity"
              options={[16, 20, 24, 32] as const}
              value={diskGb}
              onChange={setDiskGb}
              format={(v) => `${v} GB`}
              disabled={creating}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="gap-2">
              {creating && <Loader2 className="size-4 animate-spin" />}
              {creating ? "Creating..." : "Create Container"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
