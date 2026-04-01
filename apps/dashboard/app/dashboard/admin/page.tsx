"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ShieldCheck, Plus, Send, Users, Loader2, ChevronRight, Mail, Clock } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

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
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage programs and send invitations to users.</p>
      </motion.div>

      {/* Tabbed Interface */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
      >
        <Tabs defaultValue="programs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="programs" className="gap-1.5">
              <Users className="size-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1.5">
              <Mail className="size-4" />
              Invitations
            </TabsTrigger>
          </TabsList>

          {/* Programs Tab */}
          <TabsContent value="programs" className="space-y-6">
            {/* Programs List Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  All Programs
                </CardTitle>
                <CardDescription>
                  {loading ? "Loading programs..." : `${programs.length} program${programs.length !== 1 ? "s" : ""} configured`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : programs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="size-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No programs yet</p>
                    <p className="text-xs mt-1">Create your first program below to get started</p>
                  </div>
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
              </CardContent>
            </Card>

            {/* Create Program Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="size-4 text-muted-foreground" />
                  Create New Program
                </CardTitle>
                <CardDescription>
                  Set up a new program that users can be invited to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProgram} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="program-name">Program Name</Label>
                    <Input
                      id="program-name"
                      required
                      placeholder="e.g. Development Team"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program-description">Description</Label>
                    <textarea
                      id="program-description"
                      required
                      placeholder="Describe what this program is for..."
                      rows={3}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newCanCreate}
                      onChange={(e) => setNewCanCreate(e.target.checked)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-foreground">Allow members to create VPS</span>
                  </label>
                  {createError && (
                    <p className="text-xs text-destructive" role="alert">{createError}</p>
                  )}
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="size-4 mr-2" />
                        Create Program
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            {/* Send Invitation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-4 text-muted-foreground" />
                  Send Invitation
                </CardTitle>
                <CardDescription>
                  Invite a user to join a program by email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-program">Program</Label>
                    <select
                      id="invite-program"
                      value={inviteProgramId}
                      onChange={(e) => setInviteProgramId(e.target.value)}
                      required
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-describedby="invite-program-help"
                    >
                      <option value="">Select a program...</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <p id="invite-program-help" className="text-xs text-muted-foreground">
                      Choose which program to invite the user to
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">User Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      aria-describedby="invite-email-help"
                    />
                    <p id="invite-email-help" className="text-xs text-muted-foreground">
                      The user will receive an email with instructions to join
                    </p>
                  </div>
                  {inviteMsg && (
                    <p
                      className={`text-xs ${inviteMsg.type === "ok" ? "text-green-500" : "text-destructive"}`}
                      role={inviteMsg.type === "err" ? "alert" : "status"}
                    >
                      {inviteMsg.text}
                    </p>
                  )}
                  <Button type="submit" disabled={inviting || !inviteProgramId}>
                    {inviting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="size-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Pending Invitations Section (placeholder for future) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  Track outstanding invitations sent to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending invitations</p>
                  <p className="text-xs mt-1">Invitations you send will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
