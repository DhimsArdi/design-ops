"use client"

// Move vs Share confirmation — shown after a designer is dropped on another
// squad in Squad View (docs/PRD.MD §13.1). Dragging never mutates squad
// membership by itself; this dialog is the one place that actually writes it,
// and it always operates on the designer entity rather than assuming whichever
// card they were dragged out of is their Primary Squad (a shared designer can
// be dragged from a shared card too — both options remain available either way).

import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as squadDesignerMembershipRepository from "@/lib/repositories/squadDesignerMembershipRepository"
import type { Designer, Squad } from "@/lib/domain/types"

interface AllocationRequest {
  designer: Designer
  targetSquad: Squad
  /** The card the designer was actually dragged out of — may be a Shared
   * card, not their Home Squad (§13.1: dragging is per-card, not per-designer). */
  sourceSquadId: string
}

interface DesignerAllocationDialogProps {
  request: AllocationRequest | null
  onOpenChange: (open: boolean) => void
}

function DesignerAllocationDialog({ request, onOpenChange }: DesignerAllocationDialogProps) {
  return (
    <Dialog open={request !== null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        {request ? (
          <AllocationDialogContent
            designer={request.designer}
            targetSquad={request.targetSquad}
            sourceSquadId={request.sourceSquadId}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface AllocationDialogContentProps {
  designer: Designer
  targetSquad: Squad
  sourceSquadId: string
  onClose: () => void
}

function AllocationDialogContent({ designer, targetSquad, sourceSquadId, onClose }: AllocationDialogContentProps) {
  const oldSquad = designer.home_squad_id ? squadRepository.getById(designer.home_squad_id) : undefined
  const isLeadOfOldSquad = oldSquad?.lead_designer_id === designer.id

  function handleMove() {
    if (oldSquad && isLeadOfOldSquad) {
      squadRepository.update(oldSquad.id, { lead_designer_id: null })
    }
    designerRepository.update(designer.id, { home_squad_id: targetSquad.id })
    // No longer meaningfully "shared" once they're primary here — and clean
    // up the card they were actually dragged out of too, which is only the
    // same as their old Home Squad when that's the card they dragged from
    // (a Shared card drags independently of Home Squad, §13.1).
    squadDesignerMembershipRepository.removeMembership(designer.id, targetSquad.id)
    if (sourceSquadId !== targetSquad.id) {
      squadDesignerMembershipRepository.removeMembership(designer.id, sourceSquadId)
    }
    toast.success(`${designer.name} moved to ${targetSquad.name}`)
    onClose()
  }

  function handleShare() {
    squadDesignerMembershipRepository.addMembership(designer.id, targetSquad.id)
    toast.success(`${designer.name} shared with ${targetSquad.name}`)
    onClose()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Add {designer.name} to {targetSquad.name}?
        </DialogTitle>
        <DialogDescription>Choose how {designer.name} joins this squad.</DialogDescription>
      </DialogHeader>

      {isLeadOfOldSquad && oldSquad ? (
        <p className="rounded-md border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-status-warning">
          {designer.name} is {oldSquad.name}&apos;s Squad Lead. Moving them leaves {oldSquad.name} without a
          lead until you assign another.
        </p>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleMove}
          className="w-full rounded-md border border-border p-3 text-left transition-colors duration-(--duration-quick) hover:border-primary/40 hover:bg-primary/5"
        >
          <p className="text-sm font-medium text-foreground">Move to {targetSquad.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Remove {designer.name} from {oldSquad?.name ?? "their current squad"} and assign them
            exclusively to {targetSquad.name}.
          </p>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="w-full rounded-md border border-border p-3 text-left transition-colors duration-(--duration-quick) hover:border-primary/40 hover:bg-primary/5"
        >
          <p className="text-sm font-medium text-foreground">Share with {targetSquad.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Keep {designer.name} in {oldSquad?.name ?? "their current squad"} and also add them to{" "}
            {targetSquad.name}.
          </p>
        </button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}

export { DesignerAllocationDialog }
export type { DesignerAllocationDialogProps, AllocationRequest }
