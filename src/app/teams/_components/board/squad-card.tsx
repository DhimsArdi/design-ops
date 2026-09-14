"use client"

// One column of the Squad View kanban (docs/PRD.MD §13.1). Static — only the
// designer rows inside it are draggable, never the card itself. The designer
// list is also the drop target: dropping a designer here always opens the
// Move/Share confirmation, never mutates membership on its own.

import Link from "next/link"
import { useDroppable } from "@dnd-kit/core"
import { MoreHorizontal, Plus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { EmptyFieldAction } from "@/components/shared/empty-field-action"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { DraggableDesignerRow } from "./draggable-designer-row"
import { SquadProjectsSection } from "./squad-projects-section"
import { cn } from "cn"
import type { Designer, Project, Squad } from "@/lib/domain/types"

interface SquadCardMember {
  designer: Designer
  isShared: boolean
}

interface SquadCardProps {
  squad: Squad
  lead: Designer | undefined
  members: SquadCardMember[]
  projects: Project[]
  currentDesignerId: string | null | undefined
  matchingDesignerIds: Set<string>
  onOpenDesigner: (designerId: string) => void
  onAddDesigners: () => void
  onRemoveDesigner: (designer: Designer, isShared: boolean) => void
}

function SquadCard({
  squad,
  lead,
  members,
  projects,
  currentDesignerId,
  matchingDesignerIds,
  onOpenDesigner,
  onAddDesigners,
  onRemoveDesigner,
}: SquadCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: squad.id })

  return (
    <div className="flex w-[340px] shrink-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-muted-foreground" />
            <Link href={`/teams/${squad.id}`} className="truncate text-sm font-semibold text-foreground hover:underline">
              {squad.name}
            </Link>
            <EntityStatusBadge status={squad.status} />
          </div>
          {squad.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{squad.description}</p>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="shrink-0" />}>
            <MoreHorizontal />
            <span className="sr-only">Actions for {squad.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/teams/${squad.id}`} />}>View squad detail</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/master-data/squads" />}>Manage in Master Data</DropdownMenuItem>
            <DropdownMenuItem onClick={onAddDesigners}>Add designer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Squad Lead</p>
        {lead ? (
          <button
            type="button"
            onClick={() => onOpenDesigner(lead.id)}
            className="flex items-center gap-2 text-left"
          >
            <PersonAvatar person={lead} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{lead.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{lead.job_title}</span>
            </span>
          </button>
        ) : (
          <EmptyFieldAction label="No lead assigned" actionLabel="Assign" href="/master-data/squads" />
        )}
      </div>

      <div className="border-b border-border py-3">
        <p className="mb-1.5 px-4 text-xs font-medium text-muted-foreground">Designers ({members.length})</p>

        <div
          ref={setNodeRef}
          className={cn(
            "mx-2 min-h-16 space-y-0.5 rounded-md border border-dashed border-transparent px-2 py-1 transition-colors duration-(--duration-quick)",
            isOver && "border-primary/50 bg-primary/5"
          )}
        >
          {members.length === 0 ? (
            <div className="space-y-2 px-2 py-4 text-center">
              <p className="text-sm text-muted-foreground">No designers assigned</p>
              <Button variant="ghost" size="sm" onClick={onAddDesigners}>
                <Plus />
                Add designer
              </Button>
            </div>
          ) : (
            members.map(({ designer, isShared }) => (
              <DraggableDesignerRow
                key={designer.id}
                designer={designer}
                squadId={squad.id}
                isShared={isShared}
                currentDesignerId={currentDesignerId}
                isMatch={matchingDesignerIds.has(designer.id)}
                onOpenDetails={() => onOpenDesigner(designer.id)}
                onRemove={() => onRemoveDesigner(designer, isShared)}
              />
            ))
          )}

          {isOver ? (
            <div className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-2 text-xs font-medium text-primary">
              <Plus className="size-3.5" />
              Drop designer here
            </div>
          ) : null}
        </div>
      </div>

      <SquadProjectsSection projects={projects} />
    </div>
  )
}

export { SquadCard }
export type { SquadCardProps, SquadCardMember }
