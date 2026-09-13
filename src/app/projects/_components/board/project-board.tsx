"use client"

// Board view — the default operational workspace (Projects page revamp).
// Three fixed columns (To Do / In Progress / Done, mapping to the stored
// Planning / In Progress / Completed statuses — see docs/domain/enums.ts's
// PROJECT_STATUS_LABELS). On Hold and Cancelled projects are never a column
// here, but stay discoverable via the secondary strip below the columns.
//
// The lifecycle transition matrix and its dialogs (Assign team / Start
// blocked / Mark complete) live in useProjectLifecycleActions, shared with
// the List view — this file only adds the drag interaction on top of it.

import { useRouter } from "next/navigation"
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"

import { Button } from "@/components/ui/button"
import { ProjectBoardColumn } from "./project-board-column"
import { ProjectCard } from "./project-card"
import { useProjectLifecycleActions } from "../use-project-lifecycle-actions"

import { canStartProject } from "@/lib/selectors/projectSelectors"
import type { Department, Designer, Epic, Project, ProjectAssignment, Squad } from "@/lib/domain/types"
import type { ProjectStatus } from "@/lib/domain/enums"

const DONE_COLUMN_CAP = 8

interface ProjectBoardProps {
  /** Already filtered by search/priority/department/etc — not narrowed by status, since the columns *are* the status grouping. */
  projects: Project[]
  epicsById: Map<string, Epic>
  departmentsById: Map<string, Department>
  assignments: ProjectAssignment[]
  designers: Designer[]
  squads: Squad[]
  onViewStatusInTable: (status: ProjectStatus) => void
}

function ProjectBoard({
  projects,
  epicsById,
  departmentsById,
  assignments,
  designers,
  squads,
  onViewStatusInTable,
}: ProjectBoardProps) {
  const router = useRouter()
  const designersById = new Map(designers.map((designer) => [designer.id, designer]))
  const { start, markDone, reopen, assign, tryTransition, dialogs } = useProjectLifecycleActions(
    designers,
    squads
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  function leadFor(projectId: string): Designer | undefined {
    const lead = assignments.find((a) => a.project_id === projectId && a.project_role === "Lead")
    return lead ? designersById.get(lead.designer_id) : undefined
  }

  function supportFor(projectId: string): Designer[] {
    return assignments
      .filter((a) => a.project_id === projectId && a.project_role === "Support")
      .map((a) => designersById.get(a.designer_id))
      .filter((designer): designer is Designer => designer !== undefined)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const project = projects.find((p) => p.id === active.id)
    if (!project) return
    const sourceStatus = (active.data.current as { status: ProjectStatus }).status
    tryTransition(project, sourceStatus, over.id as string)
  }

  function renderCard(project: Project) {
    return (
      <ProjectCard
        project={project}
        epicName={epicsById.get(project.epic_id)?.name}
        departmentName={departmentsById.get(project.department_id)?.name}
        lead={leadFor(project.id)}
        supportDesigners={supportFor(project.id)}
        canStart={canStartProject(project.id)}
        onOpenDetail={() => router.push(`/projects/${project.id}`)}
        onAssign={() => assign(project)}
        onStart={() => start(project)}
        onMarkDone={() => markDone(project)}
        onReopen={() => reopen(project)}
      />
    )
  }

  const todo = projects.filter((project) => project.status === "Planning")
  const inProgress = projects.filter((project) => project.status === "In Progress")
  const done = projects.filter((project) => project.status === "Completed")
  const onHoldCount = projects.filter((project) => project.status === "On Hold").length
  const cancelledCount = projects.filter((project) => project.status === "Cancelled").length

  return (
    <div className="space-y-3">
      {onHoldCount > 0 || cancelledCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Not shown on the board:</span>
          {onHoldCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => onViewStatusInTable("On Hold")}>
              On Hold · {onHoldCount}
            </Button>
          ) : null}
          {cancelledCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => onViewStatusInTable("Cancelled")}>
              Cancelled · {cancelledCount}
            </Button>
          ) : null}
        </div>
      ) : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <ProjectBoardColumn
            droppableId="Planning"
            label="To Do"
            projects={todo}
            emptyTitle="No projects waiting to start"
            emptyDescription="New projects will appear here before they begin."
            renderCard={renderCard}
          />
          <ProjectBoardColumn
            droppableId="In Progress"
            label="In Progress"
            projects={inProgress}
            emptyTitle="No projects in progress"
            emptyDescription="Projects will appear here after they are started."
            renderCard={renderCard}
          />
          <ProjectBoardColumn
            droppableId="Completed"
            label="Done"
            projects={done}
            emptyTitle="No completed projects yet"
            emptyDescription=""
            cap={DONE_COLUMN_CAP}
            onViewAll={() => onViewStatusInTable("Completed")}
            renderCard={renderCard}
          />
        </div>
      </DndContext>

      {dialogs}
    </div>
  )
}

export { ProjectBoard }
export type { ProjectBoardProps }
