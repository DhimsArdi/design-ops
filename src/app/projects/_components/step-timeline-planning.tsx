// Add/Edit Project — Step 2: Timeline & Planning (docs/PRD.MD §22). Two
// sub-views under one shared Start/End Month range: Monthly (unchanged
// Monthly Target behavior) and Weekly (new — Project Weekly Focus, §8.9).
//
// Start/End Month drive both: Monthly's generated row list, and the set of
// Mondays Weekly Focus can be filed against. Growing the range only ever
// adds blank monthly rows; shrinking it past a month that already has a
// saved monthly Phase/Target, or past a week that already has a Weekly
// Focus item, requires an explicit confirmation click before that data is
// dropped (PRD §22/§25 — "do not silently discard data"). Until confirmed,
// the range change is not applied at all.

import { useState } from "react"
import { AlertTriangle, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PROJECT_PHASES, type ProjectPhase } from "@/lib/domain/enums"
import { formatWeekRangeLabel } from "@/lib/domain/weekUtils"
import {
  buildMonthlyTargetRows,
  formatMonthLabel,
  monthlyTargetRowHasData,
  monthsInRange,
  newWeeklyFocusItem,
  weekOptionsForRange,
  weeklyFocusItemHasData,
  type MonthlyTargetRowState,
  type WeeklyFocusItemState,
} from "./project-form-types"

interface StepTimelinePlanningProps {
  startMonth: string
  endMonth: string
  monthlyRows: MonthlyTargetRowState[]
  weeklyFocus: WeeklyFocusItemState[]
  onRangeCommit: (next: {
    startMonth: string
    endMonth: string
    monthlyRows: MonthlyTargetRowState[]
    weeklyFocus: WeeklyFocusItemState[]
  }) => void
  onMonthlyRowFieldChange: (
    month: string,
    patch: Partial<Pick<MonthlyTargetRowState, "phase" | "target">>,
  ) => void
  onWeeklyFocusAdd: (item: WeeklyFocusItemState) => void
  onWeeklyFocusRemove: (key: string) => void
}

interface PendingRangeChange {
  startMonth: string
  endMonth: string
  months: string[]
  weekOptions: string[]
  droppedMonthlyRows: MonthlyTargetRowState[]
  droppedWeeklyFocus: WeeklyFocusItemState[]
}

