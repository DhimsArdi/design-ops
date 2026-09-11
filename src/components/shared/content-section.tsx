// Bordered white surface used to group content on a page (PRD §29: white
// surfaces, subtle border, minimal shadow). Generic container — not tied to
// any one entity or screen.

import type { ReactNode } from "react"
import { cn } from "cn"

interface ContentSectionProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

function ContentSection({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: ContentSectionProps) {
  const hasHeader = Boolean(title || description || actions)

  return (
    <section className={cn("rounded-lg border border-border bg-card shadow-xs", className)}>
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="space-y-1">
            {title ? (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  )
}

export { ContentSection }
export type { ContentSectionProps }
