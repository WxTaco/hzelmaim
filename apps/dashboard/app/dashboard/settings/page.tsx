"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Settings,
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  TriangleAlert,
} from "lucide-react"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const EASE = [0.22, 1, 0.36, 1] as const

interface ApiToken {
  id: string
  name: string
  prefix: string
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  revoked_at: string | null
}

interface ApiResponse<T> {
  data: T
}

// Create response is a flattened ApiToken + `token` field.
interface CreatedToken extends ApiToken {
  token: string
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function SettingsPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newlyCreated, setNewlyCreated] = useState<CreatedToken | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse<ApiToken[]>>("/api/v1/tokens")
      setTokens(res.data)
    } catch {
      // silently ignore — stale list is better than a crash
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTokens() }, [loadTokens])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setNewlyCreated(null)
    try {
      const res = await apiFetch<ApiResponse<CreatedToken>>("/api/v1/tokens", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      })
      setNewName("")
      setNewlyCreated(res.data)
      setTokens((prev) => [res.data, ...prev])
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create token")
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (tokenId: string) => {
    setRevoking(tokenId)
    try {
      await apiFetch(`/api/v1/tokens/${tokenId}`, { method: "DELETE" })
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
      if (newlyCreated?.id === tokenId) setNewlyCreated(null)
    } catch {
      // silently ignore
    } finally {
      setRevoking(null)
    }
  }

  const handleCopy = async () => {
    if (!newlyCreated) return
    await navigator.clipboard.writeText(newlyCreated.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Settings className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and Personal Access Tokens.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              Personal Access Tokens
            </CardTitle>
            <CardDescription>
              Tokens let scripts and tools authenticate as you via the API.
              The secret is shown <strong>only once</strong> at creation time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* One-time reveal banner */}
            {newlyCreated && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-500">
                  <TriangleAlert className="size-4 shrink-0" />
                  <p className="text-sm font-medium">
                    Copy your token now — it won&apos;t be shown again.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs break-all select-all">
                    {newlyCreated.token}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopy}
                    aria-label="Copy token"
                  >
                    {copied
                      ? <Check className="size-4 text-green-500" />
                      : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Token list */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <KeyRound className="size-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No tokens yet</p>
                <p className="text-xs mt-1">Create one below to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3"
                  >
                    <KeyRound className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {t.prefix}&hellip;
                        <span className="font-sans ml-2">
                          Created {formatDate(t.created_at)}
                          {" · "}
                          Last used: {formatDate(t.last_used_at)}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevoke(t.id)}
                      disabled={revoking === t.id}
                      aria-label={`Revoke token ${t.name}`}
                    >
                      {revoking === t.id
                        ? <Loader2 className="size-4 animate-spin" />
                        : <Trash2 className="size-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Create form */}
            <form onSubmit={handleCreate} className="space-y-3">
              <Label htmlFor="token-name">New Token</Label>
              <div className="flex gap-2">
                <Input
                  id="token-name"
                  required
                  placeholder="e.g. CI pipeline, local dev"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={100}
                  className="flex-1"
                />
                <Button type="submit" disabled={creating || !newName.trim()}>
                  {creating
                    ? <Loader2 className="size-4 animate-spin" />
                    : <><Plus className="size-4 mr-1.5" />Generate</>}
                </Button>
              </div>
              {createError && (
                <p className="text-xs text-destructive" role="alert">{createError}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

