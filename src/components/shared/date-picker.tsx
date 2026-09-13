// Single-date field used everywhere the app collects a day-level date
// (docs/PRD.MD §8.2 — Project start/end, completion date).
//
// Replaces `<Input type="date">`: the native control renders a different
// widget per browser/OS, ignores the app's theme entirely, and navigates one
// month at a time — painful for a planner that schedules a year or more out.
// This is the themed Calendar in a Popover, with month/year dropdowns so any
// month in the supported window is two clicks away.
//
// Values stay "YYYY-MM-DD" strings in and out, so callers are unchanged from
// the native input they replaced; parseDate/formatDate (dateUtils) are the
// only place that meets Date instances, matching the rest of the codebase.

"use client"

import { useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate, parseDate } from "@/lib/domain/dateUtils"
import { useUserPreferences } from "@/lib/identity/current-user"
import { weekStartIndex } from "@/lib/identity/preferences"
import { cn } from "cn"

// Dropdown navigation needs an explicit window: react-day-picker otherwise
// stops the year list at the end of the current year, which would hide every
// future quarter this app exists to plan.
const YEARS_BACK = 3
const YEARS_AHEAD = 6

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatTriggerLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return date
  return DATE_FORMATTER.format(new Date(year, month - 1, day))
}

interface DatePickerProps {
  /** "YYYY-MM-DD", or "" for no selection. */
  value: string
  onChange: (next: string) => void
  id?: string
  placeholder?: string
  /** Earliest selectable day, "YYYY-MM-DD" — earlier days render disabled. */
  min?: string
  /** Latest selectable day, "YYYY-MM-DD". */
  max?: string
  disabled?: boolean
  "aria-label"?: string
  className?: string
}

function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Select date",
  min,
  max,
  disabled,
  "aria-label": ariaLabel,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  // The one place the "week starts on" preference is read for a calendar grid
  // (docs/PRD.MD §14.10). Every date field in the app comes through here, so
  // setting it once covers all of them.
  const { weekStartsOn } = useUserPreferences()

  const selected = value ? parseDate(value) : undefined
  const thisYear = new Date().getFullYear()
  // The dropdown window always contains the current selection, so editing an
  // old project never opens on a month its own year dropdown cannot show.
  const selectedYear = selected?.getFullYear() ?? thisYear
  const startMonth = new Date(Math.min(thisYear - YEARS_BACK, selectedYear), 0)
  const endMonth = new Date(Math.max(thisYear + YEARS_AHEAD, selectedYear), 11)

  // One matcher per bound, never `{ before, after }` together — that form
  // means "between the two" in react-day-picker, the inverse of a min/max.
  const disabledDays = [
    ...(min ? [{ before: parseDate(min) }] : []),
    ...(max ? [{ after: parseDate(max) }] : []),
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "h-9 w-full justify-between px-2.5 font-normal",
              !value && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <span className="truncate">{value ? formatTriggerLabel(value) : placeholder}</span>
        <CalendarIcon className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          autoFocus
          captionLayout="dropdown"
          weekStartsOn={weekStartIndex(weekStartsOn)}
          selected={selected}
          defaultMonth={selected}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={disabledDays}
          onSelect={(next: Date | undefined) => {
            if (!next) return
            onChange(formatDate(next))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
export type { DatePickerProps }
