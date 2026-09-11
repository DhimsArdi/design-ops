// Presentation-only week-grid renderer for Timeline Week View (docs/PRD.MD
// §14.2, §8.9). Sibling to month-range-track.tsx, not a variant of it — Week
// View is a grid of per-week cells (phase + a short Weekly Focus preview),
// not a continuous bar, so it earns its own small component rather than
// bolting a second rendering mode onto MonthRangeTrack (which stays exactly
// as it was, still shared unchanged with Person Timeline). Knows nothing
// about filters, data fetching, popovers, or the sticky project-info column
// — a caller supplies `{ rows, weeks }` and renders its own label column and
// its own click-to-expand UI (Timeline's WeeklyFocusDialog) alongside it.

import type { KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import {
  currentWeekStart,
  formatWeekGroupMonthLabel,
  formatWeekShortLabel,
  isoWeekNumber,
  monthOfWeek,
} from "@/lib/domain/weekUtils"

export type WeekGridTrackConfidence = "Committed" | "Tentative"

export interface WeekGridTrackCell {
  /** "YYYY-MM-DD" Monday — must appear in the `weeks` list passed to the track. */
  weekStart: string
  /** This week's active ProjectMonthlyTarget phase, if any. */
  phase?: string
  /** Weekly Focus items for this week (zero or many). */
  items: { id: string; title: string }[]
}

export interface WeekGridTrackRow {
  id: string
  /** Accessible name for this row (title/aria-label only) — visible labeling is the caller's sticky column. */
  label: string
  confidence: WeekGridTrackConfidence
  /** Only weeks the project is actually running need an entry here; any week not listed renders as a blank, inactive cell. */
  cells: WeekGridTrackCell[]
  /** Called with the week's "YYYY-MM-DD" when an active cell is clicked/activated. */
  onCellClick?: (weekStart: string) => void
}

export interface WeekGridTrackProps {
  rows: WeekGridTrackRow[]
  /** "YYYY-MM-DD" Mondays, in order — the visible horizon. */
  weeks: string[]
  className?: string
}

/** One row's height in px. */
export const WEEK_GRID_TRACK_ROW_HEIGHT_PX = 84
/** Combined height of the month-group + week-label header rows, in px. */
export const WEEK_GRID_TRACK_HEADER_HEIGHT_PX = 56

const WEEK_COLUMN_WIDTH_PX = 132
const MAX_VISIBLE_ITEMS = 2

function monthGroups(weeks: string[]): { month: string; span: number }[] {
  const groups: { month: string; span: number }[] = []
  for (const week of weeks) {
    const month = monthOfWeek(week)
    const last = groups[groups.length - 1]
    if (last && last.month === month) {
      last.span += 1
    } else {
      groups.push({ month, span: 1 })
    }
  }
  return groups
}

export function WeekGridTrack({ rows, weeks, className }: WeekGridTrackProps) {
  const gridTemplateColumns = `repeat(${weeks.length}, minmax(${WEEK_COLUMN_WIDTH_PX}px, 1fr))`
  const groups = monthGroups(weeks)
  const current = currentWeekStart()

  return (
    <div className={cn("min-w-max", className)}>
      <div style={{ height: WEEK_GRID_TRACK_HEADER_HEIGHT_PX }}>
        {/* Month/year group row — each group spans its own weeks via an explicit column count against the same gridTemplateColumns the week row below uses, so group boundaries line up with week columns exactly. */}
        <div className="grid border-b border-border/60" style={{ gridTemplateColumns, height: 22 }}>
          {groups.map((group, index) => (
            <div
              key={`${group.month}-${index}`}
              className="truncate border-l border-border/60 pl-1.5 text-[11px] font-semibold text-muted-foreground first:border-l-0"
              style={{ gridColumn: `span ${group.span}` }}
            >
              {formatWeekGroupMonthLabel(group.month)}
            </div>
          ))}
        </div>
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns, height: 34 }}
        >
          {weeks.map((week) => {
            const isCurrent = week === current
            return (
              <div
                key={week}
                className={cn(
                  "flex flex-col items-center justify-center border-l border-border/60 text-[11px] first:border-l-0",
                  isCurrent
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <span>{formatWeekShortLabel(week)}</span>
                <span className="text-[10px] opacity-70">W{isoWeekNumber(week)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        {rows.map((row) => (
          <GridRow key={row.id} row={row} weeks={weeks} gridTemplateColumns={gridTemplateColumns} />
        ))}
      </div>
    </div>
  )
}

function GridRow({
  row,
  weeks,
  gridTemplateColumns,
}: {
  row: WeekGridTrackRow
  weeks: string[]
  gridTemplateColumns: string
}) {
  const isCommitted = row.confidence === "Committed"
  const cellsByWeek = new Map(row.cells.map((cell) => [cell.weekStart, cell]))

  return (
    <div
      className="grid border-b border-border/60 last:border-b-0"
      style={{ gridTemplateColumns, height: WEEK_GRID_TRACK_ROW_HEIGHT_PX }}
    >
      {weeks.map((week) => {
        const cell = cellsByWeek.get(week)
        if (!cell) {
          return <div key={week} className="border-l border-border/30 first:border-l-0" />
        }

        const visibleItems = cell.items.slice(0, MAX_VISIBLE_ITEMS)
        const remaining = cell.items.length - visibleItems.length
        const clickable = Boolean(row.onCellClick)

        function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
          if (!row.onCellClick) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            row.onCellClick(cell!.weekStart)
          }
        }

        return (
          <div
            key={week}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => row.onCellClick!(cell.weekStart) : undefined}
            onKeyDown={handleKeyDown}
            title={`${cell.phase ?? row.label}, week of ${cell.weekStart}`}
            className={cn(
              "flex min-w-0 flex-col gap-0.5 border-l border-border/30 px-1.5 py-1.5 first:border-l-0",
              clickable && "cursor-pointer hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-0 w-full border-t-2",
                isCommitted
                  ? "border-solid border-foreground/50"
                  : "border-dashed border-muted-foreground/50 opacity-70"
              )}
            />
            {cell.phase ? (
              <span className="truncate text-[11px] font-medium text-foreground">{cell.phase}</span>
            ) : null}
            {visibleItems.map((item) => (
              <span key={item.id} className="truncate text-[11px] text-muted-foreground">
                {item.title}
              </span>
            ))}
            {remaining > 0 ? (
              <span className="truncate text-[11px] text-muted-foreground/70">+{remaining} more</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
