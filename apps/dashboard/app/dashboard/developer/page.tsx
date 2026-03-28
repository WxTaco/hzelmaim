"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Code2, Plus, Trash2, Loader2, Copy, Check,
  TriangleAlert, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const EASE = [0.22, 1, 0.36, 1] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface OAuthApp {
  id: string
  name: string
  description: string | null
  client_id: string
  client_secret_prefix: string
  redirect_uris: string[]
  created_at: string
  revoked_at: string | null
}

interface ApiResponse<T> { data: T }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeveloperPage() {
  const [apps, setApps] = useState<OAuthApp[]>([])
  const [loading, setLoading] = useState(true)
  // newly-revealed secret (shown once after create or rotate)
  const [secret, setSecret] = useState<{ appName: string; value: string } | null>(null)

  const loadApps = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse<OAuthApp[]>>("/api/v1/oauth/apps")
      setApps(res.data)
    } catch { /* silently ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadApps() }, [loadApps])

  const handleCreated = (app: OAuthApp, rawSecret: string) => {
    setApps((prev) => [app, ...prev])
    setSecret({ appName: app.name, value: rawSecret })
  }

  const handleRevealedSecret = (appName: string, rawSecret: string) => {
    setSecret({ appName, value: rawSecret })
  }

  const handleDeleted = (appId: string) => {
    setApps((prev) => prev.filter((a) => a.id !== appId))
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Code2 className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Developer</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage OAuth applications that can act on behalf of users via the API.
        </p>
      </motion.div>

      {/* One-time secret banner */}
      {secret && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <SecretBanner
            appName={secret.appName}
            value={secret.value}
            onDismiss={() => setSecret(null)}
          />
        </motion.div>
      )}

      {/* App list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: EASE }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="size-4 text-muted-foreground" />
              OAuth Applications
            </CardTitle>
            <CardDescription>
              Third-party apps you have registered. Each app gets a{" "}
              <code className="text-xs">client_id</code> and a{" "}
              <code className="text-xs">client_secret</code> shown only once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Code2 className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No OAuth apps yet</p>
                <p className="text-xs mt-1">Create one below to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {apps.map((app) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    onRotated={(raw) => handleRevealedSecret(app.name, raw)}
                    onDeleted={() => handleDeleted(app.id)}
                  />
                ))}
              </div>
            )}

            <Separator />
            <CreateAppForm onCreated={handleCreated} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}


// ── SecretBanner ──────────────────────────────────────────────────────────────

function SecretBanner({ appName, value, onDismiss }: {
  appName: string; value: string; onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-500">
          <TriangleAlert className="size-4 shrink-0" />
          <p className="text-sm font-medium">
            Copy the client secret for <strong>{appName}</strong> — it won&apos;t be shown again.
          </p>
        </div>
        <button onClick={onDismiss} className="text-amber-500/60 hover:text-amber-500 text-xs shrink-0">
          Dismiss
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs break-all select-all">
          {value}
        </code>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={copy} aria-label="Copy secret">
          {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

// ── AppRow ────────────────────────────────────────────────────────────────────

function AppRow({ app, onRotated, onDeleted }: {
  app: OAuthApp
  onRotated: (rawSecret: string) => void
  onDeleted: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const copyClientId = async () => {
    await navigator.clipboard.writeText(app.client_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleRotate = async () => {
    setRotating(true)
    try {
      const res = await apiFetch<ApiResponse<{ client_secret: string }>>(
        `/api/v1/oauth/apps/${app.id}/secret`, { method: "POST" }
      )
      onRotated(res.data.client_secret)
    } catch { /* silently ignore */ }
    finally { setRotating(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiFetch(`/api/v1/oauth/apps/${app.id}`, { method: "DELETE" })
      onDeleted()
    } catch { /* silently ignore */ }
    finally { setDeleting(false) }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{app.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {app.client_id.slice(0, 8)}…
            <span className="font-sans ml-2">Created {fmt(app.created_at)}</span>
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {app.description && (
            <p className="text-xs text-muted-foreground">{app.description}</p>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border border-border bg-background px-3 py-1.5 font-mono text-xs break-all">
                {app.client_id}
              </code>
              <Button variant="ghost" size="icon-sm" onClick={copyClientId} aria-label="Copy client ID">
                {copiedId ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client Secret</p>
            <p className="font-mono text-xs text-muted-foreground">{app.client_secret_prefix}…</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Redirect URIs</p>
            <ul className="space-y-0.5">
              {app.redirect_uris.map((uri) => (
                <li key={uri} className="font-mono text-xs text-muted-foreground break-all">{uri}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
              {rotating ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="size-3.5 mr-1.5" />}
              Rotate secret
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Trash2 className="size-3.5 mr-1.5" />}
              Delete app
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CreateAppForm ─────────────────────────────────────────────────────────────

function CreateAppForm({ onCreated }: {
  onCreated: (app: OAuthApp, rawSecret: string) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [uris, setUris] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const redirect_uris = uris.split("\n").map((s) => s.trim()).filter(Boolean)
    if (!redirect_uris.length) { setError("At least one redirect URI is required."); return }
    setCreating(true); setError(null)
    try {
      const res = await apiFetch<ApiResponse<{ client_secret: string } & OAuthApp>>(
        "/api/v1/oauth/apps",
        { method: "POST", body: JSON.stringify({ name: name.trim(), description: description.trim() || null, redirect_uris }) }
      )
      const { client_secret, ...app } = res.data
      onCreated(app, client_secret)
      setName(""); setDescription(""); setUris("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create app.")
    } finally { setCreating(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium">New OAuth Application</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="app-name">Name <span className="text-destructive">*</span></Label>
          <Input id="app-name" required placeholder="My integration" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-desc">Description</Label>
          <Input id="app-desc" placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="app-uris">
          Redirect URIs <span className="text-destructive">*</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">one per line</span>
        </Label>
        <textarea
          id="app-uris"
          required
          rows={3}
          placeholder={"https://myapp.example.com/callback\nhttp://localhost:3000/callback"}
          value={uris}
          onChange={(e) => setUris(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      <Button type="submit" disabled={creating || !name.trim() || !uris.trim()}>
        {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Plus className="size-4 mr-1.5" />}
        Create application
      </Button>
    </form>
  )
}
