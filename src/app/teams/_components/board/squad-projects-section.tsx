"use client"

// Compact "Projects (N)" section at the bottom of a Squad Card (Squad View).
// Collapsed by default so a card with a busy squad stays scannable; expanding
// reveals the squad's owned projects with their existing Status/Priority —
// no separate project-status model invented here (docs/PRD.MD §10).

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { PROJECT_STATUSES } from "@/lib/domain/enums"
import { cn } from "cn"
import type { Project } from "@/lib/domain/types"

interface SquadProjectsSectionProps {
  projects: Project[]
}

/** "2 In Progress • 1 To Do" — reuses Project's own status labels, in lifecycle order. */
function summarize(projects: Project[]): string {
  return PROJECT_STATUSES.map((status) => {
    const count = projects.filter((project) => project.status === status).length
    if (count === 0) return null
    const label = status === "Planning" ? "To Do" : status === "Completed" ? "Done" : status
    return `${count} ${label}`
  })
    .filter((part): part is string => part !== null)
    .join(" • ")
}

function SquadProjectsSection({ projects }: SquadProjectsSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (projects.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-foreground">Projects (0)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">No active projects yet</p>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40"
        aria-expanded={expanded}
      >
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            Projects ({projects.length})
          </span>
          {!expanded ? <span className="text-xs text-muted-foreground">{summarize(projects)}</span> : null}
        </span>
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <ul className={cn("space-y-1 px-4 pb-3")}>
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">{project.name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <PriorityBadge priority={project.priority} />
                  <StatusBadge status={project.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { SquadProjectsSection }
export type { SquadProjectsSectionProps }
