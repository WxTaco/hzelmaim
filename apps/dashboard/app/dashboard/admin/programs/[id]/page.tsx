"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  Loader2,
  UserCircle,
  Settings,
  Send,
  Calendar,
  Mail,
} from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const EASE = [0.22, 1, 0.36, 1] as const

interface ProgramMember {
  user_id: string
  email: string
  display_name: string | null
  invited_at: string
  responded_at: string | null
}

interface ProgramDetail {
  id: string
  name: string
  description: string
  created_at: string
  can_create_containers: boolean
  members: ProgramMember[]
}

interface ApiResponse<T> {
  data: T
}

export default function ProgramDetailPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string

  const [detail, setDetail] = useState<ProgramDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  // Quick invite form state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse<ProgramDetail>>(`/api/v1/programs/${programId}`)
      setDetail(res.data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load program")
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => {
    load()
  }, [load])

  const togglePermission = async () => {
    if (!detail) return
    setToggling(true)
    try {
      const res = await apiFetch<ApiResponse<ProgramDetail>>(
        `/api/v1/programs/${programId}/permissions`,
        {
          method: "PATCH",
          body: JSON.stringify({ can_create_containers: !detail.can_create_containers }),
        }
      )
      setDetail((prev) =>
        prev ? { ...prev, can_create_containers: res.data.can_create_containers } : prev
      )
    } catch {
      // silently ignore
    } finally {
      setToggling(false)
    }
  }

  const handleQuickInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    try {
      await apiFetch(`/api/v1/programs/${programId}/invite`, {
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

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto space-y-4">
        <div className="h-5 w-20 rounded-lg bg-muted animate-pulse" />
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-10 w-64 rounded-lg bg-muted animate-pulse mt-4" />
        <div className="h-48 rounded-xl bg-muted animate-pulse mt-4" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col items-center gap-4">
        <p className="text-destructive">{error ?? "Program not found"}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/admin")}>
          <ArrowLeft className="size-4 mr-2" /> Back to Admin
        </Button>
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
      {/* Back link + header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" /> Back to Admin
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{detail.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
              {detail.members.length} member{detail.members.length !== 1 ? "s" : ""}
            </span>
            {detail.can_create_containers && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                CT creation enabled
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabbed Interface */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
      >
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="size-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="size-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            {/* Quick Invite */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-4 text-muted-foreground" />
                  Invite to Program
                </CardTitle>
                <CardDescription>
                  Send an invitation to add a new member to this program
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickInvite} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label htmlFor="quick-invite-email" className="sr-only">
                      Email address
                    </Label>
                    <Input
                      id="quick-invite-email"
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="size-4 mr-2" />
                        Send Invite
                      </>
                    )}
                  </Button>
                </form>
                {inviteMsg && (
                  <p
                    className={`text-xs mt-3 ${
                      inviteMsg.type === "ok" ? "text-green-500" : "text-destructive"
                    }`}
                    role={inviteMsg.type === "err" ? "alert" : "status"}
                  >
                    {inviteMsg.text}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  Program Members
                </CardTitle>
                <CardDescription>
                  {detail.members.length === 0
                    ? "No members have joined this program yet"
                    : `${detail.members.length} member${detail.members.length !== 1 ? "s" : ""} in this program`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detail.members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="size-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No accepted members yet</p>
                    <p className="text-xs mt-1">
                      Use the form above to invite users to this program
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detail.members.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3"
                      >
                        <UserCircle className="size-8 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {m.display_name ?? m.email}
                          </p>
                          {m.display_name && (
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          )}
                        </div>
                        {m.responded_at && (
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="size-3.5" />
                            <span>
                              Joined {new Date(m.responded_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Program Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-4 text-muted-foreground" />
                  Program Information
                </CardTitle>
                <CardDescription>Basic details about this program</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Name
                    </dt>
                    <dd className="text-sm font-medium">{detail.name}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Description
                    </dt>
                    <dd className="text-sm">{detail.description}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Created
                    </dt>
                    <dd className="text-sm font-medium">
                      {new Date(detail.created_at).toLocaleDateString(undefined, {
                        dateStyle: "long",
                      })}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Permissions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  Permissions
                </CardTitle>
                <CardDescription>Control what members can do in this program</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">VPS Creation</p>
                    <p className="text-xs text-muted-foreground">
                      Allow accepted members to provision VPS
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={detail.can_create_containers ? "default" : "outline"}
                    onClick={togglePermission}
                    disabled={toggling}
                    aria-pressed={detail.can_create_containers}
                  >
                    {toggling && <Loader2 className="size-4 mr-2 animate-spin" />}
                    {detail.can_create_containers ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone - placeholder for future delete functionality */}
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect this program
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Delete Program</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this program and remove all members
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
