"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Webhook, Plus, Trash2, Pencil, ChevronDown, ChevronUp,
  Loader2, Copy, Check, Clock, GitBranch, Terminal,
  FolderOpen, Shield,
} from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WebhookConfig {
  id: string;
  container_id: string;
  provider: string;
  webhook_secret: string;
  branch: string;
  working_dir: string;
  post_pull_cmd: string;
  created_at: string;
  updated_at: string;
}

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  delivery_id: string;
  provider: string;
  event_type: string;
  branch: string;
  head_commit_id: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  error_message: string | null;
  received_at: string;
  completed_at: string | null;
}

interface ApiResponse<T> { data: T }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary ring-1 ring-primary/20">
      {provider}
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: WebhookDelivery["status"] }) {
  const styles: Record<string, string> = {
    succeeded: "bg-green-500/10 text-green-500 ring-green-500/20",
    failed: "bg-destructive/10 text-destructive ring-destructive/20",
    running: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    pending: "bg-muted text-muted-foreground ring-foreground/10",
    skipped: "bg-muted text-muted-foreground ring-foreground/10",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
      styles[status] ?? styles.pending,
    )}>
      {status}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}


// ── WebhookForm (shared between create and edit) ──────────────────────────────

interface WebhookFormState {
  provider: string;
  webhook_secret: string;
  branch: string;
  working_dir: string;
  post_pull_cmd: string;
}

