// Add/Edit Project — Step 3: Design Team (docs/PRD.MD §23).
//
// Two sections: who leads the design work, and who else is on it.
//
// Project Design Lead and Supporting Designers both source from every
// Designer regardless of squad (PRD §23 — "Do not prevent selecting
// designer from another squad"); Cross-squad is shown, never enforced.
// No-duplicate-across-Lead+Support is enforced by the wizard (which owns
// `leadDesignerId`/`supportDesignerIds` together) and reinforced here by
// excluding the current Lead from the Support picker's own options.

import { Badge } from "@/components/ui/badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { PersonSelect } from "@/components/shared/person-select"
import { SearchableMultiSelect } from "@/components/shared/searchable-multi-select"
import { WizardField, WizardSection, WizardSections } from "./wizard-section"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
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
  // Both fields here are people pickers, so both show the signed-in user as
  // "(Me)" once their account is linked to a designer record (PRD §14.11).
  const currentDesignerId = useCurrentDesignerId()
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
        // Structural context while selecting, as the PRD asks for: the job
        // title and the squad they come from, on one line (§23).
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
    <WizardSections>
      <WizardSection
        title="Design Ownership"
        description="Define the designer responsible for leading this project."
      >
        <WizardField
          label="Project Design Lead"
          htmlFor="project-design-lead"
          optional
          hint="Leaving this empty is valid: the project shows as Unassigned until a Lead is set."
        >
          <PersonSelect
            id="project-design-lead"
            value={leadDesignerId}
            onChange={onLeadChange}
            people={designerOptions}
            currentDesignerId={currentDesignerId}
            emptyOption="Unassigned"
          />
        </WizardField>
      </WizardSection>

      <WizardSection
        title="Design Team"
        description="Assign the designers who will contribute to this project. Designers from another squad are marked Cross-squad."
      >
        <WizardField label="Supporting Designers" htmlFor="support-designers" optional>
          <SearchableMultiSelect
            id="support-designers"
            options={supportOptions}
            selectedIds={supportDesignerIds}
            onChange={onSupportChange}
            placeholder="Search or select designers…"
            searchPlaceholder="Search designers…"
            selectionLabel="Selected designers"
            emptyMessage="No other designers available."
            noMatchMessage="No matching designers."
          />
        </WizardField>
      </WizardSection>
    </WizardSections>
  )
}

export { StepDesignTeam }
export type { StepDesignTeamProps }
