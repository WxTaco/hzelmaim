"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AnimatePresence } from "framer-motion"
import { ServerCrash, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ContainerList } from "@/components/dashboard/container-list"
import { CreateContainerDialog, type CreateContainerData } from "@/components/dashboard/create-container-dialog"
import { PasswordBanner } from "@/components/dashboard/password-banner"
import { InvitationModal, type PendingInvitation } from "@/components/dashboard/invitation-modal"
import type { ContainerRecord } from "@/components/dashboard/container-card"

/**
 * Extended container record type including the initial password
 * returned when a new container is created.
 */
interface CreateContainerResult extends ContainerRecord {
  /** Initial root password for the newly created container (shown once) */
  initial_password?: string
}

/**
 * Statistics computed from the container list for display in stat cards.
 */
interface ContainerStats {
  /** Total number of containers */
  total: number
  /** Number of containers in 'running' state */
  running: number
  /** Number of containers in 'stopped' state */
  stopped: number
  /** Number of containers in 'failed' state */
  failed: number
}

/**
 * Main dashboard page component for container management.
 * 
 * This is the primary interface users see after signing in, displaying:
 * - Summary statistics cards showing container status breakdown
 * - List of all containers with action buttons
 * - Create container dialog for provisioning new containers
 * - Password banner for newly created containers
 * 
 * State Management:
 * - `containers`: Array of container records fetched from API
 * - `loading`: Boolean indicating initial data fetch in progress
 * - `error`: Error message if data fetch fails
 * - `acting`: Set of container IDs currently having actions performed
 * - `showCreateDialog`: Controls visibility of create container modal
 * - `createdPassword`: Stores initial password for newly created containers
 * 
 * Data Flow:
 * 1. On mount, fetches container list from /api/v1/containers
 * 2. User actions (start/stop/restart) POST to /api/v1/containers/:id/:action
 * 3. After any mutation, container list is refetched to reflect changes
 * 4. Stats are computed from containers using useMemo for performance
 * 
 * @example
 * ```tsx
 * // This page is rendered at /dashboard route
 * // Layout provides navigation, this component provides content
 * export default function DashboardPage() { ... }
 * ```
 */
export default function DashboardPage() {
  /** List of container records from API */
  const [containers, setContainers] = useState<ContainerRecord[]>([])
  
  /** Whether initial data is being loaded */
  const [loading, setLoading] = useState(true)
  
  /** Error message if data fetch fails */
  const [error, setError] = useState<string | null>(null)
  
  /** Set of container IDs currently having actions performed (for loading states) */
  const [acting, setActing] = useState<Set<string>>(new Set())

  /** Controls create container dialog visibility */
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  /** Initial password shown after creating a new container */
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)

  /** Pending program invitations shown as a modal on load */
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])

  /** Whether the current user is allowed to create containers */
  const [canCreate, setCanCreate] = useState(false)

  /**
   * Computed statistics derived from container list.
   * Memoized to prevent recalculation on every render.
   */
  const stats = useMemo<ContainerStats>(() => ({
    total: containers.length,
    running: containers.filter(c => c.state === "running").length,
    stopped: containers.filter(c => c.state === "stopped").length,
    failed: containers.filter(c => c.state === "failed").length,
  }), [containers])

  /**
   * Fetches the container list from the API.
   * Updates containers state on success, error state on failure.
   * Called on mount and after any mutation (create/start/stop/restart).
   */
  const load = useCallback(async () => {
    try {
      const [containersRes, invitationsRes, permsRes] = await Promise.all([
        apiFetch<{ data: ContainerRecord[] }>("/api/v1/containers"),
        apiFetch<{ data: PendingInvitation[] }>("/api/v1/programs/invitations/pending").catch(() => ({ data: [] as PendingInvitation[] })),
        apiFetch<{ data: { can_create_containers: boolean } }>("/api/v1/programs/permissions/me").catch(() => ({ data: { can_create_containers: false } })),
      ])
      setContainers(containersRes.data)
      setPendingInvitations(invitationsRes.data)
      setCanCreate(permsRes.data.can_create_containers)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load containers")
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Effect to load containers on component mount.
   */
  useEffect(() => { 
    load() 
  }, [load])

  /**
   * Performs a container action (start, stop, or restart).
   * Tracks the action in progress via the `acting` set for UI feedback.
   * Updates the container record in-place from the verified state returned
   * by the API — no extra list refetch needed.
   *
   * @param id - Container ID to perform action on
   * @param action - Action to perform: 'start', 'stop', or 'restart'
   */
  const doAction = async (id: string, action: "start" | "stop" | "restart") => {
    setActing((s) => new Set(s).add(id))
    try {
      const res = await apiFetch<{ data: ContainerRecord }>(`/api/v1/containers/${id}/${action}`, { method: "POST" })
      // The backend polls Proxmox until the state transition is confirmed, so
      // res.data already contains the verified state — update in-place.
      setContainers((prev) => prev.map((c) => (c.id === id ? res.data : c)))
    } finally {
      setActing((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
    }
  }

  /**
   * Handles container creation form submission.
   * Creates new container via API and displays initial password if returned.
   * 
   * @param data - Container creation data from form
   */
  const handleCreate = async (data: CreateContainerData) => {
    const res = await apiFetch<{ data: CreateContainerResult }>("/api/v1/containers", {
      method: "POST",
      body: JSON.stringify(data),
    })
    // Store initial password for display in banner
    setCreatedPassword(res.data.initial_password ?? null)
    await load()
  }

  /**
   * Loading state render - shows skeleton placeholders while fetching data.
   * Includes skeleton header, stat cards, and container list items.
   */
  if (loading) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded-md bg-muted animate-pulse mt-2" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-muted animate-pulse" />
        </div>
        
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        
        {/* Container list skeleton */}
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  /**
   * Error state render - shows error message with retry button.
   * Displayed when container fetch fails.
   */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 gap-4 text-center max-w-4xl mx-auto">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-destructive/10">
          <ServerCrash className="size-8 text-destructive" />
        </div>
        <div>
          <p className="text-lg font-semibold">Failed to load containers</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { 
            setLoading(true)
            setError(null)
            load() 
          }}
          className="mt-2"
        >
          <Loader2 className="size-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  /**
   * Main render - displays dashboard with header, stats, containers, and dialogs.
   */
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Page header with title */}
      <DashboardHeader containerCount={containers.length} />

      {/* Password banner - shown after creating a new container */}
      <AnimatePresence>
        {createdPassword && (
          <PasswordBanner
            password={createdPassword}
            onDismiss={() => setCreatedPassword(null)}
          />
        )}
      </AnimatePresence>

      {/* Stats cards - only shown when containers exist */}
      {containers.length > 0 && (
        <StatsCards
          total={stats.total}
          running={stats.running}
          stopped={stats.stopped}
          failed={stats.failed}
        />
      )}

      {/* Container list with empty state handling */}
      <ContainerList
        containers={containers}
        actingIds={acting}
        onAction={doAction}
        onCreateClick={() => setShowCreateDialog(true)}
        canCreate={canCreate}
      />

      {/* Create container modal dialog */}
      <CreateContainerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
      />

      {/* Pending program invitation modal */}
      {pendingInvitations.length > 0 && (
        <InvitationModal
          invitations={pendingInvitations}
          onAllResponded={() => setPendingInvitations([])}
        />
      )}
    </div>
  )
}
