"use client"

// "Manage <squad> members" — the editable replacement for the old read-only
// "View members" popup (docs/DECISIONS.md). Reached from the Squads row menu,
// from the row's member count, and from the squad name.
//
// Membership is still derived, never stored: every action here writes
// Designer.home_squad_id (or Squad.lead_designer_id), and the count in the
// table, the Designers page, Teams, People and Overview all re-render from the
// same cache without being told (PRD §16).
//
// Three views, one Dialog. Moving a member and adding members are steps, not
// second modals: a dialog stacked on a dialog would mean two focus traps and
// two ways out of one decision, and the member list is what you come back to
// afterwards either way.

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { MoreHorizontal, Plus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { AddSquadMembersPanel } from "@/components/shared/add-squad-members-dialog"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import { byName } from "@/lib/domain/optionHelpers"
import type { Designer, Squad } from "@/lib/domain/types"

interface ManageSquadMembersDialogProps {
  /** Id of the squad being managed, or null when the dialog is closed. */
  squadId: string | null
  onOpenChange: (open: boolean) => void
  /** Every squad. The managed one is looked up here rather than passed in, so
   * "Make Squad Lead" updates the badge in this very list. */
  squads: Squad[]
  /** Every designer — members are derived from these. */
  designers: Designer[]
}

function ManageSquadMembersDialog({
  squadId,
  onOpenChange,
  squads,
  designers,
}: ManageSquadMembersDialogProps) {
  const squad = squads.find((candidate) => candidate.id === squadId)

  return (
    <Dialog open={squad !== undefined} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        {squad ? (
          <ManageSquadMembersContent
            squad={squad}
            squads={squads}
            designers={designers}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface ManageSquadMembersContentProps {
  squad: Squad
  squads: Squad[]
  designers: Designer[]
  onClose: () => void
}

/** Split out so each step's state is discarded when the dialog closes, without
 * an effect that has to remember to reset it. */
function ManageSquadMembersContent({
  squad,
  squads,
  designers,
  onClose,
}: ManageSquadMembersContentProps) {
  const currentDesignerId = useCurrentDesignerId()
  const [addingMembers, setAddingMembers] = useState(false)
  const [movingMember, setMovingMember] = useState<Designer | null>(null)
  const [destinationId, setDestinationId] = useState("")

  // Derived from the live designer list, so a move made in this dialog drops
  // the row out of it on the next render.
  const members = useMemo(
    () => designers.filter((designer) => designer.home_squad_id === squad.id).sort(byName),
    [designers, squad.id]
  )

  const destinations = useMemo(
    () => squads.filter((other) => other.id !== squad.id && other.status === "Active").sort(byName),
    [squads, squad.id]
  )

  const leadId = squad.lead_designer_id
  const movingMemberIsLead = movingMember !== null && movingMember.id === leadId

  function startMove(member: Designer) {
    setMovingMember(member)
    setDestinationId("")
  }

  function handleMove() {
    if (!movingMember || destinationId === "") return
    const destination = destinations.find((option) => option.id === destinationId)

    // A lead who is no longer in the squad reads as stale data, so the move
    // clears it — the callout above the picker says so before this runs.
    if (movingMember.id === squad.lead_designer_id) {
      squadRepository.update(squad.id, { lead_designer_id: null })
    }
    designerRepository.update(movingMember.id, {
      home_squad_id: destinationId,
    })

    toast.success(`${movingMember.name} moved to ${destination?.name ?? "another squad"}`)
    setMovingMember(null)
    setDestinationId("")
  }

  function handleMakeLead(member: Designer) {
    squadRepository.update(squad.id, { lead_designer_id: member.id })
    toast.success(`${member.name} is now ${squad.name}'s Squad Lead`)
  }

  function handleClearLead() {
    squadRepository.update(squad.id, { lead_designer_id: null })
    toast.success(`${squad.name} now has no Squad Lead`)
  }

  if (addingMembers) {
    return (
      <AddSquadMembersPanel
        squad={squad}
        squads={squads}
        designers={designers}
        cancelLabel="Back"
        onCancel={() => setAddingMembers(false)}
        onAdded={() => setAddingMembers(false)}
      />
    )
  }

  return movingMember ? (
    <>
      <DialogHeader>
        <DialogTitle>Move {movingMember.name}</DialogTitle>
        <DialogDescription>
          A designer belongs to exactly one squad, so moving {movingMember.name} out of {squad.name}{" "}
          means choosing where they go. Project assignments are unaffected — they aren&apos;t
          limited by Home Squad.
        </DialogDescription>
      </DialogHeader>

      {movingMemberIsLead ? (
        <p className="rounded-md border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-status-warning">
          {movingMember.name} is {squad.name}&apos;s Squad Lead. Moving them leaves {squad.name}{" "}
          without a lead until you assign another.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="move-member-destination">New Home Squad *</Label>
        <Select value={destinationId} onValueChange={(value) => setDestinationId(value ?? "")}>
          <SelectTrigger id="move-member-destination" className="w-full">
            <SelectValue placeholder="Select a squad">
              {(squadId: string) =>
                destinations.find((option) => option.id === squadId)?.name ?? ""
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {destinations.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setMovingMember(null)}>
          Back
        </Button>
        <Button type="button" onClick={handleMove} disabled={destinationId === ""}>
          {movingMemberIsLead ? "Move and clear lead" : "Move designer"}
        </Button>
      </DialogFooter>
    </>
  ) : (
    <>
      <DialogHeader>
        <DialogTitle>Manage {squad.name} members</DialogTitle>
        <DialogDescription>
          Membership follows each designer&apos;s Home Squad — changes here update it everywhere.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Members ({members.length})</p>

        {members.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No designers have {squad.name} as their Home Squad yet.
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {members.map((member) => {
              const isLead = member.id === leadId
              return (
                <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                  <PersonAvatar person={member} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                      {personDisplayName(member, currentDesignerId)}
                      {member.status === "Inactive" ? (
                        <EntityStatusBadge status={member.status} />
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.job_title || member.seniority}
                    </p>
                  </div>

                  {isLead ? (
                    <Badge variant="outline" className="shrink-0 font-normal">
                      Squad Lead
                    </Badge>
                  ) : null}

                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <MoreHorizontal />
                      <span className="sr-only">Actions for {member.name}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isLead ? (
                        <DropdownMenuItem onClick={handleClearLead}>
                          Remove as Squad Lead
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleMakeLead(member)}>
                          Make Squad Lead
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        disabled={destinations.length === 0}
                        onClick={() => startMove(member)}
                      >
                        Move to another squad
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )
            })}
          </ul>
        )}

        <Button type="button" variant="ghost" size="sm" onClick={() => setAddingMembers(true)}>
          <Plus />
          Add members
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  )
}

export { ManageSquadMembersDialog }
export type { ManageSquadMembersDialogProps }
