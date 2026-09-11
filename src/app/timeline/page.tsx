"use client"

// Timeline — the primary portfolio visualization (PRD §14.2, §29-32). Two
// view modes sharing one set of filters and one sticky project-info column:
//
// - Month (default): every project's start_month->end_month as a bar, solid
//   for Committed / dashed for Tentative, with ProjectMonthlyTarget phase
//   labels overlaid — rendered by the shared, unchanged
//   src/components/timeline/month-range-track.tsx (still used as-is by
//   Person Timeline, PRD §14.6).
// - Week (new, PRD §14.2/§8.9): an operational view for Design Leads — one
//   cell per week per project, showing that month's phase plus a short
//   Project Weekly Focus preview. Rendered by the sibling
//   src/components/timeline/week-grid-track.tsx. Not a task board — see
//   docs/PRD.MD §8.9/§38 for what Weekly Focus deliberately excludes.
//
// Done and Archived projects are excluded by default in both views
// (docs/DECISIONS.md, PRD §14.2): Done is reachable by explicitly picking it
// in the Status filter, Archived by the "Show archived" switch.

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { CalendarRange, ChevronLeft, ChevronRight, Plus, SearchX } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MonthRangeTrack,
  addMonths,
  MONTH_RANGE_TRACK_ROW_HEIGHT_PX,
  MONTH_RANGE_TRACK_HEADER_HEIGHT_PX,
} from "@/components/timeline/month-range-track"
import type { MonthRangeTrackRow } from "@/components/timeline/month-range-track"
import {
  WeekGridTrack,
  WEEK_GRID_TRACK_ROW_HEIGHT_PX,
  WEEK_GRID_TRACK_HEADER_HEIGHT_PX,
} from "@/components/timeline/week-grid-track"
import type { WeekGridTrackRow } from "@/components/timeline/week-grid-track"

import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as projectMonthlyTargetRepository from "@/lib/repositories/projectMonthlyTargetRepository"
import * as projectWeeklyFocusRepository from "@/lib/repositories/projectWeeklyFocusRepository"
import { getProjectAssignments, getProjectLead } from "@/lib/selectors/projectSelectors"
import { PRIORITIES, PROJECT_HEALTHS, PROJECT_STATUSES } from "@/lib/domain/enums"
import type { Priority, ProjectHealth, ProjectStatus } from "@/lib/domain/enums"
import {
  addWeeks,
  currentWeekStart,
  formatWeekGroupMonthLabel,
  formatWeekRangeLabel,
  listWeeks,
  monthOfWeek,
} from "@/lib/domain/weekUtils"

// Same "all" | <value> plain-state filter convention as /projects — no URL
// query-param sync (see that page's comment for the shape to mirror if a
// later phase needs deep-linking).
type SquadFilter = "all" | string
type DepartmentFilter = "all" | string
type EpicFilter = "all" | string
type DesignerFilter = "all" | string
type PriorityFilter = "all" | Priority
type StatusFilter = "all" | ProjectStatus
type HealthFilter = "all" | ProjectHealth
type TimelineView = "month" | "week"

// If visible projects span fewer months than this, the grid is padded out
// (mostly forward) so it never renders as a degenerate 1-2 column strip.
const MIN_VISIBLE_MONTHS = 6
// Week View's default horizon (PRD §14.2: "approximately 6-8 weeks"),
// independent of how far the portfolio's projects actually span.
const WEEK_VIEW_HORIZON = 8

