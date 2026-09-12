// Compact badge for the generic Active/Inactive lifecycle status shared by
// Designer, Squad, Department, Epic, and Stakeholder Master Data (see
// docs/DECISIONS.md "No hard delete anywhere"). Distinct from StatusBadge,
// which renders Project's five-value ProjectStatus enum — do not conflate
// the two. Inactive is a normal, expected lifecycle state (not an error), so
// it stays a plain neutral outline rather than a saturated red. "Active"
// shares the same --status-success token as StatusBadge/HealthBadge rather
// than its own hardcoded color (docs/DECISIONS.md).

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
          ? "border-transparent bg-status-success/10 text-status-success"
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
