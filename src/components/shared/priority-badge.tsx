// Compact badge for Project Priority (PRD §9, §31): "P1 = stronger emphasis,
// P2 = medium, P3 = neutral" and "avoid excessive saturated colors" (§14.2).
// Emphasis is expressed through the base Badge's own fill weight (solid /
// soft / outline), not through added hues — P1 is not "danger red", it is
// just the darkest, most solid badge.

import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import type { Priority } from "@/lib/domain/enums"

const PRIORITY_VARIANT: Record<Priority, "default" | "secondary" | "outline"> = {
  P1: "default",
  P2: "secondary",
  P3: "outline",
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className={cn(className)}>
      {priority}
    </Badge>
  )
}

export { PriorityBadge }
export type { PriorityBadgeProps }