function monthsBetween(start: string, end: string): number {
  const [startYear, startMonth] = start.split("-").map(Number)
  const [endYear, endMonth] = end.split("-").map(Number)
  return (endYear! - startYear!) * 12 + (endMonth! - startMonth!)
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthHeaderLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number)
  if (!year || !monthIndex) return month
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export default function TimelinePage() {
  const [projects] = useRepositoryList(projectRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [departments] = useRepositoryList(departmentRepository)
  const [epics] = useRepositoryList(epicRepository)
  const [designers] = useRepositoryList(designerRepository)
  const [monthlyTargets] = useRepositoryList(projectMonthlyTargetRepository)
  const [weeklyFocus] = useRepositoryList(projectWeeklyFocusRepository)

  const router = useRouter()

  const [view, setView] = useState<TimelineView>("month")
  const [monthNavOffset, setMonthNavOffset] = useState(0)
  const [weekNavOffset, setWeekNavOffset] = useState(0)
  const [selectedWeekDetail, setSelectedWeekDetail] = useState<{
    projectId: string
    weekStart: string
  } | null>(null)

  const [squadFilter, setSquadFilter] = useState<SquadFilter>("all")
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all")
  const [epicFilter, setEpicFilter] = useState<EpicFilter>("all")
  const [designerFilter, setDesignerFilter] = useState<DesignerFilter>("all")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all")
  const [showArchived, setShowArchived] = useState(false)

  const squadsById = useMemo(() => new Map(squads.map((s) => [s.id, s])), [squads])

  const squadOptions = useMemo(
    () => [...squads].sort((a, b) => a.name.localeCompare(b.name)),
    [squads]
  )
  const departmentOptions = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name)),
    [departments]
  )
  const epicOptions = useMemo(() => [...epics].sort((a, b) => a.name.localeCompare(b.name)), [epics])
  const designerOptions = useMemo(
    () =>
      designers
        .filter((designer) => designer.status === "Active")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [designers]
  )

  const visibleProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (!showArchived && project.is_archived) return false
      const statusMatches =
        statusFilter === "all" ? project.status !== "Done" : project.status === statusFilter
      if (!statusMatches) return false
      if (priorityFilter !== "all" && project.priority !== priorityFilter) return false
      if (healthFilter !== "all" && project.health !== healthFilter) return false
      if (squadFilter !== "all" && project.owner_squad_id !== squadFilter) return false
      if (departmentFilter !== "all" && project.department_id !== departmentFilter) return false
      if (epicFilter !== "all" && project.epic_id !== epicFilter) return false
      if (designerFilter !== "all") {
        const isAssigned = getProjectAssignments(project.id).some(
          (assignment) => assignment.designer_id === designerFilter
        )
        if (!isAssigned) return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      const priorityDiff = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
      return priorityDiff !== 0 ? priorityDiff : a.start_month.localeCompare(b.start_month)
    })
  }, [
    projects,
    showArchived,
    statusFilter,
    priorityFilter,
    healthFilter,
    squadFilter,
    departmentFilter,
    epicFilter,
    designerFilter,
  ])

  // Month View's range auto-fits to every visible project (padded to a
  // 6-month floor) — unchanged from before Week View existed. monthNavOffset
  // (Previous/Next/Today) slides that same-width window earlier or later.
  const autoMonthRange = useMemo(() => {
    const current = currentMonthKey()
    if (visibleProjects.length === 0) {
      return { start: addMonths(current, -2), end: addMonths(current, 3) }
    }

    let start = visibleProjects[0]!.start_month
    let end = visibleProjects[0]!.end_month
    for (const project of visibleProjects) {
      if (project.start_month < start) start = project.start_month
      if (project.end_month > end) end = project.end_month
    }

    const span = monthsBetween(start, end) + 1
    if (span < MIN_VISIBLE_MONTHS) {
      const deficit = MIN_VISIBLE_MONTHS - span
      start = addMonths(start, -Math.floor(deficit / 2))
      end = addMonths(end, Math.ceil(deficit / 2))
    }
    return { start, end }
  }, [visibleProjects])

  const monthRange = useMemo(
    () => ({
      start: addMonths(autoMonthRange.start, monthNavOffset),
      end: addMonths(autoMonthRange.end, monthNavOffset),
    }),
    [autoMonthRange, monthNavOffset]
  )

  // Week View always uses a short, fixed horizon regardless of portfolio
  // span (PRD §14.2) — centered a couple of weeks back from today by
  // default so "today" sits inside the visible window, not at its edge.
  const baseWeekStart = useMemo(() => addWeeks(currentWeekStart(), -2), [])
  const weekRangeStart = useMemo(
    () => addWeeks(baseWeekStart, weekNavOffset),
    [baseWeekStart, weekNavOffset]
  )
  const weeks = useMemo(
    () =>
      listWeeks({
        start: weekRangeStart,
        end: addWeeks(weekRangeStart, WEEK_VIEW_HORIZON - 1),
      }),
    [weekRangeStart]
  )

  const monthRows: MonthRangeTrackRow[] = useMemo(
    () =>
      visibleProjects.map((project) => ({
        id: project.id,
        label: project.name,
        startMonth: project.start_month,
        endMonth: project.end_month,
        confidence: project.timeline_confidence,
        segments: monthlyTargets
          .filter((target) => target.project_id === project.id)
          .map((target) => ({
            month: target.month,
            phase: target.phase,
            label: `${target.phase}: ${target.target}`,
          })),
        onClick: () => router.push(`/projects/${project.id}`),
      })),
    [visibleProjects, monthlyTargets, router]
  )

  const weekRows: WeekGridTrackRow[] = useMemo(
    () =>
      visibleProjects.map((project) => {
        const phaseByMonth = new Map(
          monthlyTargets
            .filter((target) => target.project_id === project.id)
            .map((target) => [target.month, target.phase] as const)
        )
        const focusByWeek = new Map<string, { id: string; title: string }[]>()
        for (const item of weeklyFocus) {
          if (item.project_id !== project.id) continue
          const list = focusByWeek.get(item.week_start_date) ?? []
          list.push({ id: item.id, title: item.title })
          focusByWeek.set(item.week_start_date, list)
        }

        const cells = weeks
          .filter((week) => {
            const month = monthOfWeek(week)
            return month >= project.start_month && month <= project.end_month
          })
          .map((week) => ({
            weekStart: week,
            phase: phaseByMonth.get(monthOfWeek(week)),
            items: focusByWeek.get(week) ?? [],
          }))

        return {
          id: project.id,
          label: project.name,
          confidence: project.timeline_confidence,
          cells,
          onCellClick: (weekStart: string) =>
            setSelectedWeekDetail({ projectId: project.id, weekStart }),
        }
      }),
    [visibleProjects, weeks, monthlyTargets, weeklyFocus]
  )

  function clearFilters() {
    setSquadFilter("all")
    setDepartmentFilter("all")
    setEpicFilter("all")
    setDesignerFilter("all")
    setPriorityFilter("all")
    setStatusFilter("all")
    setHealthFilter("all")
    setShowArchived(false)
  }

  function goToday() {
    if (view === "month") setMonthNavOffset(0)
    else setWeekNavOffset(0)
  }
  function goPrevious() {
    if (view === "month") setMonthNavOffset((offset) => offset - 1)
    else setWeekNavOffset((offset) => offset - 1)
  }
  function goNext() {
    if (view === "month") setMonthNavOffset((offset) => offset + 1)
    else setWeekNavOffset((offset) => offset + 1)
  }

  const headerLabel =
    view === "month" ? formatMonthHeaderLabel(monthRange.start) : formatWeekGroupMonthLabel(monthOfWeek(weekRangeStart))

  const selectedWeekProject = selectedWeekDetail
    ? visibleProjects.find((project) => project.id === selectedWeekDetail.projectId)
    : undefined
  const selectedWeekItems = selectedWeekDetail
    ? weeklyFocus.filter(
        (item) =>
          item.project_id === selectedWeekDetail.projectId &&
          item.week_start_date === selectedWeekDetail.weekStart
      )
    : []
  const selectedWeekPhase =
    selectedWeekDetail && selectedWeekProject
      ? monthlyTargets.find(
          (target) =>
            target.project_id === selectedWeekProject.id &&
            target.month === monthOfWeek(selectedWeekDetail.weekStart)
        )?.phase
      : undefined

  const hasAnyProjects = projects.length > 0
  const hasResults = visibleProjects.length > 0
  const hasFiltersApplied =
    squadFilter !== "all" ||
    departmentFilter !== "all" ||
    epicFilter !== "all" ||
    designerFilter !== "all" ||
    priorityFilter !== "all" ||
    statusFilter !== "all" ||
    healthFilter !== "all" ||
    showArchived

  const rowHeight = view === "month" ? MONTH_RANGE_TRACK_ROW_HEIGHT_PX : WEEK_GRID_TRACK_ROW_HEIGHT_PX
  const headerHeight = view === "month" ? MONTH_RANGE_TRACK_HEADER_HEIGHT_PX : WEEK_GRID_TRACK_HEADER_HEIGHT_PX

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="Every project across the months (or weeks) it runs. Solid bars are committed, dashed bars are tentative."
      />

      <ContentSection bodyClassName="space-y-4">
        {!hasAnyProjects ? (
          <EmptyState
            icon={CalendarRange}
            title="No projects yet"
            description="Create your first project to see it on the timeline."
            action={
              <Button render={<Link href="/projects/new" />} nativeButton={false}>
                <Plus />
                Add Project
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={goToday}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous"
                  onClick={goPrevious}
                >
                  <ChevronLeft />
                </Button>
                <span className="min-w-24 text-center text-sm font-medium text-foreground">
                  {headerLabel}
                </span>
                <Button variant="outline" size="icon-sm" aria-label="Next" onClick={goNext}>
                  <ChevronRight />
                </Button>
              </div>

              <div className="inline-flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={view === "month" ? "default" : "ghost"}
                  onClick={() => setView("month")}
                  aria-pressed={view === "month"}
                >
                  Month
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={view === "week" ? "default" : "ghost"}
                  onClick={() => setView("week")}
                  aria-pressed={view === "week"}
                >
                  Week
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={squadFilter} onValueChange={(value) => setSquadFilter(value ?? "all")}>
                <SelectTrigger className="w-40" aria-label="Filter by owner squad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All squads</SelectItem>
                  {squadOptions.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value ?? "all")}
              >
                <SelectTrigger className="w-32" aria-label="Filter by priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
                <SelectTrigger className="w-36" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={departmentFilter}
                onValueChange={(value) => setDepartmentFilter(value ?? "all")}
              >
                <SelectTrigger className="w-44" aria-label="Filter by department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={epicFilter} onValueChange={(value) => setEpicFilter(value ?? "all")}>
                <SelectTrigger className="w-40" aria-label="Filter by epic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All epics</SelectItem>
                  {epicOptions.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      {epic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={healthFilter} onValueChange={(value) => setHealthFilter(value ?? "all")}>
                <SelectTrigger className="w-32" aria-label="Filter by health">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All health</SelectItem>
                  {PROJECT_HEALTHS.map((health) => (
                    <SelectItem key={health} value={health}>
                      {health}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={designerFilter}
                onValueChange={(value) => setDesignerFilter(value ?? "all")}
              >
                <SelectTrigger className="w-40" aria-label="Filter by designer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All designers</SelectItem>
                  {designerOptions.map((designer) => (
                    <SelectItem key={designer.id} value={designer.id}>
                      {designer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label className="pl-1">
                <Switch checked={showArchived} onCheckedChange={setShowArchived} />
                Show archived
              </Label>

              {hasFiltersApplied ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-solid border-foreground/60" />
                Committed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed border-muted-foreground/60" />
                Tentative
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-accent" />
                {view === "month" ? "Current month" : "Current week"}
              </span>
            </div>

            {!hasResults ? (
              <EmptyState
                icon={SearchX}
                title="No projects match these filters"
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="flex overflow-hidden rounded-md border border-border">
                {/* Sticky project-info column — stays in place while the
                    grid on the right scrolls horizontally, simply by living
                    outside that scroll container (no CSS `sticky` needed).
                    Row/header heights mirror whichever track is active so
                    the two line up without measuring. Shared between Month
                    and Week View, per PRD §14.2 ("keep the same sticky
                    Project information column as Month View"). */}
                <div className="w-56 shrink-0 divide-y divide-border/60 border-r border-border">
                  <div className="border-b border-border" style={{ height: headerHeight }} />
                  {visibleProjects.map((project) => {
                    const squad = squadsById.get(project.owner_squad_id)
                    const lead = getProjectLead(project.id)
                    return (
                      <div
                        key={project.id}
                        className="flex flex-col justify-center gap-0.5 px-3"
                        style={{ height: rowHeight }}
                      >
                        <Link
                          href={`/projects/${project.id}`}
                          className="truncate text-sm font-medium text-foreground hover:underline"
                          title={project.name}
                        >
                          {project.name}
                        </Link>
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={project.priority} className="text-[10px]" />
                          <span className="truncate text-xs text-muted-foreground">
                            {squad?.name ?? "–"} · {lead?.name ?? "Unassigned"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="overflow-x-auto">
                  {view === "month" ? (
                    <MonthRangeTrack rows={monthRows} monthRange={monthRange} />
                  ) : (
                    <WeekGridTrack rows={weekRows} weeks={weeks} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </ContentSection>

      <Dialog
        open={selectedWeekDetail !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedWeekDetail(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedWeekDetail ? `Week of ${formatWeekRangeLabel(selectedWeekDetail.weekStart)}` : ""}
            </DialogTitle>
            <DialogDescription>{selectedWeekProject?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedWeekPhase ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Phase</p>
                <p className="text-sm text-foreground">{selectedWeekPhase}</p>
              </div>
            ) : null}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Weekly Focus</p>
              {selectedWeekItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No weekly focus recorded for this week.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedWeekItems.map((item) => (
                    <li key={item.id} className="text-sm text-foreground">
                      <span>• {item.title}</span>
                      {item.description ? (
                        <p className="pl-3 text-xs text-muted-foreground">{item.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
