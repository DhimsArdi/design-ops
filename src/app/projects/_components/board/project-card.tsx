"use client"

// One Board card (Projects page revamp §7-§9 of the spec). Compact,
// status-aware: Health only appears on In Progress; the explicit,
// non-drag lifecycle action (Start / Mark done / Reopen) is always present
// alongside the drag interaction, never instead of it (spec §29 — drag
// actions need a non-drag alternative).

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AvatarGroup } from "@/components/shared/avatar-group"
import { HealthBadge } from "@/components/shared/health-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { ProjectNameLink } from "@/components/shared/project-name-link"
import { formatCardTimeline, formatDayMonth } from "../format-timeline"
import { cn } from "cn"
import type { Designer, Project } from "@/lib/domain/types"

interface ProjectCardProps {
  project: Project
  epicName: string | undefined
  departmentName: string | undefined
  lead: Designer | undefined
  supportDesigners: Designer[]
  canStart: boolean
  onOpenDetail: () => void
  onAssign: () => void
  onStart: () => void
  onMarkDone: () => void
  onReopen: () => void
}

function ProjectCard({
  project,
  epicName,
  departmentName,
  lead,
  supportDesigners,
  canStart,
  onOpenDetail,
  onAssign,
  onStart,
  onMarkDone,
  onReopen,
}: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { status: project.status },
  })

  function stop(event: MouseEvent) {
    event.stopPropagation()
  }

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...listeners}
      {...attributes}
      onClick={onOpenDetail}
      className={cn(
        "cursor-pointer touch-none space-y-2.5 rounded-lg border border-border bg-card p-3 transition-shadow duration-(--duration-quick) ease-(--ease-smooth-out) hover:shadow-sm",
        isDragging && "z-10 opacity-60 shadow-md"
      )}
    >
      <div className="space-y-0.5">
        <ProjectNameLink href={`/projects/${project.id}`} name={project.name} onClick={stop} />
        {epicName || departmentName ? (
          <p className="truncate text-xs text-muted-foreground">
            {[epicName, departmentName].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      {project.status === "Completed" ? (
        // Quiet Done treatment (spec §9): team + completion date only — no
        // Priority, no Health, no resource-assignment affordance once a
        // project no longer needs day-to-day tracking.
        <>
          <AvatarGroup people={[...(lead ? [lead] : []), ...supportDesigners]} />
          {project.completed_at ? (
            <p className="text-xs text-muted-foreground">Completed {formatDayMonth(project.completed_at)}</p>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={project.priority} />
            <span className="text-xs text-muted-foreground">{formatCardTimeline(project)}</span>
          </div>

          {project.status === "In Progress" ? <HealthBadge health={project.health} /> : null}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Lead</p>
            {lead ? (
              <span className="inline-flex min-w-0 items-center gap-2">
                <PersonAvatar person={lead} size="sm" />
                <span className="truncate text-sm text-foreground">{lead.name}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  stop(event)
                  onAssign()
                }}
                className="text-sm"
              >
                <span className="font-medium text-status-warning">Unassigned</span>{" "}
                <span className="font-medium text-primary underline underline-offset-2">Assign</span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Designers</p>
            {supportDesigners.length > 0 ? (
              <AvatarGroup people={supportDesigners} />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  stop(event)
                  onAssign()
                }}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                No designer assigned
              </button>
            )}
          </div>
        </>
      )}

      {project.status === "Planning" ? (
        canStart ? (
          <Button
            size="sm"
            className="w-full"
            onClick={(event) => {
              stop(event)
              onStart()
            }}
          >
            Start project
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  className="w-full opacity-50"
                  aria-disabled
                  onClick={stop}
                />
              }
            >
              Start project
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Assign at least one designer before starting this project.
            </TooltipContent>
          </Tooltip>
        )
      ) : null}

      {project.status === "In Progress" ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={(event) => {
            stop(event)
            onMarkDone()
          }}
        >
          Mark done
        </Button>
      ) : null}

      {project.status === "Completed" ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={(event) => {
            stop(event)
            onReopen()
          }}
        >
          Reopen
        </Button>
      ) : null}
    </div>
  )
}

export { ProjectCard }
export type { ProjectCardProps }
