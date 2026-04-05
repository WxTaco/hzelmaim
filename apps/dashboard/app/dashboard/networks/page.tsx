"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Network, Plus, Trash2, Loader2, ChevronDown, ChevronUp,
  UserMinus, UserPlus, Pencil, Check, X,
} from "lucide-react"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const EASE = [0.22, 1, 0.36, 1] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrivateNetwork {
  id: string
  owner_user_id: string
  name: string
  bridge_name: string
  bridge_id: number
  cidr: string
  state: "creating" | "active" | "deleting" | "failed"
  created_at: string
}

interface NetworkMember {
  id: string
  network_id: string
  container_id: string
  private_ip: string
  net_index: number
  state: "attaching" | "active" | "detaching" | "failed"
  created_at: string
}

interface Container {
  id: string
  name: string
  state: string
}

interface ApiResponse<T> { data: T }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function StateBadge({ state }: { state: string }) {
  const colours: Record<string, string> = {
    active: "bg-green-500/15 text-green-400",
    creating: "bg-blue-500/15 text-blue-400",
    attaching: "bg-blue-500/15 text-blue-400",
    deleting: "bg-amber-500/15 text-amber-400",
    detaching: "bg-amber-500/15 text-amber-400",
    failed: "bg-destructive/15 text-destructive",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colours[state] ?? "bg-muted text-muted-foreground"}`}>
      {state}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NetworksPage() {
  const [networks, setNetworks] = useState<PrivateNetwork[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [netRes, ctRes] = await Promise.all([
        apiFetch<ApiResponse<PrivateNetwork[]>>("/api/v1/networks"),
        apiFetch<ApiResponse<Container[]>>("/api/v1/containers"),
      ])
      setNetworks(netRes.data)
      setContainers(ctRes.data)
    } catch { /* silently ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreated = (n: PrivateNetwork) => setNetworks((prev) => [n, ...prev])
  const handleDeleted = (id: string) => setNetworks((prev) => prev.filter((n) => n.id !== id))
  const handleRenamed = (id: string, name: string) =>
    setNetworks((prev) => prev.map((n) => n.id === id ? { ...n, name } : n))

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Network className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Networks</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Private overlay networks that connect your VPS with fixed IPs.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: EASE }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="size-4 text-muted-foreground" />
              Your Networks
            </CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${networks.length} network${networks.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : networks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No networks yet</p>
                <p className="text-xs mt-1">Create one below to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {networks.map((n) => (
                  <NetworkRow
                    key={n.id}
                    network={n}
                    containers={containers}
                    onDeleted={() => handleDeleted(n.id)}
                    onRenamed={(name) => handleRenamed(n.id, name)}
                  />
                ))}
              </div>
            )}

            <Separator />
            <CreateNetworkForm onCreated={handleCreated} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}


// ── NetworkRow ─────────────────────────────────────────────────────────────

function NetworkRow({
  network, containers, onDeleted, onRenamed,
}: {
  network: PrivateNetwork
  containers: Container[]
  onDeleted: () => void
  onRenamed: (name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [members, setMembers] = useState<NetworkMember[]>([])
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(network.name)
  const [savingName, setSavingName] = useState(false)
  const [selectedCt, setSelectedCt] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse<NetworkMember[]>>(`/api/v1/networks/${network.id}/members`)
      setMembers(res.data)
      setMembersLoaded(true)
    } catch { /* ignore */ }
  }, [network.id])

  const handleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !membersLoaded) loadMembers()
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiFetch(`/api/v1/networks/${network.id}`, { method: "DELETE" })
      onDeleted()
    } catch { /* ignore */ }
    finally { setDeleting(false) }
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || newName.trim() === network.name) { setRenaming(false); return }
    setSavingName(true)
    try {
      await apiFetch(`/api/v1/networks/${network.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: newName.trim() }),
      })
      onRenamed(newName.trim())
      setRenaming(false)
    } catch { /* ignore */ }
    finally { setSavingName(false) }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCt) return
    setAdding(true); setAddError(null)
    try {
      await apiFetch(`/api/v1/networks/${network.id}/members`, {
        method: "POST",
        body: JSON.stringify({ container_id: selectedCt }),
      })
      setSelectedCt("")
      await loadMembers()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member.")
    } finally { setAdding(false) }
  }

  const handleRemoveMember = async (containerId: string) => {
    setRemovingId(containerId)
    try {
      await apiFetch(`/api/v1/networks/${network.id}/members/${containerId}`, { method: "DELETE" })
      setMembers((prev) => prev.filter((m) => m.container_id !== containerId))
    } catch { /* ignore */ }
    finally { setRemovingId(null) }
  }

  const ctName = (id: string) => containers.find((c) => c.id === id)?.name ?? id.slice(0, 8) + "…"
  const attachedIds = new Set(members.map((m) => m.container_id))
  const available = containers.filter((c) => !attachedIds.has(c.id))

  return (
    <div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{network.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {network.cidr}
            <span className="font-sans ml-2 inline-flex items-center gap-1.5">
              <StateBadge state={network.state} />
              <span>Created {fmt(network.created_at)}</span>
            </span>
          </p>
        </div>
        <button
          onClick={handleExpand}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Bridge</p>
              <p className="font-mono">{network.bridge_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wide font-medium mb-0.5">CIDR</p>
              <p className="font-mono">{network.cidr}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members</p>
            {!membersLoaded ? (
              <div className="h-8 rounded bg-muted animate-pulse" />
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground">No containers attached yet.</p>
            ) : (
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ctName(m.container_id)}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {m.private_ip} · <StateBadge state={m.state} />
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(m.container_id)}
                      disabled={removingId === m.container_id}
                      aria-label={`Remove ${ctName(m.container_id)}`}
                    >
                      {removingId === m.container_id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <UserMinus className="size-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {available.length > 0 && (
              <form onSubmit={handleAddMember} className="flex gap-2">
                <select
                  value={selectedCt}
                  onChange={(e) => setSelectedCt(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Select container to add"
                >
                  <option value="">Add a container…</option>
                  {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button type="submit" size="sm" disabled={adding || !selectedCt}>
                  {adding ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5 mr-1" />}
                  Add
                </Button>
              </form>
            )}
            {addError && <p className="text-xs text-destructive" role="alert">{addError}</p>}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rename</p>
            {renaming ? (
              <form onSubmit={handleRename} className="flex gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="h-7 text-xs flex-1" maxLength={100} autoFocus />
                <Button type="submit" size="icon-sm" disabled={savingName} aria-label="Save name">
                  {savingName ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </Button>
                <Button type="button" variant="ghost" size="icon-sm"
                  onClick={() => { setRenaming(false); setNewName(network.name) }} aria-label="Cancel">
                  <X className="size-3.5" />
                </Button>
              </form>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setRenaming(true)}>
                <Pencil className="size-3.5 mr-1.5" />Rename
              </Button>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Danger Zone</p>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Trash2 className="size-3.5 mr-1.5" />}
              Delete network
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CreateNetworkForm ──────────────────────────────────────────────────────────

function CreateNetworkForm({ onCreated }: { onCreated: (n: PrivateNetwork) => void }) {
  const [name, setName] = useState("")
  const [cidr, setCidr] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true); setError(null)
    try {
      const res = await apiFetch<ApiResponse<PrivateNetwork>>("/api/v1/networks", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), cidr: cidr.trim() }),
      })
      onCreated(res.data)
      setName(""); setCidr("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create network.")
    } finally { setCreating(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium">New Network</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="net-name">Name <span className="text-destructive">*</span></Label>
          <Input id="net-name" required placeholder="e.g. dev-internal" value={name}
            onChange={(e) => setName(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="net-cidr">
            CIDR <span className="text-destructive">*</span>
            <span className="ml-2 text-xs font-normal text-muted-foreground">RFC 1918, /16–/28</span>
          </Label>
          <Input id="net-cidr" required placeholder="e.g. 10.42.0.0/24" value={cidr}
            onChange={(e) => setCidr(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      <Button type="submit" disabled={creating || !name.trim() || !cidr.trim()}>
        {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Plus className="size-4 mr-1.5" />}
        Create network
      </Button>
    </form>
  )
}
