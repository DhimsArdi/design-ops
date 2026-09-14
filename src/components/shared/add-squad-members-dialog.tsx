"use client"

// "Add members to <squad>" — behind Master Data → Squads' row action, its
// "0 designers · Add member" empty cell, Manage members' own Add step, and
// Teams' "No designers · Add" row link. Promoted out of app/teams/_components
// when Squads needed the same flow (docs/DECISIONS.md).
//
// Squad membership has no join table: it is derived entirely from
// Designer.home_squad_id, a single nullable field (PRD §8.1, §16). So "adding"
// someone here is always a reassignment — it moves them out of whichever squad
// they are in now (or out of being Unassigned). That is said twice on purpose,
// because it is the one thing about this dialog a user can get wrong: once
// per row (each option's second line names their current squad) and once for
// the actual selection, in the note above the buttons.
//
// Exported twice. The panel is the whole dialog minus its shell, so Manage
// members can swap to it in place the way it already swaps to the move step —
// rather than stacking a second modal on top of the first.

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { MultiSelectChecklist } from "@/components/shared/multi-select-checklist"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import { byName } from "@/lib/domain/optionHelpers"
import type { Designer, Squad } from "@/lib/domain/types"

interface AddSquadMembersPanelProps {
  /** The squad being staffed. */
  squad: Squad
  /** Every designer — this picks its own candidates out of them. */
  designers: Designer[]
  /** Every squad, to name each candidate's current one and spot the ones they lead. */
  squads: Squad[]
  /** "Cancel" standing alone, "Back" when this is a step inside another dialog. */
  cancelLabel?: string
  onCancel: () => void
  /** Called after the reassignment is written. */
  onAdded: () => void
}

/** Header, picker and footer — everything but the Dialog shell. */
function AddSquadMembersPanel({
  squad,
  designers,
  squads,
  cancelLabel = "Cancel",
  onCancel,
  onAdded,
}: AddSquadMembersPanelProps) {
  const currentDesignerId = useCurrentDesignerId()
  const [query, setQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Writes are synchronous and optimistic (docs/DECISIONS.md), so this is not a
  // spinner waiting on a server — it is the guard that stops a double-click
  // firing the same reassignment twice before this unmounts.
  const [submitting, setSubmitting] = useState(false)

  const squadsById = useMemo(() => new Map(squads.map((s) => [s.id, s])), [squads])

  // Anyone Active who isn't already here. Current members are absent rather
  // than shown disabled: a checkbox that can't be ticked is a worse answer to
  // "who can I add" than not listing them at all.
  const candidates = useMemo(
    () =>
      designers
        .filter((designer) => designer.status === "Active" && designer.home_squad_id !== squad.id)
        .sort(byName),
    [designers, squad.id]
  )

  const options = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    return candidates
      .filter(
        (designer) =>
          !trimmed ||
          designer.name.toLowerCase().includes(trimmed) ||
          designer.job_title.toLowerCase().includes(trimmed)
      )
      .map((designer) => ({
        id: designer.id,
        label: (
          <span className="flex items-center gap-2">
            <PersonAvatar person={designer} size="sm" />
            {personDisplayName(designer, currentDesignerId)}
          </span>
        ),
        // "Product Designer · Squad A" — the job title only when they have one.
        description: [
          designer.job_title,
          squadsById.get(designer.home_squad_id ?? "")?.name ?? "Unassigned",
        ]
          .filter(Boolean)
          .join(" · "),
      }))
  }, [candidates, query, squadsById, currentDesignerId])

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => candidates.find((designer) => designer.id === id))
        .filter((designer): designer is Designer => designer !== undefined),
    [selectedIds, candidates]
  )

  // Squads left without a Squad Lead because the person leading them is one of
  // the people moving out. Nothing in the schema forbids a lead who isn't a
  // member, but it reads as stale data rather than as a decision, so the move
  // clears it — after saying so (PRD §16).
  const leadLosses = useMemo(
    () =>
      selected
        .map((designer) => ({ designer, from: squadsById.get(designer.home_squad_id ?? "") }))
        .filter(
          (row): row is { designer: Designer; from: Squad } =>
            row.from !== undefined && row.from.lead_designer_id === row.designer.id
        ),
    [selected, squadsById]
  )

  function handleConfirm() {
    if (submitting || selected.length === 0) return
    setSubmitting(true)

    for (const { from } of leadLosses) {
      squadRepository.update(from.id, { lead_designer_id: null })
    }
    designerRepository.setHomeSquad(selectedIds, squad.id)

    toast.success(
      selected.length === 1
        ? `${selected[0]!.name} added to ${squad.name}`
        : `${selected.length} designers added to ${squad.name}`
    )
    onAdded()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add members to {squad.name}</DialogTitle>
        <DialogDescription>Assign designers to this squad.</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search designers…"
            aria-label="Search designers"
            className="pl-8"
          />
        </div>

        <MultiSelectChecklist
          idPrefix={`add-squad-member-${squad.id}`}
          options={options}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          emptyMessage={
            candidates.length === 0
              ? "Every active designer is already in this squad."
              : "No matching designers."
          }
        />

        {/* aria-live so the consequence of a tick is announced, not only drawn. */}
        <div aria-live="polite" className="space-y-2">
          {selected.length === 1 ? (
            <p className="text-sm text-muted-foreground">
              {selected[0]!.name} is currently assigned to{" "}
              {squadsById.get(selected[0]!.home_squad_id ?? "")?.name ?? "no squad"}. Adding them to{" "}
              {squad.name} will change their Home Squad.
            </p>
          ) : null}

          {selected.length > 1 ? (
            <p className="text-sm text-muted-foreground">
              {selected.length} designers will move to {squad.name} from their current squads.
              Their Home Squad changes.
            </p>
          ) : null}

          {leadLosses.length > 0 ? (
            <p className="rounded-md border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-status-warning">
              {leadLosses.length === 1
                ? `${leadLosses[0]!.designer.name} is ${leadLosses[0]!.from.name}'s Squad Lead. Moving them leaves ${leadLosses[0]!.from.name} without a lead until another is assigned.`
                : `${leadLosses
                    .map((row) => row.from.name)
                    .join(", ")} will be left without a Squad Lead until another is assigned.`}
            </p>
          ) : null}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={selected.length === 0 || submitting}
        >
          Add members
        </Button>
      </DialogFooter>
    </>
  )
}

interface AddSquadMembersDialogProps
  extends Omit<AddSquadMembersPanelProps, "cancelLabel" | "onCancel" | "onAdded"> {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful add, before the dialog closes. */
  onAdded?: () => void
}

/** The panel on its own, for the entry points that aren't already in a dialog. */
function AddSquadMembersDialog({
  open,
  onOpenChange,
  onAdded,
  ...panelProps
}: AddSquadMembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <AddSquadMembersPanel
          {...panelProps}
          onCancel={() => onOpenChange(false)}
          onAdded={() => {
            onAdded?.()
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

export { AddSquadMembersDialog, AddSquadMembersPanel }
export type { AddSquadMembersDialogProps, AddSquadMembersPanelProps }
