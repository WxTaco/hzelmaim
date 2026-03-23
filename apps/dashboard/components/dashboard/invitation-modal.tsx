"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail } from "lucide-react"
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

