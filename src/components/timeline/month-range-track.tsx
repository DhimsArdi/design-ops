// Presentation-only month-grid + bar-track renderer (PRD §14.2, §30). Reused
// unchanged by the Timeline page (this build step) and the upcoming Person
// Timeline (PRD §14.6, next build step) — a single person's own project bars
// across the same kind of month grid. This file deliberately knows nothing
// about filters, data fetching, or a sticky project-info column: it only
// turns `{ rows, monthRange }` into a month header and one bar per row.
//
// ROW_HEIGHT_PX / HEADER_HEIGHT_PX are exported so a caller rendering its own
// sticky label column next to this component (Timeline's project-name
// column; a future Person Timeline's project-name column) can give its rows
// the identical fixed height and have the two columns line up without ever
// measuring the DOM.

import type { KeyboardEvent, ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { healthSolidClassName, projectHealthBarClassName } from "@/components/shared/health-badge"
import type { ProjectHealth } from "@/lib/domain/enums"
import { cn } from "@/lib/utils"

export type MonthRangeTrackConfidence = "Committed" | "Tentative"

export interface MonthRangeTrackSegment {
  /** "YYYY-MM" — must fall within the row's startMonth..endMonth span. */
  month: string
  phase?: string
  /** Full text shown on hover (e.g. "Research — Requirement alignment"); falls back to `phase`. */
  label?: string
}

export interface MonthRangeTrackRow {
  id: string
  /** Accessible name for this row's bar (title/aria-label only — visible labeling like the project name, priority, or owner squad is the caller's job, e.g. a sticky column). */
  label: string
  /** "YYYY-MM", inclusive. */
  startMonth: string
  /** "YYYY-MM", inclusive. */
  endMonth: string
  confidence: MonthRangeTrackConfidence
  /** Secondary visual signal on the bar's color (PRD §3 UI ask: "bar style -> commitment, color -> health"). Omit where health isn't relevant (e.g. Person Timeline) for a neutral bar. */
  health?: ProjectHealth
  /** Phase labels overlaid under the bar. Omit (or pass []) for a plain bar with no labels. */
  segments?: MonthRangeTrackSegment[]
  onClick?: () => void
  /** Short caption under the bar, aligned to its start — e.g. "Support · Cross-squad" for a Person Timeline row. Ignored where `segments` is non-empty. */
  meta?: ReactNode
}

export interface MonthRangeTrackProps {
  rows: MonthRangeTrackRow[]
  monthRange: { start: string; end: string }
  className?: string
}

/** One row's total height in px — bar line + the caption/segment line under it. */
export const MONTH_RANGE_TRACK_ROW_HEIGHT_PX = 56
/** Height of the month header in px. */
export const MONTH_RANGE_TRACK_HEADER_HEIGHT_PX = 32

const MONTH_COLUMN_WIDTH_PX = 92

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [year, month1] = month.split("-").map(Number)
  return { year: year ?? 0, monthIndex: (month1 ?? 1) - 1 }
}

function absoluteMonthIndex(month: string): number {
  const { year, monthIndex } = parseMonth(month)
  return year * 12 + monthIndex
}

