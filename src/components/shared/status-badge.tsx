// Compact badge for Project Status (PRD §10, §31). Restrained color use:
// the label text always carries the meaning: color is reinforcement, never
// the sole signal. Reuses the base Badge's neutral variants for the two
// "quiet" bookend states (Proposed, Done) instead of inventing new styling
// for them.

import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import type { ProjectStatus } from "@/lib/domain/enums"

// Only the three "in-motion" statuses need custom color — Proposed and Done
// map directly onto Badge's existing outline/secondary variants below.
const STATUS_CLASSNAME: Partial<Record<ProjectStatus, string>> = {
  Planning: "border-hairline bg-pebble-blue text-deep-cobalt dark:border-transparent",
  "In Progress": "border-transparent bg-primary text-primary-foreground",
  "On Hold":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
}

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = status === "Proposed" ? "outline" : status === "Done" ? "secondary" : "outline"

  return (
    <Badge variant={variant} className={cn(STATUS_CLASSNAME[status], className)}>
      {status}
    </Badge>
  )
}

export { StatusBadge }
export type { StatusBadgeProps }
