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
  unavailableOptions = [],
}: {
  label: string;
  description?: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
  disabled?: boolean;
  unavailableOptions?: readonly T[];
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
        {options.map((opt) => {
          const isUnavailable = unavailableOptions.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => !isUnavailable && onChange(opt)}
              disabled={disabled || isUnavailable}
              className={cn(
                "relative rounded-lg px-3.5 py-2 text-sm font-medium ring-1 ring-inset transition-all duration-200 overflow-hidden",
                value === opt && !isUnavailable
                  ? "bg-primary text-primary-foreground ring-primary shadow-lg shadow-primary/20"
                  : "bg-card text-muted-foreground ring-foreground/10",
                !isUnavailable && value !== opt && "hover:text-foreground hover:ring-foreground/20 hover:bg-accent",
                (disabled || isUnavailable) && "cursor-not-allowed",
                isUnavailable && "opacity-60"
              )}
              title={isUnavailable ? "This option is not available" : undefined}
            >
              {/* Red diagonal stripes for unavailable options */}
              {isUnavailable && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `repeating-linear-gradient(
                      -45deg,
                      transparent,
                      transparent 4px,
                      rgba(239, 68, 68, 0.3) 4px,
                      rgba(239, 68, 68, 0.3) 8px
                    )`,
                  }}
                />
              )}
              <span className={cn("relative", isUnavailable && "line-through decoration-red-500/70")}>
                {format(opt)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CreateContainerDialog({ open, onOpenChange, onSubmit }: CreateContainerDialogProps) {
  const [hostname, setHostname] = useState("");
  const [cpuCores, setCpuCores] = useState<1 | 2 | 4 | 8>(1);
  const [memoryMb, setMemoryMb] = useState<512 | 1024 | 2048 | 4096>(512);
  const [diskGb, setDiskGb] = useState<16 | 20 | 24 | 32>(32);
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
      setDiskGb(32);
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
              placeholder="mycontainer"
              value={hostname}
              onChange={(e) => {
                // Only allow alphanumeric characters (letters and numbers)
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                setHostname(sanitized);
              }}
              disabled={creating}
              className="h-10"
              autoFocus
              pattern="[a-zA-Z0-9]*"
            />
            <p className="text-xs text-muted-foreground">Only letters and numbers allowed</p>
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
              unavailableOptions={[16, 20, 24] as const}
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
