// Health status for a Project (PRD §11, §31): On Track / At Risk / Blocked,
// rendered as a semantic dot + text label — the "preferred pattern" for
// dense enterprise tables (compact, scans fast in a column, never a heavily
// filled pill). Text always carries the meaning; the dot is reinforcement,
// never the only signal (task ask §6, PRD §31 "do not rely on color alone").
// One component, reused everywhere Health appears (Overview, Projects,
// Timeline tooltip, Project Detail) so a future treatment change only ever
// touches this file. Colors come from the shared semantic status tokens in
// globals.css (--status-success, --status-warning, --destructive) rather
// than a hardcoded Tailwind scale (docs/DECISIONS.md).

import { cn } from "cn"
import type { ProjectHealth } from "@/lib/domain/enums"

// Literal per-health class strings (not built via template interpolation) so
// Tailwind's build-time scanner can actually see and generate them.
const HEALTH_TEXT_CLASSNAME: Record<ProjectHealth, string> = {
  "On Track": "text-status-success",
  "At Risk": "text-status-warning",
  Blocked: "text-destructive",
}
const HEALTH_SOLID_CLASSNAME: Record<ProjectHealth, string> = {
  "On Track": "bg-status-success",
  "At Risk": "bg-status-warning",
  Blocked: "bg-destructive",
}

interface HealthBadgeProps {
  health: ProjectHealth
  className?: string
}

function HealthBadge({ health, className }: HealthBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        HEALTH_TEXT_CLASSNAME[health],
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", HEALTH_SOLID_CLASSNAME[health])} />
      {health}
    </span>
  )
}

/** Solid dot/fill color for this health — e.g. a Timeline legend swatch. */
function healthSolidClassName(health: ProjectHealth): string {
  return HEALTH_SOLID_CLASSNAME[health]
}

// Full className for a Timeline Gantt bar: solid, higher-weight fill for
// Committed vs. a lighter dashed outline for Tentative (PRD §12/§31 — the
// solid/dashed pattern is still the primary commitment signal, never color
// alone). Health tints the bar as a secondary signal when supplied; falls
// back to a neutral foreground tone when it isn't (e.g. a shared timeline row
// with no health data, such as Person Timeline).
const HEALTH_BAR_CLASSNAME: Record<ProjectHealth, { committed: string; tentative: string }> = {
  "On Track": {
    committed: "border-status-success bg-status-success",
    tentative: "border-dashed border-status-success/60 bg-status-success/10",
  },
  "At Risk": {
    committed: "border-status-warning bg-status-warning",
    tentative: "border-dashed border-status-warning/60 bg-status-warning/10",
  },
  Blocked: {
    committed: "border-destructive bg-destructive",
    tentative: "border-dashed border-destructive/60 bg-destructive/10",
  },
}
const NEUTRAL_BAR_CLASSNAME = {
  committed: "border-foreground/70 bg-foreground/70",
  tentative: "border-dashed border-muted-foreground/50 bg-transparent",
}

/** Full className for a Timeline Gantt bar's fill + border, by commitment (required) and health (optional, secondary signal). */
function projectHealthBarClassName(
  health: ProjectHealth | undefined,
  confidence: "Committed" | "Tentative"
): string {
  const set = health ? HEALTH_BAR_CLASSNAME[health] : NEUTRAL_BAR_CLASSNAME
  return confidence === "Committed" ? set.committed : set.tentative
}

export { HealthBadge, healthSolidClassName, projectHealthBarClassName }
export type { HealthBadgeProps }
