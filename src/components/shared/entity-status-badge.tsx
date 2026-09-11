// Compact badge for the generic Active/Inactive lifecycle status shared by
// Designer, Squad, Department, Epic, and Stakeholder Master Data (see
// docs/DECISIONS.md "No hard delete anywhere"). Distinct from StatusBadge,
// which renders Project's five-value ProjectStatus enum — do not conflate
// the two. Inactive is a normal, expected lifecycle state (not an error), so
// it stays a plain neutral outline rather than a saturated red.

import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import type { EntityStatus } from "@/lib/domain/enums"

interface EntityStatusBadgeProps {
  status: EntityStatus
  className?: string
}

function EntityStatusBadge({ status, className }: EntityStatusBadgeProps) {
  const isActive = status === "Active"

  return (
    <Badge
      variant="outline"
      className={cn(
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-border text-muted-foreground",
        className
      )}
    >
      {status}
    </Badge>
  )
}

export { EntityStatusBadge }
export type { EntityStatusBadgeProps }
