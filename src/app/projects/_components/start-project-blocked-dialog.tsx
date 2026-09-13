"use client"

// Shown when a To Do → In Progress move (drag or otherwise) is rejected for
// missing the Start gate (canStartProject — Projects page revamp §10 of the
// spec). Explains why, then opens AssignTeamDialog on request rather than
// rolling its own assignment UI.

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AssignTeamDialog } from "./assign-team-dialog"
import type { Designer, Squad } from "@/lib/domain/types"

interface StartProjectBlockedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  ownerSquadId: string
  designers: Designer[]
  squads: Squad[]
  onAssigned: () => void
}

function StartProjectBlockedDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  ownerSquadId,
  designers,
  squads,
  onAssigned,
}: StartProjectBlockedDialogProps) {
  const [assignOpen, setAssignOpen] = useState(false)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Unable to start project</DialogTitle>
            <DialogDescription>
              Assign at least one designer before starting {projectName}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false)
                setAssignOpen(true)
              }}
            >
              Assign designer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignTeamDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        projectId={projectId}
        projectName={projectName}
        ownerSquadId={ownerSquadId}
        designers={designers}
        squads={squads}
        onSaved={onAssigned}
      />
    </>
  )
}

export { StartProjectBlockedDialog }
export type { StartProjectBlockedDialogProps }
