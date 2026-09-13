// Day-level "Sep 20 – Nov 30" range formatting for Board cards and List
// rows (spec's dense card/row hierarchy) — distinct from the Table's own
// month-only "Sep 2026 – Dec 2026" (page.tsx's local formatTimeline), which
// stays as-is for that denser column. Parsed as explicit UTC calendar parts,
// the same way project-form-types.ts's formatDateLabel already does, so a
// "YYYY-MM-DD" string never drifts a day from local-timezone Date parsing.

import type { Project } from "@/lib/domain/types"

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

function formatDayMonth(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return date
  return DAY_MONTH_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)))
}

function formatCardTimeline(project: Project): string {
  return `${formatDayMonth(project.start_date)} – ${formatDayMonth(project.end_date)}`
}

export { formatCardTimeline, formatDayMonth }
