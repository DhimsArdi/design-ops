// Add/Edit Project — Step 3: Design Team (docs/PRD.MD §23).
//
// Project Design Lead and Supporting Designers both source from every
// Designer regardless of squad (PRD §23 — "Do not prevent selecting
// designer from another squad"); Cross-squad is shown, never enforced.
// No-duplicate-across-Lead+Support is enforced by the wizard (which owns
// `leadDesignerId`/`supportDesignerIds` together) and reinforced here by
// excluding the current Lead from the Support checklist's own options.

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelectChecklist } from "./multi-select-checklist"
import { activeOrSelected, byName } from "./project-form-types"
import type { Designer, Squad } from "@/lib/domain/types"

interface StepDesignTeamProps {
  ownerSquadId: string
  leadDesignerId: string | null
  supportDesignerIds: string[]
  onLeadChange: (id: string | null) => void
  onSupportChange: (ids: string[]) => void
  designers: Designer[]
  squads: Squad[]
}

function StepDesignTeam({
  ownerSquadId,
  leadDesignerId,
  supportDesignerIds,
  onLeadChange,
  onSupportChange,
  designers,
  squads,
}: StepDesignTeamProps) {
  const squadsById = new Map(squads.map((squad) => [squad.id, squad]))
  const selectedIds = leadDesignerId ? [leadDesignerId, ...supportDesignerIds] : supportDesignerIds
  const designerOptions = activeOrSelected(designers, selectedIds).sort(byName)

  const supportOptions = designerOptions
    .filter((designer) => designer.id !== leadDesignerId)
    .map((designer) => {
      const squad = squadsById.get(designer.home_squad_id)
      const isCrossSquad = ownerSquadId !== "" && designer.home_squad_id !== ownerSquadId
      return {
        id: designer.id,
        label: designer.name,
        description: (
          <span className="flex flex-wrap items-center gap-1.5">
            <span>{designer.job_title}</span>
            <span aria-hidden="true">·</span>
            <span>{squad?.name ?? "Unknown squad"}</span>
            {isCrossSquad ? (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                Cross-squad
              </Badge>
            ) : null}
          </span>
        ),
      }
    })

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="project-design-lead">Project Design Lead</Label>
        <Select value={leadDesignerId} onValueChange={(designerId) => onLeadChange(designerId)}>
          <SelectTrigger id="project-design-lead" className="w-full">
            <SelectValue placeholder="Unassigned">
              {(current: string | null) =>
                current ? (designerOptions.find((d) => d.id === current)?.name ?? "Unassigned") : "Unassigned"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Unassigned</SelectItem>
            {designerOptions.map((designer) => (
              <SelectItem key={designer.id} value={designer.id}>
                {designer.name}
                {designer.status === "Inactive" ? " (Inactive)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Leaving this empty is valid: the project shows as Unassigned until a Lead is set.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Supporting Designers</Label>
        <MultiSelectChecklist
          idPrefix="support-designer"
          options={supportOptions}
          selectedIds={supportDesignerIds}
          onChange={onSupportChange}
          emptyMessage="No other designers available."
        />
      </div>
    </div>
  )
}

export { StepDesignTeam }
export type { StepDesignTeamProps }
