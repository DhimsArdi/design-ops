"use client"

// Squad View — horizontal kanban of every visible squad (docs/PRD.MD §13.1).
// Columns never wrap: `overflow-x-auto` + `flex-nowrap` (§3 of the spec this
// implements). Only designer rows are draggable; squad cards stay static.
// Dropping a designer on another squad never mutates membership by itself —
// it always opens the Move/Share confirmation (DesignerAllocationDialog).

import { useMemo, useState } from "react"
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { toast } from "sonner"

import { SquadCard, type SquadCardMember } from "./squad-card"
import { DesignerAllocationDialog, type AllocationRequest } from "./designer-allocation-dialog"
import { DesignerDetailsSheet } from "./designer-details-sheet"
import { AddSquadMembersDialog } from "@/components/shared/add-squad-members-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as squadDesignerMembershipRepository from "@/lib/repositories/squadDesignerMembershipRepository"
import { getSquadOwnedProjects } from "@/lib/selectors/squadSelectors"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { byName } from "@/lib/domain/optionHelpers"
import type { Designer, Squad } from "@/lib/domain/types"

interface RemovalRequest {
  designer: Designer
  squad: Squad
  isShared: boolean
}

interface SquadBoardProps {
  /** Already filtered by status/staffing/lead/search — see Teams page. */
  squads: Squad[]
  designers: Designer[]
  /** Trimmed, lowercased search query — used only to highlight matching designers. */
  searchQuery: string
}

function SquadBoard({ squads, designers, searchQuery }: SquadBoardProps) {
  const currentDesignerId = useCurrentDesignerId()
  // Subscribes this view to shared-membership changes: squads/designers are
  // already reactive via the page's own useRepositoryList calls, but a Share
  // (which only ever writes this table) needs its own subscription to
  // re-render the board (docs/DECISIONS.md — dataStore notifies listeners
  // whose own snapshot reference changed, not every listener unconditionally).
  const [memberships] = useRepositoryList(squadDesignerMembershipRepository)

  const [allocationRequest, setAllocationRequest] = useState<AllocationRequest | null>(null)
  const [detailsDesignerId, setDetailsDesignerId] = useState<string | null>(null)
  const [addDesignersTarget, setAddDesignersTarget] = useState<Squad | null>(null)
  const [removalRequest, setRemovalRequest] = useState<RemovalRequest | null>(null)

  const designersById = useMemo(() => new Map(designers.map((d) => [d.id, d])), [designers])

  const sharedDesignerIdsBySquad = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const row of memberships) {
      const set = map.get(row.squad_id) ?? new Set<string>()
      set.add(row.designer_id)
      map.set(row.squad_id, set)
    }
    return map
  }, [memberships])

  const matchingDesignerIds = useMemo(() => {
    const ids = new Set<string>()
    if (!searchQuery) return ids
    for (const designer of designers) {
      if (designer.name.toLowerCase().includes(searchQuery)) ids.add(designer.id)
    }
    return ids
  }, [designers, searchQuery])

  function membersFor(squad: Squad): SquadCardMember[] {
    // The Squad Lead is already shown in their own card section — don't list
    // or count them again in Designers below.
    const primary = designers
      .filter((d) => d.home_squad_id === squad.id && d.id !== squad.lead_designer_id)
      .sort(byName)
      .map((designer) => ({ designer, isShared: false }))

    const sharedIds = sharedDesignerIdsBySquad.get(squad.id)
    const shared = sharedIds
      ? [...sharedIds]
          .map((id) => designersById.get(id))
          .filter((designer): designer is Designer => designer !== undefined)
          .sort(byName)
          .map((designer) => ({ designer, isShared: true }))
      : []

    return [...primary, ...shared]
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const data = active.data.current as { designerId: string; sourceSquadId: string } | undefined
    if (!data) return

    const targetSquadId = String(over.id)
    if (targetSquadId === data.sourceSquadId) return

    const designer = designersById.get(data.designerId)
    const targetSquad = squads.find((squad) => squad.id === targetSquadId)
    if (!designer || !targetSquad) return

    // Already a member (primary or shared) of the target — nothing to confirm.
    const alreadyShared = sharedDesignerIdsBySquad.get(targetSquadId)?.has(designer.id) ?? false
    if (designer.home_squad_id === targetSquadId || alreadyShared) return

    setAllocationRequest({ designer, targetSquad, sourceSquadId: data.sourceSquadId })
  }

  function confirmRemove() {
    if (!removalRequest) return
    const { designer, squad, isShared } = removalRequest

    if (isShared) {
      squadDesignerMembershipRepository.removeMembership(designer.id, squad.id)
    } else {
      if (squad.lead_designer_id === designer.id) {
        squadRepository.update(squad.id, { lead_designer_id: null })
      }
      designerRepository.update(designer.id, { home_squad_id: null })
    }

    toast.success(`${designer.name} removed from ${squad.name}`)
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* overscroll-x-contain stops a horizontal swipe from chaining into a
            parent's horizontal scroll once this row hits its own edge. */}
        <div className="flex w-full min-w-0 flex-nowrap items-start gap-4 overflow-x-auto overscroll-x-contain scrollbar-themed pb-2">
          {squads.map((squad) => (
            <SquadCard
              key={squad.id}
              squad={squad}
              lead={squad.lead_designer_id ? designersById.get(squad.lead_designer_id) : undefined}
              members={membersFor(squad)}
              projects={getSquadOwnedProjects(squad.id)}
              currentDesignerId={currentDesignerId}
              matchingDesignerIds={matchingDesignerIds}
              onOpenDesigner={setDetailsDesignerId}
              onAddDesigners={() => setAddDesignersTarget(squad)}
              onRemoveDesigner={(designer, isShared) => setRemovalRequest({ designer, squad, isShared })}
            />
          ))}
        </div>
      </DndContext>

      <DesignerAllocationDialog
        request={allocationRequest}
        onOpenChange={(open) => {
          if (!open) setAllocationRequest(null)
        }}
      />

      <DesignerDetailsSheet
        designerId={detailsDesignerId}
        onOpenChange={(open) => {
          if (!open) setDetailsDesignerId(null)
        }}
      />

      {addDesignersTarget ? (
        <AddSquadMembersDialog
          open
          onOpenChange={(next) => {
            if (!next) setAddDesignersTarget(null)
          }}
          squad={addDesignersTarget}
          designers={designers}
          squads={squads}
          onAdded={() => setAddDesignersTarget(null)}
        />
      ) : null}

      {removalRequest ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setRemovalRequest(null)
          }}
          title={`Remove ${removalRequest.designer.name} from ${removalRequest.squad.name}?`}
          description={
            removalRequest.isShared
              ? `${removalRequest.designer.name} stays in their Home Squad — this only ends the Shared membership with ${removalRequest.squad.name}.`
              : `${removalRequest.squad.name} is ${removalRequest.designer.name}'s Home Squad. Removing them here leaves them Unassigned until you give them a new one.`
          }
          confirmLabel="Remove"
          confirmVariant="destructive"
          onConfirm={confirmRemove}
        />
      ) : null}
    </>
  )
}

export { SquadBoard }
export type { SquadBoardProps }