function WebhookFormFields({
  values,
  onChange,
  disabled,
  showSecret,
}: {
  values: WebhookFormState;
  onChange: (patch: Partial<WebhookFormState>) => void;
  disabled: boolean;
  showSecret: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="wh-provider">Provider</Label>
        <select
          id="wh-provider"
          value={values.provider}
          onChange={(e) => onChange({ provider: e.target.value })}
          disabled={disabled}
          className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="github">GitHub</option>
          <option value="forgejo">Forgejo</option>
        </select>
      </div>

      {showSecret && (
        <div className="space-y-1.5">
          <Label htmlFor="wh-secret">
            Webhook Secret <span className="text-destructive">*</span>
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(16–512 chars)</span>
          </Label>
          <Input
            id="wh-secret"
            type="text"
            placeholder="my-secret-token"
            value={values.webhook_secret}
            onChange={(e) => onChange({ webhook_secret: e.target.value })}
            disabled={disabled}
            minLength={16}
            maxLength={512}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="wh-branch">
          Branch <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wh-branch"
          placeholder="main"
          value={values.branch}
          onChange={(e) => onChange({ branch: e.target.value })}
          disabled={disabled}
          maxLength={255}
        />
        <p className="text-xs text-muted-foreground">Deploy only on pushes to this branch.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wh-workdir">
          Working Directory <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wh-workdir"
          placeholder="/var/www/myapp"
          value={values.working_dir}
          onChange={(e) => onChange({ working_dir: e.target.value })}
          disabled={disabled}
          maxLength={4096}
        />
        <p className="text-xs text-muted-foreground">Absolute path inside the container.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wh-cmd">
          Deploy Command <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wh-cmd"
          placeholder="git pull && systemctl restart myapp"
          value={values.post_pull_cmd}
          onChange={(e) => onChange({ post_pull_cmd: e.target.value })}
          disabled={disabled}
          maxLength={4096}
        />
        <p className="text-xs text-muted-foreground">Run verbatim inside the container after a push.</p>
      </div>
    </div>
  );
}


// ── CreateWebhookDialog ───────────────────────────────────────────────────────

function CreateWebhookDialog({
  open,
  onOpenChange,
  containerId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  containerId: string;
  onCreated: (cfg: WebhookConfig) => void;
}) {
  const EMPTY: WebhookFormState = { provider: "github", webhook_secret: "", branch: "main", working_dir: "", post_pull_cmd: "" };
  const [values, setValues] = useState<WebhookFormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (v: boolean) => {
    if (!saving) { onOpenChange(v); if (!v) { setValues(EMPTY); setError(null); } }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await apiFetch<ApiResponse<WebhookConfig>>(
        `/api/v1/containers/${containerId}/webhooks`,
        { method: "POST", body: JSON.stringify(values) }
      );
      onCreated(res.data);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogDescription>
            Configure a webhook to auto-deploy when you push to your repository.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <WebhookFormFields
            values={values}
            onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
            disabled={saving}
            showSecret
          />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Adding…" : "Add Webhook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── EditWebhookDialog ─────────────────────────────────────────────────────────

function EditWebhookDialog({
  open,
  onOpenChange,
  config,
  containerId,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: WebhookConfig;
  containerId: string;
  onUpdated: (cfg: WebhookConfig) => void;
}) {
  const initial: WebhookFormState = {
    provider: config.provider,
    webhook_secret: config.webhook_secret,
    branch: config.branch,
    working_dir: config.working_dir,
    post_pull_cmd: config.post_pull_cmd,
  };
  const [values, setValues] = useState<WebhookFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when config changes (dialog reopened for a different webhook).
  useEffect(() => {
    setValues({
      provider: config.provider, webhook_secret: config.webhook_secret,
      branch: config.branch, working_dir: config.working_dir, post_pull_cmd: config.post_pull_cmd,
    });
  }, [config]);

  const handleOpenChange = (v: boolean) => {
    if (!saving) { onOpenChange(v); if (!v) setError(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await apiFetch<ApiResponse<WebhookConfig>>(
        `/api/v1/containers/${containerId}/webhooks/${config.id}`,
        { method: "PATCH", body: JSON.stringify(values) }
      );
      onUpdated(res.data);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update webhook");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
          <DialogDescription>Update this webhook's configuration.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <WebhookFormFields
            values={values}
            onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
            disabled={saving}
            showSecret
          />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// ── DeliveryHistory ───────────────────────────────────────────────────────────

function DeliveryHistory({ webhookId, containerId }: { webhookId: string; containerId: string }) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<ApiResponse<WebhookDelivery[]>>(
      `/api/v1/containers/${containerId}/webhooks/${webhookId}/deliveries?limit=20`
    )
      .then((r) => setDeliveries(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load deliveries"))
      .finally(() => setLoading(false));
  }, [webhookId, containerId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading deliveries…
    </div>
  );
  if (error) return <p className="text-sm text-destructive py-2">{error}</p>;
  if (!deliveries?.length) return (
    <p className="text-sm text-muted-foreground py-2 italic">No deliveries yet. Push to your repo to trigger the first deployment.</p>
  );

  return (
    <div className="space-y-1.5">
      {deliveries.map((d) => (
        <div key={d.id} className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <DeliveryStatusBadge status={d.status} />
              {d.event_type === "push" && (
                <span className="font-mono text-muted-foreground truncate max-w-[80px]" title={d.head_commit_id}>
                  {d.head_commit_id.slice(0, 7)}
                </span>
              )}
              {d.branch && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <GitBranch className="size-3 shrink-0" />{d.branch}
                </span>
              )}
            </div>
            <span className="text-muted-foreground whitespace-nowrap shrink-0" title={fmt(d.received_at)}>
              {fmtRelative(d.received_at)}
            </span>
          </div>
          {d.error_message && (
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[10px] text-destructive bg-destructive/5 rounded px-2 py-1.5">
              {d.error_message}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

// ── WebhookRow ────────────────────────────────────────────────────────────────

function WebhookRow({
  config,
  containerId,
  onDeleted,
  onUpdated,
}: {
  config: WebhookConfig;
  containerId: string;
  onDeleted: (id: string) => void;
  onUpdated: (cfg: WebhookConfig) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const webhookUrl = `${API_URL}/webhooks/${config.id}`;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/containers/${containerId}/webhooks/${config.id}`, { method: "DELETE" });
      onDeleted(config.id);
    } finally { setDeleting(false); setDeleteOpen(false); }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Summary row */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/40 transition-colors"
        >
          <Webhook className="size-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
            <ProviderBadge provider={config.provider} />
            <span className="flex items-center gap-1 text-sm font-medium">
              <GitBranch className="size-3.5 text-muted-foreground" />{config.branch}
            </span>
            <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[200px]" title={config.working_dir}>
              {config.working_dir}
            </span>
          </div>
          {expanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-border/60 px-4 py-4 space-y-4">
            {/* Webhook URL */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payload URL</p>
              <div className="flex items-center gap-1 font-mono text-xs bg-muted rounded-md px-3 py-2 break-all">
                <span className="flex-1">{webhookUrl}</span>
                <CopyButton value={webhookUrl} />
              </div>
              <p className="text-xs text-muted-foreground">Paste this URL into your repository's webhook settings.</p>
            </div>

            <Separator />

            {/* Config details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <FolderOpen className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground mb-0.5">Working dir</p>
                  <p className="font-mono break-all">{config.working_dir}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Terminal className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground mb-0.5">Deploy command</p>
                  <p className="font-mono break-all">{config.post_pull_cmd}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <Shield className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground mb-0.5">Secret</p>
                  <div className="flex items-center gap-1">
                    <span className="font-mono tracking-widest">{"•".repeat(Math.min(config.webhook_secret.length, 24))}</span>
                    <CopyButton value={config.webhook_secret} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Created {fmt(config.created_at)}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" />Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-3.5" />Delete
                </Button>
              </div>
            </div>

            <Separator />

            {/* Delivery history */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Deliveries</p>
              </div>
              <DeliveryHistory webhookId={config.id} containerId={containerId} />
            </div>
          </div>
        )}
      </div>

      <EditWebhookDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        config={config}
        containerId={containerId}
        onUpdated={onUpdated}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Webhook"
        description={`This will permanently delete the webhook for branch "${config.branch}". All delivery history will also be removed.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}


// ── WebhooksTab (main export) ─────────────────────────────────────────────────

export function WebhooksTab({ containerId }: { containerId: string }) {
  const [configs, setConfigs] = useState<WebhookConfig[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResponse<WebhookConfig[]>>(
        `/api/v1/containers/${containerId}/webhooks`
      );
      setConfigs(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (cfg: WebhookConfig) =>
    setConfigs((prev) => [cfg, ...(prev ?? [])]);

  const handleDeleted = (id: string) =>
    setConfigs((prev) => (prev ?? []).filter((c) => c.id !== id));

  const handleUpdated = (updated: WebhookConfig) =>
    setConfigs((prev) => (prev ?? []).map((c) => (c.id === updated.id ? updated : c)));

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">Webhooks</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-deploy your app when you push to a branch.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setCreateOpen(true)}
          disabled={loading}
        >
          <Plus className="size-4" />
          Add Webhook
        </Button>
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && configs?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Webhook className="size-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base mb-1">No webhooks yet</CardTitle>
              <CardDescription className="max-w-xs">
                Add a webhook to automatically pull the latest code and restart your app every time you push.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1.5 mt-1" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />Add Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && configs && configs.length > 0 && (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <WebhookRow
              key={cfg.id}
              config={cfg}
              containerId={containerId}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      <CreateWebhookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        containerId={containerId}
        onCreated={handleCreated}
      />
    </div>
  );
}
