// Compact badge for Project Health (PRD §11, §31): On Track / At Risk /
// Blocked. Soft, low-saturation tints — never a bare colored dot, the label
// text is always shown alongside the color.

import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import type { ProjectHealth } from "@/lib/domain/enums"

const HEALTH_CLASSNAME: Record<ProjectHealth, string> = {
  "On Track":
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  "At Risk":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Blocked:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
}

interface HealthBadgeProps {
  health: ProjectHealth
  className?: string
}

function HealthBadge({ health, className }: HealthBadgeProps) {
  return (
    <Badge variant="outline" className={cn(HEALTH_CLASSNAME[health], className)}>
      {health}
    </Badge>
  )
}

export { HealthBadge }
export type { HealthBadgeProps }
