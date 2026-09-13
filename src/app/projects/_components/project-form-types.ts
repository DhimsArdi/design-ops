// Shared form state, month-range math, and Project/domain adapters for the
// Add/Edit Project wizard (docs/PRD.MD §20-25). Framework-agnostic (no
// React import) so the wizard and every step component derive from the same
// shapes instead of each re-deriving its own.

import type {
  Priority,
  ProjectHealth,
  ProjectPhase,
  ProjectStatus,
  TimelineConfidence,
} from "@/lib/domain/enums"
import {
  PRIORITIES,
  PROJECT_HEALTHS,
  PROJECT_STATUSES,
  TIMELINE_CONFIDENCES,
} from "@/lib/domain/enums"
import type {
  Project,
  ProjectAssignment,
  ProjectMonthlyTarget,
  ProjectWeeklyFocus,
} from "@/lib/domain/types"
import type { ProjectRole } from "@/lib/domain/enums"
import { activeOrSelected, byName } from "@/lib/domain/optionHelpers"
import { mondaysInMonthRange } from "@/lib/domain/weekUtils"
import { monthOf } from "@/lib/domain/dateUtils"

interface ProjectContextFormState {
  name: string
  epicId: string
  departmentId: string
  productOwnerIds: string[]
  projectAdminIds: string[]
  priority: Priority
  status: ProjectStatus
  health: ProjectHealth
  timelineConfidence: TimelineConfidence
  ownerSquadId: string
  description: string
}

/** One Step 2 row. `phase: null` means "no phase chosen yet" — distinct from
 * a persisted ProjectMonthlyTarget, whose `phase` is required (§8.8). See
 * `toPersistableRows` for how a null phase is resolved at save time. */
interface MonthlyTargetRowState {
  month: string
  phase: ProjectPhase | null
  target: string
}

interface DesignTeamFormState {
  leadDesignerId: string | null
  supportDesignerIds: string[]
}

/** One Weekly Focus item being edited (docs/PRD.MD §8.9, §22). `key` is a
 * stable client-side identity for React + in-place editing, independent of
 * `id`: `id` is the persisted ProjectWeeklyFocus id (null for an item not yet
 * saved). Unlike a monthly target row, there is no one-row-per-week
 * constraint, so items are reconciled by `id`, not by `weekStartDate`. */
interface WeeklyFocusItemState {
  key: string
  id: string | null
  weekStartDate: string
  title: string
  description: string
}

/** Per-field validation messages for Step 1, keyed by the field they belong
 * under. Computed by the wizard — which is the only place that knows whether
 * the user has tried to continue yet — so a step component never decides on
 * its own when to complain. An absent key means that field is fine. */
type ProjectContextErrors = Partial<
  Record<"name" | "epicId" | "departmentId" | "productOwnerIds" | "ownerSquadId", string>
>

/** The same, for Step 2's date range. */
type TimelineErrors = Partial<Record<"startDate" | "endDate", string>>

interface ProjectFormState {
  context: ProjectContextFormState
  // Day-level, inclusive (PRD §8.2). The month rows below are derived from
  // these with monthOf(), never stored alongside them.
  startDate: string
  endDate: string
  monthlyTargets: MonthlyTargetRowState[]
  weeklyFocus: WeeklyFocusItemState[]
  team: DesignTeamFormState
}

function emptyProjectFormState(): ProjectFormState {
  return {
    context: {
      name: "",
      epicId: "",
      departmentId: "",
      productOwnerIds: [],
      projectAdminIds: [],
      priority: PRIORITIES[0],
      status: PROJECT_STATUSES[0],
      // Health is not asked for when creating a project — a project with no
      // work behind it yet has no evidence of being On Track or otherwise, so
      // the wizard hides the field in create mode and it is first assessed
      // from Edit Project. The column is `not null` with three allowed values
      // (supabase/schema.sql), so a new row still has to carry one; adding a
      // fourth "Not assessed" value would be a schema + Overview + Timeline
      // change rather than a form change. See docs/DECISIONS.md.
      health: PROJECT_HEALTHS[0],
      timelineConfidence: TIMELINE_CONFIDENCES[0],
      ownerSquadId: "",
      description: "",
    },
    startDate: "",
    endDate: "",
    monthlyTargets: [],
    weeklyFocus: [],
    team: {
      leadDesignerId: null,
      supportDesignerIds: [],
    },
  }
}

