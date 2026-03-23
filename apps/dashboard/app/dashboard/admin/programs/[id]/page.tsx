"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Users, ShieldCheck, Loader2, UserCircle } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"

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

  useEffect(() => { load() }, [load])

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
      setDetail((prev) => prev ? { ...prev, can_create_containers: res.data.can_create_containers } : prev)
    } catch {
      // silently ignore
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
        <Link href="/dashboard/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="size-4" /> Admin
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{detail.description}</p>
          </div>
          <span className="shrink-0 text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">
            {detail.members.length} member{detail.members.length !== 1 ? "s" : ""}
          </span>
        </div>
      </motion.div>

      {/* Permissions card */}
      <motion.div className="rounded-xl bg-card ring-1 ring-foreground/10 px-6 py-5 space-y-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4, ease: EASE }}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Permissions</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Container creation</p>
            <p className="text-xs text-muted-foreground mt-0.5">Allow accepted members to provision LXC containers.</p>
          </div>
          <Button
            size="sm"
            variant={detail.can_create_containers ? "default" : "outline"}
            onClick={togglePermission}
            disabled={toggling}
          >
            {toggling ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : null}
            {detail.can_create_containers ? "Enabled" : "Disabled"}
          </Button>
        </div>
      </motion.div>

      {/* Members card */}
      <motion.div className="rounded-xl bg-card ring-1 ring-foreground/10 px-6 py-5 space-y-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: EASE }}>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</p>
        </div>
        {detail.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accepted members yet.</p>
        ) : (
          <div className="space-y-2">
            {detail.members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <UserCircle className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.display_name ?? m.email}</p>
                  {m.display_name && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

