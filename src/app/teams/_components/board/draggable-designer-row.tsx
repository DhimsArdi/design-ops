"use client"

// One designer row inside a Squad Card's Designers list (Squad View). The
// drag handle is the only draggable affordance — the row's own click opens
// Designer Details, exactly like every other person-row-that's-also-a-link
// elsewhere in the app (drag never replaces the non-drag interaction).

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { personDisplayName } from "@/lib/identity/person-display"
import { cn } from "cn"
import type { Designer } from "@/lib/domain/types"

interface DraggableDesignerRowProps {
  designer: Designer
  /** The squad card this row is rendered inside — the drag's source squad. */
  squadId: string
  /** True in every squad card except the designer's Primary Squad (§5). */
  isShared: boolean
  currentDesignerId: string | null | undefined
  /** True when this designer matches an active search query (highlighted). */
  isMatch?: boolean
  onOpenDetails: () => void
}

function DraggableDesignerRow({
  designer,
  squadId,
  isShared,
  currentDesignerId,
  isMatch = false,
  onOpenDetails,
}: DraggableDesignerRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${squadId}::${designer.id}`,
    data: { designerId: designer.id, sourceSquadId: squadId },
  })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-(--duration-quick)",
        "hover:bg-muted/60",
        isMatch && "bg-primary/5 ring-1 ring-primary/30",
        isDragging && "z-10 opacity-60 shadow-md"
      )}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Drag ${designer.name} to another squad`}
        className="touch-none cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <button type="button" onClick={onOpenDetails} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <PersonAvatar person={designer} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {personDisplayName(designer, currentDesignerId)}
            </span>
            {designer.status === "Inactive" ? <EntityStatusBadge status={designer.status} /> : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{designer.job_title}</span>
        </span>
      </button>

      {isShared ? (
        <Badge variant="outline" className="shrink-0 text-muted-foreground">
          Shared
        </Badge>
      ) : null}
    </div>
  )
}

export { DraggableDesignerRow }
export type { DraggableDesignerRowProps }
