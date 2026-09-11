// Generic empty state: icon + heading + description + optional action slot.
// Matches the tone of PRD §28 ("No projects found" / "Create your first
// project..." / [Add Project]) without hardcoding any one entity's copy —
// callers supply their own icon, title, description and action.

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {Icon ? (
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
