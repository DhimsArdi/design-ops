"use client"

// One Dialog to set a project's Design Team — Lead (optional, single) and
// Support designers (optional, multi) — in a single Save. The Board card,
// List row, Table's Designers cell, and the "Unable to start project"
// dialog's "Assign designer" CTA all open this instead of each rolling their
// own assignment UI (Projects page revamp — see docs/DECISIONS.md).
//
// Candidate list, cross-squad badge, and the "no duplicate designer across
// Lead+Support" rule are the same ones the Add/Edit Project wizard's Step 3
// (step-design-team.tsx) already applies — this dialog is that same picker
// pair, just scoped to one project instead of a whole-form save, and it
// persists via `projectAssignmentRepository.reconcile()` (docs/PRD.MD §8.7)
// rather than its own diffing logic.

import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { PersonSelect } from "@/components/shared/person-select"
import { SearchableMultiSelect } from "@/components/shared/searchable-multi-select"

import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"
import { getProjectAssignments } from "@/lib/selectors/projectSelectors"
import { activeOrSelected, byName } from "@/lib/domain/optionHelpers"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import type { Designer, Squad } from "@/lib/domain/types"

interface AssignTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  ownerSquadId: string
  designers: Designer[]
  squads: Squad[]
  /** Called after a successful Save, so the caller can refresh its own view of the assignments. */
  onSaved: () => void
}

function AssignTeamDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  ownerSquadId,
  designers,
  squads,
  onSaved,
}: AssignTeamDialogProps) {
  const currentDesignerId = useCurrentDesignerId()
  const [leadDesignerId, setLeadDesignerId] = useState<string | null>(null)
  const [supportDesignerIds, setSupportDesignerIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    const assignments = getProjectAssignments(projectId)
    const lead = assignments.find((assignment) => assignment.project_role === "Lead")
    const support = assignments.filter((assignment) => assignment.project_role === "Support")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeadDesignerId(lead ? lead.designer_id : null)
    setSupportDesignerIds(support.map((assignment) => assignment.designer_id))
  }, [open, projectId])

  function handleLeadChange(id: string | null) {
    setLeadDesignerId(id)
    // No duplicate designer across Lead + Support (PRD §8.7): promoting a
    // Support pick to Lead drops their Support row.
    setSupportDesignerIds((current) => current.filter((existing) => existing !== id))
  }

  function handleSave() {
    projectAssignmentRepository.reconcile(projectId, [
      ...(leadDesignerId ? [{ designerId: leadDesignerId, role: "Lead" as const }] : []),
      ...supportDesignerIds.map((id) => ({ designerId: id, role: "Support" as const })),
    ])
    toast.success(`${projectName}'s design team updated`)
    onSaved()
    onOpenChange(false)
  }

  const squadsById = new Map(squads.map((squad) => [squad.id, squad]))
  const selectedIds = leadDesignerId ? [leadDesignerId, ...supportDesignerIds] : supportDesignerIds
  const designerOptions = activeOrSelected(designers, selectedIds).sort(byName)

  const supportOptions = designerOptions
    .filter((designer) => designer.id !== leadDesignerId)
    .map((designer) => {
      const squad = squadsById.get(designer.home_squad_id ?? "")
      const isCrossSquad = ownerSquadId !== "" && designer.home_squad_id !== ownerSquadId
      return {
        id: designer.id,
        label: personDisplayName(designer, currentDesignerId),
        description: [designer.job_title, squad?.name ?? "Unassigned"].filter(Boolean).join(" · "),
        visual: <PersonAvatar person={designer} size="sm" />,
        badge: isCrossSquad ? (
          <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[10px] font-normal">
            Cross-squad
          </Badge>
        ) : undefined,
      }
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign design team</DialogTitle>
          <DialogDescription>{projectName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-team-lead">Project Design Lead</Label>
            <PersonSelect
              id="assign-team-lead"
              value={leadDesignerId}
              onChange={handleLeadChange}
              people={designerOptions}
              currentDesignerId={currentDesignerId}
              emptyOption="Unassigned"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-team-support">Supporting Designers</Label>
            <SearchableMultiSelect
              id="assign-team-support"
              options={supportOptions}
              selectedIds={supportDesignerIds}
              onChange={setSupportDesignerIds}
              placeholder="Search or select designers…"
              searchPlaceholder="Search designers…"
              selectionLabel="Selected designers"
              emptyMessage="No other designers available."
              noMatchMessage="No matching designers."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { AssignTeamDialog }
export type { AssignTeamDialogProps }
