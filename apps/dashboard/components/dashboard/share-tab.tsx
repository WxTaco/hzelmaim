"use client";

import { useState } from "react";
import { Mail, Loader2, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// ── Permission bit constants (must mirror backend/src/models/container.rs) ──
const PERM_VIEW         = 0b0000_0001; //   1
const PERM_READ_METRICS = 0b0000_0010; //   2
const PERM_START_STOP   = 0b0000_0100; //   4
const PERM_TERMINAL     = 0b0000_1000; //   8
const PERM_WEBHOOKS     = 0b0001_0000; //  16
const PERM_NETWORKS     = 0b0010_0000; //  32
const PERM_SHARE        = 0b0100_0000; //  64
const PERM_DELETE       = 0b1000_0000; // 128

interface PermOption {
  bit: number;
  label: string;
  description: string;
}

const PERM_OPTIONS: PermOption[] = [
  { bit: PERM_VIEW,         label: "View",       description: "See the VPS in the list and view its details" },
  { bit: PERM_READ_METRICS, label: "Metrics",    description: "Read resource metrics (CPU, memory, network)" },
  { bit: PERM_START_STOP,   label: "Start / Stop", description: "Start, stop, and restart the VPS" },
  { bit: PERM_TERMINAL,     label: "Terminal",   description: "Open an interactive terminal session" },
  { bit: PERM_WEBHOOKS,     label: "Webhooks",   description: "Create, edit, and delete webhook configurations" },
  { bit: PERM_NETWORKS,     label: "Networks",   description: "Attach and detach private networks" },
  { bit: PERM_SHARE,        label: "Share",      description: "Invite other users to access this VPS" },
  { bit: PERM_DELETE,       label: "Delete",     description: "Delete this VPS (destructive)" },
];

interface ShareTabProps {
  containerId: string;
  /** The calling user's own permission bitmask; controls which checkboxes are available. */
  userPermissions: number;
}

/**
 * Sharing tab for the container detail page.
 *
 * Lets users with PERM_SHARE invite another registered user by email and
 * choose exactly which permissions to grant — limited to what the inviter
 * themselves holds.
 */
export function ShareTab({ containerId, userPermissions }: ShareTabProps) {
  const [email, setEmail] = useState("");
  // Default: grant PERM_VIEW | PERM_READ_METRICS (classic viewer preset)
  const [selectedPerms, setSelectedPerms] = useState(PERM_VIEW | PERM_READ_METRICS);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const toggleBit = (bit: number) => {
    if (bit === PERM_VIEW) return; // PERM_VIEW is always required
    setSelectedPerms((p) => (p & bit ? p & ~bit : p | bit));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await apiFetch(`/api/v1/containers/${containerId}/share`, {
        method: "POST",
        body: JSON.stringify({ email, permissions: selectedPerms }),
      });
      setMsg({ type: "ok", text: `Invitation sent to ${email}` });
      setEmail("");
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to send invitation" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-muted-foreground" />
            Share VPS
          </CardTitle>
          <CardDescription>
            Invite a registered user by email and choose which permissions to grant.
            You can only grant permissions you hold yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Email input + submit */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="share-email" className="sr-only">Email address</Label>
              <Input
                id="share-email"
                type="email"
                required
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <Button type="submit" disabled={submitting} className="gap-1.5 shrink-0">
              {submitting ? (
                <><Loader2 className="size-4 animate-spin" />Sending…</>
              ) : (
                <><Mail className="size-4" />Send Invite</>
              )}
            </Button>
          </form>

          {/* Permission checkboxes */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Permissions to grant</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERM_OPTIONS.map(({ bit, label, description }) => {
                const available = (userPermissions & bit) === bit;
                const checked   = (selectedPerms & bit) === bit;
                const locked    = bit === PERM_VIEW; // always on
                return (
                  <label
                    key={bit}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      !available ? "opacity-40 cursor-not-allowed" : checked ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!available || locked}
                      onCheckedChange={() => toggleBit(bit)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium leading-none">
                        {label}
                        {locked && <span className="ml-1 text-xs text-muted-foreground">(required)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {msg && (
            <p
              className={`text-xs ${msg.type === "ok" ? "text-green-500" : "text-destructive"}`}
              role={msg.type === "err" ? "alert" : "status"}
            >
              {msg.text}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