/** Rebuilds Step 2's form state from an existing Project + its assignments +
 * its saved monthly targets + its saved weekly focus items (edit mode prefill). */
function buildFormStateFromProject(
  project: Project,
  assignments: ProjectAssignment[],
  monthlyTargets: ProjectMonthlyTarget[],
  weeklyFocus: ProjectWeeklyFocus[] = [],
): ProjectFormState {
  const lead = assignments.find((assignment) => assignment.project_role === "Lead")
  const support = assignments.filter((assignment) => assignment.project_role === "Support")
  const months = monthsInRange(monthOf(project.start_date), monthOf(project.end_date))
  const savedRows: MonthlyTargetRowState[] = monthlyTargets.map((target) => ({
    month: target.month,
    phase: target.phase,
    target: target.target,
  }))

  return {
    context: {
      name: project.name,
      epicId: project.epic_id,
      departmentId: project.department_id,
      productOwnerIds: [...project.product_owner_ids],
      projectAdminIds: [...project.project_admin_ids],
      priority: project.priority,
      status: project.status,
      health: project.health,
      timelineConfidence: project.timeline_confidence,
      ownerSquadId: project.owner_squad_id,
      description: project.description,
    },
    startDate: project.start_date,
    endDate: project.end_date,
    monthlyTargets: buildMonthlyTargetRows(months, savedRows),
    weeklyFocus: [...weeklyFocus]
      .sort((a, b) => a.week_start_date.localeCompare(b.week_start_date))
      .map((item) => ({
        key: item.id,
        id: item.id,
        weekStartDate: item.week_start_date,
        title: item.title,
        description: item.description ?? "",
      })),
    team: {
      leadDesignerId: lead ? lead.designer_id : null,
      supportDesignerIds: support.map((assignment) => assignment.designer_id),
    },
  }
}

/** Every "YYYY-MM" month from `start` to `end` inclusive, in order. Handles
 * a year boundary (e.g. "2026-11" -> "2027-02"). Empty when either month is
 * missing/malformed, or `end` is before `start`. */
function monthsInRange(start: string, end: string): string[] {
  const startIndex = monthIndex(start)
  const endIndex = monthIndex(end)
  if (startIndex === null || endIndex === null || endIndex < startIndex) return []

  const months: string[] = []
  for (let index = startIndex; index <= endIndex; index += 1) {
    months.push(monthFromIndex(index))
  }
  return months
}

function monthIndex(month: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return null
  const year = Number(match[1])
  const monthNum = Number(match[2])
  if (monthNum < 1 || monthNum > 12) return null
  return year * 12 + (monthNum - 1)
}

function monthFromIndex(index: number): string {
  const year = Math.floor(index / 12)
  const monthNum = (index % 12) + 1
  return `${year}-${String(monthNum).padStart(2, "0")}`
}

/** "2026-09" -> "Sep 2026". Falls back to the raw string if malformed. */
function formatMonthLabel(month: string): string {
  const index = monthIndex(month)
  if (index === null) return month
  const date = new Date(Date.UTC(Math.floor(index / 12), index % 12, 1))
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
}

/** "2026-09-07" -> "Sep 7, 2026". Falls back to the raw string if malformed. */
function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return date
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

/** True when a row has anything worth warning about before it's dropped by
 * a shrinking timeline (PRD §22/§25 — "do not silently discard data"). */
function monthlyTargetRowHasData(row: MonthlyTargetRowState): boolean {
  return row.phase !== null || row.target.trim() !== ""
}

