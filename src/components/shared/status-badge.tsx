// Compact badge for Project Status (PRD §10, §31). Restrained color use:
// the label text always carries the meaning: color is reinforcement, never
// the sole signal. Every color comes from the shared semantic status tokens
// in globals.css (--primary for the "active" family, --status-warning,
// --status-success) rather than a hardcoded Tailwind color scale, so a
// future theme change only ever touches that one file (docs/DECISIONS.md).

import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import { PROJECT_STATUS_LABELS } from "@/lib/domain/enums"
import type { ProjectStatus } from "@/lib/domain/enums"

// Planning and In Progress are one "active / in-motion" family (both derived
// from --primary) — Planning soft/lighter, In Progress strong/solid — so
// they read as related but stay visually distinguishable at a glance.
// Every status has an explicit entry (no implicit outline fallback) since
// the lifecycle is a closed set of 5 (docs/PRD.MD §10).
const STATUS_CLASSNAME: Record<ProjectStatus, string> = {
  Planning: "border-transparent bg-primary/10 text-primary",
  "In Progress": "border-transparent bg-primary text-primary-foreground",
  "On Hold": "border-transparent bg-status-warning/10 text-status-warning",
  Completed: "border-transparent bg-status-success/10 text-status-success",
  Cancelled: "border-transparent bg-muted text-muted-foreground",
}

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_CLASSNAME[status], className)}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}

export { StatusBadge }
export type { StatusBadgeProps }
