// Compact badge for Project Health (PRD §11, §31): On Track / At Risk /
// Blocked. Soft, low-saturation tints — never a bare colored dot, the label
// text is always shown alongside the color. Shares the same semantic status
// tokens as StatusBadge (--status-success, --status-warning, --destructive)
// rather than its own hardcoded color scale (docs/DECISIONS.md) — "On Track"
// and "At Risk" are the same success/warning concept as Done/On Hold, and
// "Blocked" is the same concept as any other destructive/error state.

import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import type { ProjectHealth } from "@/lib/domain/enums"

const HEALTH_CLASSNAME: Record<ProjectHealth, string> = {
  "On Track": "border-transparent bg-status-success/10 text-status-success",
  "At Risk": "border-transparent bg-status-warning/10 text-status-warning",
  Blocked: "border-transparent bg-destructive/10 text-destructive",
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