/** Inclusive list of "YYYY-MM" strings from range.start to range.end. */
function listMonths(range: { start: string; end: string }): string[] {
  const startIdx = absoluteMonthIndex(range.start)
  const endIdx = absoluteMonthIndex(range.end)
  const months: string[] = []
  for (let idx = startIdx; idx <= endIdx; idx++) {
    const year = Math.floor(idx / 12)
    const monthIndex = idx - year * 12
    months.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}`)
  }
  return months
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** 1-based CSS grid column for a "YYYY-MM" month, clamped onto the visible grid. */
function gridColumnOf(month: string, months: string[]): number {
  const idx = months.indexOf(month)
  if (idx >= 0) return idx + 1
  return month < (months[0] ?? month) ? 1 : months.length
}

/**
 * "YYYY-MM" shifted by `delta` months (may be negative). Exported for callers
 * that need to compute a monthRange from a project/assignment list (e.g. this
 * component's own consumers) without re-deriving month arithmetic themselves.
 */
export function addMonths(month: string, delta: number): string {
  const year = Math.floor((absoluteMonthIndex(month) + delta) / 12)
  const monthIndex = absoluteMonthIndex(month) + delta - year * 12
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

export function MonthRangeTrack({ rows, monthRange, className }: MonthRangeTrackProps) {
  const months = listMonths(monthRange)
  const gridTemplateColumns = `repeat(${months.length}, minmax(${MONTH_COLUMN_WIDTH_PX}px, 1fr))`
  const current = currentMonthKey()

  return (
    <div className={cn("min-w-max", className)}>
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns, height: MONTH_RANGE_TRACK_HEADER_HEIGHT_PX }}
      >
        {months.map((month) => {
          const isCurrent = month === current
          const { year, monthIndex } = parseMonth(month)
          return (
            <div
              key={month}
              className={cn(
                "flex items-center justify-center border-l border-border/60 text-xs first:border-l-0",
                isCurrent
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {MONTH_LABELS[monthIndex]}
              {monthIndex === 0 ? ` '${String(year).slice(2)}` : ""}
            </div>
          )
        })}
      </div>

      <div>
        {rows.map((row) => (
          <TrackRow key={row.id} row={row} months={months} gridTemplateColumns={gridTemplateColumns} />
        ))}
      </div>
    </div>
  )
}

/** "YYYY-MM" -> "Sep 2026", for the bar's hover tooltip. */
function formatMonthLabel(month: string): string {
  const { year, monthIndex } = parseMonth(month)
  return `${MONTH_LABELS[monthIndex]} ${year}`
}

function TrackRow({
  row,
  months,
  gridTemplateColumns,
}: {
  row: MonthRangeTrackRow
  months: string[]
  gridTemplateColumns: string
}) {
  const startCol = gridColumnOf(row.startMonth, months)
  const endCol = gridColumnOf(row.endMonth, months)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!row.onClick) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      row.onClick()
    }
  }

  const bar = (
    <div
      role={row.onClick ? "button" : undefined}
      tabIndex={row.onClick ? 0 : undefined}
      onClick={row.onClick}
      onKeyDown={handleKeyDown}
      aria-label={`${row.label}, ${row.confidence}${row.health ? `, ${row.health}` : ""}`}
      className={cn(
        "my-auto flex h-3 items-center self-center rounded-full border-2",
        projectHealthBarClassName(row.health, row.confidence),
        row.onClick &&
          "cursor-pointer hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      )}
      style={{ gridColumn: `${startCol} / ${endCol + 1}`, gridRow: 1 }}
    />
  )

  return (
    <div
      className="grid border-b border-border/60 last:border-b-0"
      style={{
        gridTemplateColumns,
        gridTemplateRows: "24px 1fr",
        height: MONTH_RANGE_TRACK_ROW_HEIGHT_PX,
      }}
    >
      <Tooltip>
        <TooltipTrigger render={bar} />
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex flex-col gap-1 py-0.5">
            <span className="font-semibold">{row.label}</span>
            <span>
              {formatMonthLabel(row.startMonth)} – {formatMonthLabel(row.endMonth)}
            </span>
            <span className="flex items-center gap-1.5">
              {row.confidence}
              {row.health ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", healthSolidClassName(row.health))} />
                    {row.health}
                  </span>
                </>
              ) : null}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>

      {row.segments && row.segments.length > 0 ? (
        <>
          {row.segments.map((segment) => {
            const col = gridColumnOf(segment.month, months)
            if (col < startCol || col > endCol) return null
            return (
              <div
                key={segment.month}
                title={segment.label ?? segment.phase}
                className="min-w-0 truncate px-1 pt-1 text-[11px] text-muted-foreground"
                style={{ gridColumn: col, gridRow: 2 }}
              >
                {segment.phase ?? ""}
              </div>
            )
          })}
        </>
      ) : row.meta ? (
        <div
          className="min-w-0 truncate px-1 pt-1 text-[11px] text-muted-foreground"
          style={{ gridColumn: `${startCol} / ${endCol + 1}`, gridRow: 2 }}
        >
          {row.meta}
        </div>
      ) : null}
    </div>
  )
}