function StepTimelinePlanning({
  startMonth,
  endMonth,
  monthlyRows,
  weeklyFocus,
  onRangeCommit,
  onMonthlyRowFieldChange,
  onWeeklyFocusAdd,
  onWeeklyFocusRemove,
}: StepTimelinePlanningProps) {
  const [pending, setPending] = useState<PendingRangeChange | null>(null)
  const [subView, setSubView] = useState<"monthly" | "weekly">("monthly")
  const [newWeek, setNewWeek] = useState("")
  const [newTitle, setNewTitle] = useState("")

  const rangeIsValid = startMonth !== "" && endMonth !== "" && monthsInRange(startMonth, endMonth).length > 0
  const rangeError =
    startMonth && endMonth && monthsInRange(startMonth, endMonth).length === 0
      ? "End Month must be the same as, or after, Start Month."
      : null
  const weekOptions = rangeIsValid ? weekOptionsForRange(startMonth, endMonth) : []

  function tryApplyRange(nextStart: string, nextEnd: string) {
    setPending(null)

    if (!nextStart || !nextEnd) {
      onRangeCommit({ startMonth: nextStart, endMonth: nextEnd, monthlyRows, weeklyFocus })
      return
    }

    const months = monthsInRange(nextStart, nextEnd)
    if (months.length === 0) {
      // Invalid range (end before start) — surface the input + inline error,
      // leave the row data alone until it's valid again.
      onRangeCommit({ startMonth: nextStart, endMonth: nextEnd, monthlyRows, weeklyFocus })
      return
    }

    const nextWeekOptions = weekOptionsForRange(nextStart, nextEnd)
    const droppedMonthlyRows = monthlyRows.filter(
      (row) => !months.includes(row.month) && monthlyTargetRowHasData(row),
    )
    const droppedWeeklyFocus = weeklyFocus.filter(
      (item) => weeklyFocusItemHasData(item) && !nextWeekOptions.includes(item.weekStartDate),
    )

    if (droppedMonthlyRows.length > 0 || droppedWeeklyFocus.length > 0) {
      setPending({
        startMonth: nextStart,
        endMonth: nextEnd,
        months,
        weekOptions: nextWeekOptions,
        droppedMonthlyRows,
        droppedWeeklyFocus,
      })
      return
    }

    onRangeCommit({
      startMonth: nextStart,
      endMonth: nextEnd,
      monthlyRows: buildMonthlyTargetRows(months, monthlyRows),
      weeklyFocus,
    })
  }

  function confirmPending() {
    if (!pending) return
    const keptWeeklyFocus = weeklyFocus.filter((item) => pending.weekOptions.includes(item.weekStartDate))
    onRangeCommit({
      startMonth: pending.startMonth,
      endMonth: pending.endMonth,
      monthlyRows: buildMonthlyTargetRows(pending.months, monthlyRows),
      weeklyFocus: keptWeeklyFocus,
    })
    setPending(null)
  }

  function handleAddWeeklyFocus() {
    if (!newWeek || newTitle.trim() === "") return
    onWeeklyFocusAdd(newWeeklyFocusItem(newWeek, newTitle.trim()))
    setNewTitle("")
  }

  // Grouped by week for display (a week can hold multiple items), sorted
  // chronologically — matches the Timeline Week View / Project Detail
  // "Weekly Plan" grouping so the same data always looks the same way.
  const weeksWithFocus = [...new Set(weeklyFocus.map((item) => item.weekStartDate))].sort()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-start-month">Start Month *</Label>
          <Input
            id="project-start-month"
            type="month"
            value={startMonth}
            onChange={(event) => tryApplyRange(event.target.value, endMonth)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-end-month">End Month *</Label>
          <Input
            id="project-end-month"
            type="month"
            value={endMonth}
            onChange={(event) => tryApplyRange(startMonth, event.target.value)}
          />
        </div>
      </div>

      {rangeError ? <p className="text-sm text-destructive">{rangeError}</p> : null}

      {pending ? (
        <div className="flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-status-warning">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              {pending.droppedMonthlyRows.length > 0
                ? `${pending.droppedMonthlyRows.map((row) => formatMonthLabel(row.month)).join(", ")} already ${pending.droppedMonthlyRows.length === 1 ? "has" : "have"} a saved Phase or Target. `
                : ""}
              {pending.droppedWeeklyFocus.length > 0
                ? `${pending.droppedWeeklyFocus.length} Weekly Focus item${pending.droppedWeeklyFocus.length === 1 ? "" : "s"} would fall outside the new range. `
                : ""}
              Changing the timeline to this range will remove that data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="destructive" onClick={confirmPending}>
              Remove and continue
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
              Keep current dates
            </Button>
          </div>
        </div>
      ) : null}

      {rangeIsValid && !pending ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {monthlyRows.length} month{monthlyRows.length === 1 ? "" : "s"} · {formatMonthLabel(startMonth)} – {formatMonthLabel(endMonth)}
            </p>
            <div className="inline-flex items-center gap-0.5 rounded-md border border-border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={subView === "monthly" ? "default" : "ghost"}
                onClick={() => setSubView("monthly")}
                aria-pressed={subView === "monthly"}
              >
                Monthly
              </Button>
              <Button
                type="button"
                size="sm"
                variant={subView === "weekly" ? "default" : "ghost"}
                onClick={() => setSubView("weekly")}
                aria-pressed={subView === "weekly"}
              >
                Weekly
              </Button>
            </div>
          </div>

          {subView === "monthly" ? (
            <div className="space-y-2">
              <div className="divide-y divide-border rounded-md border border-border">
                {monthlyRows.map((row) => (
                  <div
                    key={row.month}
                    className="grid grid-cols-1 items-center gap-2.5 p-3 sm:grid-cols-[6.5rem_10rem_1fr]"
                  >
                    <p className="text-sm font-medium text-foreground">{formatMonthLabel(row.month)}</p>
                    <Select
                      value={row.phase}
                      onValueChange={(phase) =>
                        onMonthlyRowFieldChange(row.month, { phase: phase as ProjectPhase | null })
                      }
                    >
                      <SelectTrigger className="w-full" aria-label={`Phase for ${formatMonthLabel(row.month)}`}>
                        <SelectValue placeholder="No phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No phase</SelectItem>
                        {PROJECT_PHASES.map((phase) => (
                          <SelectItem key={phase} value={phase}>
                            {phase}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={row.target}
                      onChange={(event) => onMonthlyRowFieldChange(row.month, { target: event.target.value })}
                      placeholder="Target for this month (optional)"
                      aria-label={`Target for ${formatMonthLabel(row.month)}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Months without a target are allowed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weeksWithFocus.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Weekly Focus items yet. Add what this project is focusing on in a given week below.
                </p>
              ) : (
                <div className="space-y-3">
                  {weeksWithFocus.map((week) => (
                    <div key={week} className="space-y-1.5 rounded-md border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatWeekRangeLabel(week)}
                      </p>
                      <ul className="space-y-1.5">
                        {weeklyFocus
                          .filter((item) => item.weekStartDate === week)
                          .map((item) => (
                            <li
                              key={item.key}
                              className="flex items-center justify-between gap-2 text-sm text-foreground"
                            >
                              <span className="min-w-0 truncate">{item.title}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Remove ${item.title}`}
                                onClick={() => onWeeklyFocusRemove(item.key)}
                              >
                                <X />
                              </Button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 rounded-md border border-dashed border-border p-3 sm:grid-cols-[10rem_1fr_auto]">
                <Select value={newWeek} onValueChange={(value) => setNewWeek(value ?? "")}>
                  <SelectTrigger className="w-full" aria-label="Week">
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((week) => (
                      <SelectItem key={week} value={week}>
                        {formatWeekRangeLabel(week)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="What is this project focusing on that week?"
                  aria-label="Weekly focus title"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddWeeklyFocus}
                  disabled={!newWeek || newTitle.trim() === ""}
                >
                  <Plus />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A week may have zero, one, or several Weekly Focus items. This is a short planning note, not a task list.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export { StepTimelinePlanning }
export type { StepTimelinePlanningProps }