/** Rebuilds the row list for a new set of months: keeps existing row data
 * for months still in range (matched by month), adds a blank row for any
 * newly-included month, and drops rows for months no longer in range. The
 * caller is responsible for warning about (and confirming) the loss of any
 * data-bearing dropped row first — this function itself is not destructive
 * to anything already persisted. */
function buildMonthlyTargetRows(
  months: string[],
  previousRows: MonthlyTargetRowState[],
): MonthlyTargetRowState[] {
  const byMonth = new Map(previousRows.map((row) => [row.month, row]))
  return months.map(
    (month) => byMonth.get(month) ?? { month, phase: null, target: "" },
  )
}

/** The rows that actually get persisted as ProjectMonthlyTarget records —
 * rows with neither a Phase nor a Target are skipped ("months without
 * targets are allowed", PRD §22). A row with a Target but no chosen Phase
 * still needs a real ProjectPhase to satisfy the schema (§8.8 has no
 * nullable phase); "Other" is the enum's designed catch-all for that case. */
function toPersistableRows(
  rows: MonthlyTargetRowState[],
): { month: string; phase: ProjectPhase; target: string }[] {
  return rows.filter(monthlyTargetRowHasData).map((row) => ({
    month: row.month,
    phase: row.phase ?? "Other",
    target: row.target.trim(),
  }))
}

/** Every Monday a Weekly Focus item can be filed against, given the
 * project's current Start/End Month range (PRD §8.9/§22). */
function weekOptionsForRange(startMonth: string, endMonth: string): string[] {
  return mondaysInMonthRange(startMonth, endMonth)
}

/** A freshly-added, not-yet-persisted Weekly Focus item. */
function newWeeklyFocusItem(weekStartDate: string, title: string): WeeklyFocusItemState {
  return { key: crypto.randomUUID(), id: null, weekStartDate, title, description: "" }
}

/** True when an item has a title worth keeping — an item whose title was
 * cleared after being added is dropped at save time rather than persisted
 * as an empty row (mirrors monthlyTargetRowHasData's "don't save nothing"). */
function weeklyFocusItemHasData(item: WeeklyFocusItemState): boolean {
  return item.title.trim() !== ""
}

/** The Lead+Support roster this form state wants — the `desired` argument
 * for `projectAssignmentRepository.reconcile()` (docs/PRD.MD §8.7), on both
 * create and edit. */
function desiredAssignments(
  team: DesignTeamFormState,
): { designerId: string; role: ProjectRole }[] {
  return [
    ...(team.leadDesignerId ? [{ designerId: team.leadDesignerId, role: "Lead" as const }] : []),
    ...team.supportDesignerIds.map((id) => ({ designerId: id, role: "Support" as const })),
  ]
}

/** The items that actually get persisted as ProjectWeeklyFocus records. */
function toPersistableWeeklyFocus(
  items: WeeklyFocusItemState[],
): { id: string | null; weekStartDate: string; title: string; description: string }[] {
  return items.filter(weeklyFocusItemHasData).map((item) => ({
    id: item.id,
    weekStartDate: item.weekStartDate,
    title: item.title.trim(),
    description: item.description.trim(),
  }))
}

export {
  activeOrSelected,
  buildFormStateFromProject,
  buildMonthlyTargetRows,
  byName,
  desiredAssignments,
  emptyProjectFormState,
  formatDateLabel,
  formatMonthLabel,
  monthlyTargetRowHasData,
  monthsInRange,
  newWeeklyFocusItem,
  toPersistableRows,
  toPersistableWeeklyFocus,
  weekOptionsForRange,
  weeklyFocusItemHasData,
}
export type {
  DesignTeamFormState,
  MonthlyTargetRowState,
  ProjectContextErrors,
  ProjectContextFormState,
  ProjectFormState,
  TimelineErrors,
  WeeklyFocusItemState,
}
