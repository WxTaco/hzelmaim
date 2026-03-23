"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ShieldCheck, Plus, Send, Users, Loader2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"

const EASE = [0.22, 1, 0.36, 1] as const

interface Program {
  id: string
  name: string
  description: string
  created_at: string
  can_create_containers: boolean
}

interface ApiResponse<T> {
  data: T
}

export default function AdminPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  // Create-program form
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newCanCreate, setNewCanCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Invite form
  const [inviteProgramId, setInviteProgramId] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const loadPrograms = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse<Program[]>>("/api/v1/programs")
      setPrograms(res.data)
    } catch {
      // silently ignore for now
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPrograms() }, [loadPrograms])

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      await apiFetch("/api/v1/programs", {
        method: "POST",
        body: JSON.stringify({ name: newName, description: newDesc, can_create_containers: newCanCreate }),
      })
      setNewName("")
      setNewDesc("")
      setNewCanCreate(false)
      await loadPrograms()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create program")
    } finally {
      setCreating(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    try {
      await apiFetch(`/api/v1/programs/${inviteProgramId}/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail }),
      })
      setInviteEmail("")
      setInviteMsg({ type: "ok", text: `Invitation sent to ${inviteEmail}` })
    } catch (err) {
      setInviteMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to send invite" })
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage programs and send invitations to users.</p>
      </motion.div>

      {/* Invite to Program — first section */}
      <motion.div className="rounded-xl bg-card ring-1 ring-foreground/10 px-6 py-5 space-y-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: EASE }}>
        <div className="flex items-center gap-2">
          <Send className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invite User to Program</p>
        </div>

        <form onSubmit={handleInvite} className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Program</label>
            <select
              value={inviteProgramId}
              onChange={(e) => setInviteProgramId(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a program…</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">User Email</label>
            <input
              type="email" required placeholder="user@example.com"
              value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {inviteMsg && (
            <p className={`text-xs ${inviteMsg.type === "ok" ? "text-green-500" : "text-destructive"}`}>{inviteMsg.text}</p>
          )}
          <Button type="submit" disabled={inviting || !inviteProgramId} size="sm">
            {inviting ? <><Loader2 className="size-3.5 mr-2 animate-spin" />Sending…</> : <><Send className="size-3.5 mr-2" />Send Invitation</>}
          </Button>
        </form>
      </motion.div>

      {/* Programs list + create */}
      <motion.div className="rounded-xl bg-card ring-1 ring-foreground/10 px-6 py-5 space-y-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: EASE }}>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Programs</p>
        </div>

        {/* Existing programs */}
        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No programs yet. Create one below.</p>
        ) : (
          <div className="space-y-2">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/admin/programs/${p.id}`}
                className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 hover:bg-muted transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{p.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground line-clamp-1">{p.description}</span>
                    {p.can_create_containers && (
                      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        CT creation
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        )}

        {/* Create program form */}
        <form onSubmit={handleCreateProgram} className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Plus className="size-3.5" />New Program</p>
          <input
            required placeholder="Program name"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            required placeholder="Description shown to invited users…"
            rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newCanCreate}
              onChange={(e) => setNewCanCreate(e.target.checked)}
              className="size-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">Allow members to create containers</span>
          </label>
          {createError && <p className="text-xs text-destructive">{createError}</p>}
          <Button type="submit" disabled={creating} size="sm">
            {creating ? <><Loader2 className="size-3.5 mr-2 animate-spin" />Creating…</> : <><Plus className="size-3.5 mr-2" />Create Program</>}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}

