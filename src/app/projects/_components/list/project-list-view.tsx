"use client"

// List view — high-density scanning, grouped by lifecycle status (Projects
// page revamp spec §11). Unlike the Board's fixed 3 columns, a section only
// appears for a status actually present in the filtered set — On Hold and
// Cancelled included, so nothing is hidden here the way the Board hides them
// (the Board's own secondary strip is what keeps them reachable there).
//
// Shares the same lifecycle actions/dialogs as the Board
// (useProjectLifecycleActions) — every row gets the same explicit
// Start/Mark done/Reopen/Assign controls, just no drag.

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AvatarGroup } from "@/components/shared/avatar-group"
import { HealthBadge } from "@/components/shared/health-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { ProjectNameLink } from "@/components/shared/project-name-link"
import { StatusBadge } from "@/components/shared/status-badge"
import { useProjectLifecycleActions } from "../use-project-lifecycle-actions"
import { formatCardTimeline } from "../format-timeline"
import { canStartProject } from "@/lib/selectors/projectSelectors"
import { PROJECT_STATUS_LABELS } from "@/lib/domain/enums"
import type { ProjectStatus } from "@/lib/domain/enums"
import type { Department, Designer, Epic, Project, ProjectAssignment, Squad } from "@/lib/domain/types"

const STATUS_ORDER: ProjectStatus[] = ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"]

interface ProjectListViewProps {
  projects: Project[]
  epicsById: Map<string, Epic>
  departmentsById: Map<string, Department>
  assignments: ProjectAssignment[]
  designers: Designer[]
  squads: Squad[]
}

function ProjectListView({
  projects,
  epicsById,
  departmentsById,
  assignments,
  designers,
  squads,
}: ProjectListViewProps) {
  const router = useRouter()
  const designersById = new Map(designers.map((designer) => [designer.id, designer]))
  const { start, markDone, reopen, assign, dialogs } = useProjectLifecycleActions(designers, squads)

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

  const groups = STATUS_ORDER.map((status) => ({
    status,
    projects: projects.filter((project) => project.status === status),
  })).filter((group) => group.projects.length > 0)

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.status} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-sm font-semibold text-foreground">{PROJECT_STATUS_LABELS[group.status]}</h3>
            <span className="text-xs text-muted-foreground">{group.projects.length}</span>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border">
            {group.projects.map((project) => {
              const lead = leadFor(project.id)
              const support = supportFor(project.id)
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <ProjectNameLink
                      href={`/projects/${project.id}`}
                      name={project.name}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <p className="truncate text-xs text-muted-foreground">
                      {[epicsById.get(project.epic_id)?.name, departmentsById.get(project.department_id)?.name]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <PriorityBadge priority={project.priority} />
                  <StatusBadge status={project.status} className="hidden sm:inline-flex" />
                  <span className="text-xs text-muted-foreground">{formatCardTimeline(project)}</span>
                  {project.status === "In Progress" ? <HealthBadge health={project.health} /> : null}

                  <div className="flex items-center gap-3">
                    {lead || support.length > 0 ? (
                      <AvatarGroup people={[...(lead ? [lead] : []), ...support]} />
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          assign(project)
                        }}
                        className="text-sm"
                      >
                        <span className="font-medium text-status-warning">Unassigned</span>{" "}
                        <span className="font-medium text-primary underline underline-offset-2">Assign</span>
                      </button>
                    )}
                  </div>

                  <div onClick={(event) => event.stopPropagation()}>
                    {project.status === "Planning" ? (
                      canStartProject(project.id) ? (
                        <Button size="sm" onClick={() => start(project)}>
                          Start project
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger
                            render={<Button size="sm" variant="outline" className="opacity-50" aria-disabled />}
                          >
                            Start project
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Assign at least one designer before starting this project.
                          </TooltipContent>
                        </Tooltip>
                      )
                    ) : null}
                    {project.status === "In Progress" ? (
                      <Button size="sm" variant="outline" onClick={() => markDone(project)}>
                        Mark done
                      </Button>
                    ) : null}
                    {project.status === "Completed" ? (
                      <Button size="sm" variant="ghost" onClick={() => reopen(project)}>
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {dialogs}
    </div>
  )
}

export { ProjectListView }
export type { ProjectListViewProps }
