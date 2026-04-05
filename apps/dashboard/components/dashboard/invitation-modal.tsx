"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Monitor } from "lucide-react"
import { apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const EASE = [0.22, 1, 0.36, 1] as const

export interface PendingInvitation {
  id: string
  program_id: string
  program_name: string
  program_description: string
  invited_by_display_name: string | null
  invited_by_email: string
  invited_at: string
}

/** Shape returned by `GET /api/v1/containers/invitations/pending`. */
export interface PendingContainerSharingInvitation {
  id: string
  container_id: string
  container_name: string
  invited_by_display_name: string | null
  invited_by_email: string
  invited_at: string
  /** Permission bitmask that will be granted on acceptance. */
  permissions: number
}

// ── Permission bit constants (mirrors backend/src/models/container.rs) ────────
const PERM_VIEW         = 0b00000001
const PERM_READ_METRICS = 0b00000010
const PERM_START_STOP   = 0b00000100
const PERM_TERMINAL     = 0b00001000
const PERM_WEBHOOKS     = 0b00010000
const PERM_NETWORKS     = 0b00100000
const PERM_SHARE        = 0b01000000
const PERM_DELETE       = 0b10000000

const PERM_LABELS: { bit: number; label: string }[] = [
  { bit: PERM_VIEW,         label: "View VPS details and status" },
  { bit: PERM_READ_METRICS, label: "Read resource metrics" },
  { bit: PERM_START_STOP,   label: "Start, stop, and restart" },
  { bit: PERM_TERMINAL,     label: "Open terminal sessions" },
  { bit: PERM_WEBHOOKS,     label: "Manage webhooks" },
  { bit: PERM_NETWORKS,     label: "Attach / detach networks" },
  { bit: PERM_SHARE,        label: "Invite other users" },
  { bit: PERM_DELETE,       label: "Delete the VPS" },
]

function PermissionList({ permissions }: { permissions: number }) {
  const granted = PERM_LABELS.filter(({ bit }) => (permissions & bit) === bit)
  return (
    <ul className="mt-2 space-y-1">
      {granted.map(({ bit, label }) => (
        <li key={bit} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary shrink-0" />
          {label}
        </li>
      ))}
    </ul>
  )
}

interface InvitationModalProps {
  invitations: PendingInvitation[]
  /** Called when all invitations have been responded to. */
  onAllResponded: () => void
}

/**
 * Non-dismissible modal that presents pending program invitations one at a time.
 * The user must accept or decline each one — there is no way to close it otherwise.
 */
export function InvitationModal({ invitations, onAllResponded }: InvitationModalProps) {
  const [queue, setQueue] = useState<PendingInvitation[]>(invitations)
  const [responding, setResponding] = useState(false)

  const current = queue[0]
  const open = queue.length > 0

  const respond = async (response: "accepted" | "declined") => {
    if (!current || responding) return
    setResponding(true)
    try {
      await apiFetch(`/api/v1/programs/invitations/${current.id}/respond`, {
        method: "POST",
        body: JSON.stringify({ response }),
      })
      const next = queue.slice(1)
      setQueue(next)
      if (next.length === 0) onAllResponded()
    } finally {
      setResponding(false)
    }
  }

  const inviterLabel = current?.invited_by_display_name ?? current?.invited_by_email

  return (
    <Dialog open={open}>
      {/* onOpenChange intentionally omitted — the dialog is non-dismissible */}
      <AnimatePresence mode="wait">
        {current && (
          <DialogContent
            key={current.id}
            // Suppress the built-in close button via CSS override
            className="sm:max-w-md [&>button]:hidden"
            // Prevent clicking outside from closing
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <DialogHeader className="gap-2">
                {/* Program invitation badge */}
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Mail className="size-3.5" />
                  Program Invitation
                  {queue.length > 1 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {queue.length} pending
                    </span>
                  )}
                </div>

                <DialogTitle className="text-xl">{current.program_name}</DialogTitle>

                <DialogDescription className="text-sm leading-relaxed text-foreground/80">
                  {current.program_description}
                </DialogDescription>
              </DialogHeader>

              {/* Inviter info */}
              <p className="mt-4 text-xs text-muted-foreground">
                Invited by <span className="font-medium text-foreground">{inviterLabel}</span>
              </p>

              {/* Action buttons */}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => respond("declined")}
                  disabled={responding}
                  className="sm:w-auto"
                >
                  Decline
                </Button>
                <Button
                  onClick={() => respond("accepted")}
                  disabled={responding}
                  className="sm:w-auto"
                >
                  {responding ? "Responding…" : "Accept"}
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  )
}



// ── ContainerSharingModal ──────────────────────────────────────────────────────

interface ContainerSharingModalProps {
  invitations: PendingContainerSharingInvitation[]
  /** Called after every invitation in the queue has been responded to. */
  onAllResponded: () => void
}

/**
 * Non-dismissible modal for pending container-sharing invitations.
 *
 * Mirrors `InvitationModal` exactly but calls the container invitations
 * endpoint and labels the subject as a VPS rather than a program.
 * The user must accept or decline each invitation — there is no way to
 * close the dialog otherwise.
 */
export function ContainerSharingModal({
  invitations,
  onAllResponded,
}: ContainerSharingModalProps) {
  const [queue, setQueue] = useState<PendingContainerSharingInvitation[]>(invitations)
  const [responding, setResponding] = useState(false)

  const current = queue[0]
  const open = queue.length > 0

  const respond = async (response: "accepted" | "declined") => {
    if (!current || responding) return
    setResponding(true)
    try {
      await apiFetch(`/api/v1/containers/invitations/${current.id}/respond`, {
        method: "POST",
        body: JSON.stringify({ response }),
      })
      const next = queue.slice(1)
      setQueue(next)
      if (next.length === 0) onAllResponded()
    } finally {
      setResponding(false)
    }
  }

  const inviterLabel =
    current?.invited_by_display_name ?? current?.invited_by_email

  return (
    <Dialog open={open}>
      {/* onOpenChange intentionally omitted — the dialog is non-dismissible */}
      <AnimatePresence mode="wait">
        {current && (
          <DialogContent
            key={current.id}
            className="sm:max-w-md [&>button]:hidden"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <DialogHeader className="gap-2">
                {/* VPS sharing invitation badge */}
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Monitor className="size-3.5" />
                  VPS Sharing Invitation
                  {queue.length > 1 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {queue.length} pending
                    </span>
                  )}
                </div>

                <DialogTitle className="text-xl">{current.container_name}</DialogTitle>

                <DialogDescription asChild>
                  <div className="text-sm leading-relaxed text-foreground/80">
                    <p>
                      You have been invited to access this VPS. Accepting will
                      grant you the following permissions:
                    </p>
                    <PermissionList permissions={current.permissions} />
                  </div>
                </DialogDescription>
              </DialogHeader>

              {/* Inviter info */}
              <p className="mt-4 text-xs text-muted-foreground">
                Invited by{" "}
                <span className="font-medium text-foreground">{inviterLabel}</span>
              </p>

              {/* Action buttons */}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => respond("declined")}
                  disabled={responding}
                  className="sm:w-auto"
                >
                  Decline
                </Button>
                <Button
                  onClick={() => respond("accepted")}
                  disabled={responding}
                  className="sm:w-auto"
                >
                  {responding ? "Responding…" : "Accept"}
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  )
}
