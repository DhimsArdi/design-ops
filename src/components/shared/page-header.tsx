// Shared page-level header: title + optional description + right-aligned
// action slot. Used at the top of every feature screen (Overview, Timeline,
// Projects, People, Teams, Master Data, ...). Not tied to any one entity.

import type { ReactNode } from "react"
import { cn } from "cn"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
