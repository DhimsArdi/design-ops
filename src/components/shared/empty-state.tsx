// Generic empty state: icon + heading + description + optional action slot.
// Matches the tone of PRD §28 ("No projects found" / "Create your first
// project..." / [Add Project]) without hardcoding any one entity's copy —
// callers supply their own icon, title, description and action.
//
// Built on the shadcn `Empty` primitives so every empty state shares the same
// structure and data-slot hooks. The primitives' defaults (large heading,
// square icon tile, generous padding) are tuned down here: these render inside
// table cards and detail panels, not as full-page states, and the app's visual
// direction is calm/minimal rather than promotional.

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Empty className={cn("gap-3 px-6 py-12", className)}>
      <EmptyHeader className="gap-3">
        {Icon ? (
          <EmptyMedia
            variant="icon"
            className="mb-0 size-11 rounded-full text-muted-foreground"
          >
            <Icon className="size-5" />
          </EmptyMedia>
        ) : null}
        <div className="space-y-1">
          <EmptyTitle className="font-sans text-sm font-semibold tracking-normal text-foreground">
            {title}
          </EmptyTitle>
          {description ? <EmptyDescription>{description}</EmptyDescription> : null}
        </div>
      </EmptyHeader>
      {action ? <EmptyContent className="mt-1">{action}</EmptyContent> : null}
    </Empty>
  )
}

export { EmptyState }
export type { EmptyStateProps }
