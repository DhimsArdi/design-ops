// Compact "missing value · action" pattern for a single field or row-level
// count — e.g. Teams' "No lead assigned · Assign" / "No designers · Add" —
// replacing a bare "–" with language that says what's missing and a
// lightweight way to resolve it, without a large CTA or extra row height.
// Squad Lead is edited only in Master Data (docs/DECISIONS.md: "People and
// Teams are read-only directories"), so that action stays a plain link out.
// Squad membership ("No designers · Add") is the one exception, opening an
// inline multi-select dialog instead (docs/DECISIONS.md — reversed
// 2026-09-12) — pass `onClick` for that case, `href` for a plain link out.

import Link from "next/link"
import type { MouseEvent } from "react"
import { cn } from "cn"

interface EmptyFieldActionProps {
  label: string
  actionLabel: string
  href?: string
  onClick?: () => void
  className?: string
}

function EmptyFieldAction({ label, actionLabel, href, onClick, className }: EmptyFieldActionProps) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      {href ? (
        <Link
          href={href}
          onClick={(event: MouseEvent) => event.stopPropagation()}
          className="font-medium text-primary hover:underline"
        >
          {actionLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={(event: MouseEvent) => {
            event.stopPropagation()
            onClick?.()
          }}
          className="font-medium text-primary hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </span>
  )
}

export { EmptyFieldAction }
export type { EmptyFieldActionProps }
