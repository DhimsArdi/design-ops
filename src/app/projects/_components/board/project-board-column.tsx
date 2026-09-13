"use client"

// One Board column — a droppable area (dnd-kit) with a header, an empty
// state (spec §15), and — Done only — a "show N recent, view the rest in
// Table" cap so a portfolio's worth of completed projects doesn't make the
// board unusably tall (spec §9/§18).

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import type { Project } from "@/lib/domain/types"
import { cn } from "cn"

interface ProjectBoardColumnProps {
  droppableId: string
  label: string
  projects: Project[]
  emptyTitle: string
  emptyDescription: string
  renderCard: (project: Project) => ReactNode
  /** Done column only: cap how many cards render, with a link to see the rest. */
  cap?: number
  onViewAll?: () => void
}

function ProjectBoardColumn({
  droppableId,
  label,
  projects,
  emptyTitle,
  emptyDescription,
  renderCard,
  cap,
  onViewAll,
}: ProjectBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const visible = cap ? projects.slice(0, cap) : projects
  const hiddenCount = projects.length - visible.length

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-0 flex-1 flex-col rounded-lg bg-muted/40 p-2.5 transition-colors duration-(--duration-quick)",
        isOver && "bg-muted/70"
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-medium text-muted-foreground">
          {projects.length}
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-6 text-center">
          <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((project) => (
            <div
              key={project.id}
              className="animate-in fade-in-0 slide-in-from-top-1 duration-(--duration-fast) ease-(--ease-smooth-out)"
            >
              {renderCard(project)}
            </div>
          ))}
          {hiddenCount > 0 ? (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onViewAll}>
              View all completed ({hiddenCount} more)
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export { ProjectBoardColumn }
export type { ProjectBoardColumnProps }
