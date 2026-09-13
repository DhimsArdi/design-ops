"use client"

// Shared lifecycle-transition orchestration for Board and List (Projects
// page revamp) — one implementation of the transition matrix and its three
// dialogs (Assign team / Start blocked / Mark complete), so each view calls
// `assign`/`start`/`markDone`/`reopen` instead of re-implementing the same
// state machine. See project-board.tsx's header comment for the matrix
// itself:
//
//   Planning ("To Do")  -> In Progress   [gated: canStartProject]
//   In Progress         -> Completed     [opens MarkCompleteDialog]
//   Completed ("Done")  -> In Progress   [reopen]

import { useState } from "react"
import { toast } from "sonner"

import { AssignTeamDialog } from "./assign-team-dialog"
import { StartProjectBlockedDialog } from "./start-project-blocked-dialog"
import { MarkCompleteDialog } from "../[id]/_components/mark-complete-dialog"

import * as projectRepository from "@/lib/repositories/projectRepository"
import { canStartProject } from "@/lib/selectors/projectSelectors"
import type { Designer, Project, Squad } from "@/lib/domain/types"

function useProjectLifecycleActions(designers: Designer[], squads: Squad[]) {
  const [assignTarget, setAssignTarget] = useState<Project | null>(null)
  const [blockedTarget, setBlockedTarget] = useState<Project | null>(null)
  const [completingTarget, setCompletingTarget] = useState<Project | null>(null)

  function start(project: Project) {
    if (!canStartProject(project.id)) {
      setBlockedTarget(project)
      return
    }
    projectRepository.update(project.id, { status: "In Progress" })
    toast.success(`${project.name} started`)
  }

  function markDone(project: Project) {
    setCompletingTarget(project)
  }

  function reopen(project: Project) {
    projectRepository.update(project.id, { status: "In Progress", completed_at: null })
    toast.success(`${project.name} reopened`)
  }

  function assign(project: Project) {
    setAssignTarget(project)
  }

  /** Only the drag path needs an explicit source/target check — the
   * non-drag actions above already know which single transition they mean. */
  function tryTransition(project: Project, sourceStatus: string, targetStatus: string) {
    if (sourceStatus === targetStatus) return
    if (sourceStatus === "Planning" && targetStatus === "In Progress") return start(project)
    if (sourceStatus === "In Progress" && targetStatus === "Completed") return markDone(project)
    if (sourceStatus === "Completed" && targetStatus === "In Progress") return reopen(project)
    toast.error("That move isn't supported — use the card's own action instead.")
  }

  const dialogs = (
    <>
      {assignTarget ? (
        <AssignTeamDialog
          open
          onOpenChange={(open) => {
            if (!open) setAssignTarget(null)
          }}
          projectId={assignTarget.id}
          projectName={assignTarget.name}
          ownerSquadId={assignTarget.owner_squad_id}
          designers={designers}
          squads={squads}
          onSaved={() => setAssignTarget(null)}
        />
      ) : null}

      {blockedTarget ? (
        <StartProjectBlockedDialog
          open
          onOpenChange={(open) => {
            if (!open) setBlockedTarget(null)
          }}
          projectId={blockedTarget.id}
          projectName={blockedTarget.name}
          ownerSquadId={blockedTarget.owner_squad_id}
          designers={designers}
          squads={squads}
          onAssigned={() => setBlockedTarget(null)}
        />
      ) : null}

      {completingTarget ? (
        <MarkCompleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setCompletingTarget(null)
          }}
          project={completingTarget}
          onCompleted={() => setCompletingTarget(null)}
        />
      ) : null}
    </>
  )

  return { start, markDone, reopen, assign, tryTransition, dialogs }
}

export { useProjectLifecycleActions }
