// Shared Delete flow for every hard-deletable entity in the app (the 5
// Master Data entities plus Project). Reverses this repo's former "no hard
// delete anywhere" rule (docs/DECISIONS.md): `blockers` is computed by the
// caller, at click time, from live data, and covers every reference regardless
// of the referencing record's own status/archive state — an archived, Completed
// project still counts, since deleting its owner squad would still break that
// project's detail page.
//
// A blocked record is a dead end unless the caller passes `force`. Designer and
// Stakeholder do (PRD §25) — their dependents can be cleaned up automatically.
// Squad, Department and Epic do not: a project cannot exist without an owner
// squad, an epic or a department, so "delete anyway" there would mean destroying
// projects, and the only honest version of it is a reassignment flow this
// product doesn't have.
//
// Built on the existing Dialog primitives, like ConfirmDialog — not a new
// base component.

"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DeleteBlocker {
  /** e.g. "project", "squad" — pluralized inline as `${count} ${label}(s)`. */
  label: string
  count: number
}

interface ForceDelete {
  /**
   * What deleting anyway will do to the records listed in `blockers`, in the
   * user's terms — e.g. "They'll be removed from those projects, and any squad
   * they led will be left without a lead." Spelled out rather than implied:
   * this is the one path in the app that discards data the user can't get back.
   */
  consequence: string
  onConfirm: () => void
}

interface DeleteEntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Lowercase, singular — e.g. "designer", "project". */
  entityLabel: string
  entityName: string
  blockers: DeleteBlocker[]
  onConfirm: () => void
  /** Omit to leave blocked records undeletable — the default. */
  force?: ForceDelete
}

function DeleteEntityDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  blockers,
  onConfirm,
  force,
}: DeleteEntityDialogProps) {
  const activeBlockers = blockers.filter((blocker) => blocker.count > 0)
  const isBlocked = activeBlockers.length > 0
  const canForce = isBlocked && force !== undefined

  function handleConfirm() {
    if (canForce) force.onConfirm()
    else onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isBlocked && !canForce ? `Can't delete ${entityName}` : `Delete ${entityName}?`}
          </DialogTitle>
          <DialogDescription>
            {isBlocked ? (
              <span className="block space-y-1">
                <span className="block">Still in use:</span>
                <span className="block text-foreground">
                  {activeBlockers
                    .map((blocker) => `${blocker.count} ${blocker.label}${blocker.count === 1 ? "" : "s"}`)
                    .join(", ")}
                </span>
                {canForce ? (
                  <span className="block pt-2">
                    {force.consequence} This can&apos;t be undone.
                  </span>
                ) : null}
              </span>
            ) : (
              `This will permanently delete this ${entityLabel}. This can't be undone.`
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {isBlocked && !canForce ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              OK
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleConfirm}>
                {canForce ? "Delete anyway" : "Delete"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DeleteEntityDialog }
export type { DeleteEntityDialogProps }
