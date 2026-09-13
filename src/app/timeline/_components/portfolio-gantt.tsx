"use client"

// The Timeline's Gantt (PRD §14.2, §30). Adapts this app's domain onto the
// vendored headless gantt in src/components/reui/gantt/ — which knows nothing
// about projects, only tree nodes ("resources") and scheduled bars ("events").
//
// Shape of the mapping:
// - one resource per visible project, flat (no grouping tree)
// - one project bar per project, from its inclusive start_date/end_date
// - Weekly Focus rows become their own Monday->Monday bars on the SAME row,
//   which the gantt stacks into a second lane. Built only below the `year`
//   scale, where a one-week bar is still wide enough to read — the portfolio
//   view stays one clean bar per project.
//
// That per-row lane stack IS the operational scale's row architecture: Week
// already reads project bar + granular work underneath it, and anything finer
// the domain grows later (§8.9 keeps Weekly Focus deliberately note-shaped)
// lands as another lane on the same row, not as a different page.
//
// Bars are read as: commitment = fill + border (solid Committed / lighter
// dashed Tentative), health = a small dot on the exceptions only. Health no
// longer colours the whole bar: a portfolio of green bars said nothing, while
// the two states worth reacting to now stand out (docs/CHANGELOG.md).
//
// This component also owns the whole timeline toolbar, because Today /
// prev-next / the scale control / zoom all read gantt context and so must
// render inside <Gantt>. The page's own search + filter controls are passed
// in as `toolbarStart` so the two halves share one toolbar row.
//
// The toolbar carries only what planning needs constantly: search, filter,
// move through time, switch scale. The canvas utilities — Fit, zoom, Legend —
// sit in a floating dock in the corner of the chart instead. They act on the
// canvas, they are reached occasionally, and queueing them alongside the
// controls above made four things of equal weight out of two (PRD §14.2).

import { useMemo, useRef, useState, type ReactNode } from "react"
import { Minus, Plus } from "lucide-react"

import { Gantt, type GanttApi } from "@/components/reui/gantt/gantt"
import { GanttView } from "@/components/reui/gantt/gantt-view"
import {
  GanttNavNext,
  GanttNavPrev,
  GanttNavToday,
  GanttTitle,
  GanttToolbar,
} from "@/components/reui/gantt/gantt-nav"
import type {
  GanttDateRange,
  GanttEvent,
  GanttProposedUpdate,
  GanttResource,
  GanttScale,
} from "@/components/reui/gantt/gantt-types"

import { HealthBadge, healthSolidClassName } from "@/components/shared/health-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { Project, ProjectWeeklyFocus, Squad } from "@/lib/domain/types"
import { formatDate, fromExclusiveEnd, parseDate, toExclusiveEnd } from "@/lib/domain/dateUtils"
import { addWeeks, formatWeekRangeLabel, weekStartOf } from "@/lib/domain/weekUtils"
import { cn } from "@/lib/utils"

/** Which domain row a bar stands for. Bar ids are namespaced to match. */
type TimelineEventData =
  | { kind: "project"; project: Project }
  | { kind: "focus"; focus: ProjectWeeklyFocus }

/**
 * The scales Timeline offers, in segmented-control order. The vendored gantt
 * also implements `day`, which this product does not surface: a design
 * project is scheduled in weeks and months, and an hour axis under a
 * four-month bar answers no planning question (docs/DECISIONS.md).
 */
const TIMELINE_SCALES = ["week", "month", "quarter", "year"] as const
type TimelineScale = (typeof TIMELINE_SCALES)[number]

const SCALE_LABELS: Record<TimelineScale, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
}

/**
 * The nav readout reserves a width rather than being clamped to one: enough
 * that paging does not shuffle the arrows either side of it ("Sep 2026" and
 * "May 2026" are not the same width), but a floor, not a ceiling, so a label
 * that runs long pushes the box wider instead of being cut to "September 20…".
 * The period is primary information; it is never truncated.
 *
 * Week gets its own floor because its range labels are roughly half again as
 * wide as any other scale's, and 176px of empty box either side of `2026`
 * would be a gap, not a layout. Month / Quarter / Year share one floor so
 * switching between them moves nothing.
 */
function titleMinWidth(scale: TimelineScale): string {
  return scale === "week" ? "min-w-44" : "min-w-28"
}

/** Matches the vendored default; mirrored here so the toolbar can disable at the limits. */
const ZOOM = { min: 0.5, max: 3, step: 0.25 }

// Row geometry (PRD §14.2): a 28px bar inside a 56px row, which is what makes
// a two-line project name and its metadata line legible in the column beside
// it. `rowPadding` is what keeps the label band at a constant 56px even on the
// taller rows a Weekly Focus lane creates, so the name never spills a row.
const GANTT_METRICS = {
  laneHeight: 1.75,
  laneGap: 0.25,
  rowPadding: 0.875,
  minRowHeight: 3.5,
  ghostHeight: 1.75,
}

// GanttView is `flex-1 min-h-0`, so it collapses unless its container has a
// height — and the chart is the workspace, so it takes what the page can give
// it rather than shrinking to its rows: a six-project portfolio should not
// leave two thirds of the screen blank under a stub of a chart, and a
// sixty-project one scrolls inside the canvas instead of growing the page.
/**
 * Everything above and below the chart in the page: the app header and its
 * shell padding, the page's own padding, the PageHeader block, and the gap
 * under it. Kept as one number so the chart can claim the rest of the
 * viewport without the page itself becoming a flex-height chain.
 */
const PAGE_CHROME_PX = 192
const GANTT_MIN_HEIGHT_PX = 360

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * The nav title, named the way the selected view is navigated: a week reads
 * as its days, a month as its month, a quarter as Q3, a year as the year
 * (PRD §14.2). Replaces the vendored default, whose week label ("September 7
 * - 13, 2026") is wider than the toolbar slot it has to sit in.
 */
function formatTimelineTitle(
  scale: GanttScale,
  { date, activeRange }: { date: Date; activeRange: GanttDateRange }
): string {
  // Short month, like the week label below it: "September 2026" is the one
  // readout wide enough to need a box no other scale comes close to filling,
  // and a deliberate "Sep 2026" reads better than an ellipsised long one.
  if (scale === "month") return `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
  if (scale === "quarter") return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
  if (scale === "year") return String(date.getFullYear())

  // week (and the unused day scale): the active range's own span. `end` is
  // exclusive, so the last day it covers is one millisecond before it.
  const start = activeRange.start
  const last = new Date(activeRange.end.getTime() - 1)
  if (start.getFullYear() === last.getFullYear()) {
    if (start.getMonth() === last.getMonth()) {
      return `${start.getDate()} – ${last.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`
    }
    return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`
  }
  return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`
}

/** "2026-09-12" -> "12 Sep 2026", for the bar tooltip. */
function formatDayLabel(date: string): string {
  const parsed = parseDate(date)
  return `${parsed.getDate()} ${MONTHS_SHORT[parsed.getMonth()]} ${parsed.getFullYear()}`
}

/** Whole days between two inclusive "YYYY-MM-DD" dates. */
function inclusiveDays(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / MS_PER_DAY) + 1
}

/** Reads how a planner says it: days up to a fortnight, whole weeks past it. */
function formatDuration(start: string, end: string): string {
  const days = inclusiveDays(start, end)
  if (days < 14) return days === 1 ? "1 day" : `${days} days`
  const weeks = Math.round(days / 7)
  return weeks === 1 ? "1 week" : `${weeks} weeks`
}

/** A terminal project's end_date is a historical record written by Mark as complete — a stray drag must not rewrite it. */
function isLocked(project: Project): boolean {
  return project.status === "Completed" || project.status === "Cancelled"
}

interface PortfolioGanttProps {
  projects: Project[]
  weeklyFocus: ProjectWeeklyFocus[]
  squadsById: Map<string, Squad>
  leadNameByProjectId: Map<string, string>
  /** Commit a dragged/resized project bar. Both dates inclusive. */
  onProjectReschedule: (projectId: string, startDate: string, endDate: string) => void
  /** Commit a dragged Weekly Focus bar; `weekStartDate` is already snapped to a Monday. */
  onFocusReschedule: (focusId: string, weekStartDate: string) => void
  onProjectOpen: (projectId: string) => void
  onFocusOpen: (projectId: string, weekStart: string) => void
  /** The scale to open on — the account's saved "default timeline view" (docs/PRD.MD §14.10). Initial only: switching scale here wins for the rest of the visit. */
  defaultScale: TimelineScale
  /** IANA zone the chart reads days and "today" in — the account's timezone preference. */
  timeZone: string
  /** The page's search + filter controls, rendered at the start of the toolbar. */
  toolbarStart?: ReactNode
  /** Shown in the timeline body when filtering leaves no projects to draw. */
  emptyState?: ReactNode
}

function PortfolioGantt({
  projects,
  weeklyFocus,
  squadsById,
  leadNameByProjectId,
  onProjectReschedule,
  onFocusReschedule,
  onProjectOpen,
  onFocusOpen,
  defaultScale,
  timeZone,
  toolbarStart,
  emptyState,
}: PortfolioGanttProps) {
  // Controlled so the event list can depend on it: Weekly Focus bars are only
  // worth rendering once a week is wide enough to see.
  //
  // Seeded from the preference and then owned by this component, which is the
  // priority the product wants: an explicit choice made during this visit beats
  // the saved default, and the saved default beats the app's (docs/PRD.MD §14.10).
  const [scale, setScale] = useState<TimelineScale>(defaultScale)
  // Controlled so zoom can live in the toolbar next to the scale control
  // rather than floating over the chart; Ctrl/Cmd + wheel writes here too.
  const [zoom, setZoom] = useState(1)
  const apiRef = useRef<GanttApi<TimelineEventData> | null>(null)

  const showFocusBars = scale !== "year"

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )

  const resources: GanttResource[] = useMemo(
    () => projects.map((project) => ({ id: project.id, title: project.name })),
    [projects]
  )

  const events: GanttEvent<TimelineEventData>[] = useMemo(() => {
    const projectBars = projects.map<GanttEvent<TimelineEventData>>((project) => ({
      id: project.id,
      resourceId: project.id,
      title: project.name,
      start: parseDate(project.start_date),
      end: toExclusiveEnd(project.end_date),
      allDay: true,
      // One hue for every project bar: the bar answers "when", not "how is
      // it going" (PRD §14.2). Health rides along as a dot, below.
      color: "var(--primary)",
      readOnly: isLocked(project),
      // Keeps the project bar in lane 0 when a Weekly Focus bar shares the row.
      priority: 2,
      data: { kind: "project", project },
    }))

    if (!showFocusBars) return projectBars

    const focusBars = weeklyFocus
      .filter((focus) => projectsById.has(focus.project_id))
      .map<GanttEvent<TimelineEventData>>((focus) => ({
        id: `focus:${focus.id}`,
        resourceId: focus.project_id,
        title: focus.title,
        start: parseDate(focus.week_start_date),
        end: parseDate(addWeeks(focus.week_start_date, 1)),
        allDay: true,
        // Transparent so the bar contributes no fill of its own: the whole
        // treatment is the faint wash renderEvent paints, because a focus
        // band is context under the project bar, not a third commitment
        // state to memorize (PRD §14.2).
        color: "transparent",
        // Weekly Focus has no end field of its own — a week is a week.
        resizable: false,
        priority: 1,
        data: { kind: "focus", focus },
      }))

    return [...projectBars, ...focusBars]
  }, [projects, projectsById, weeklyFocus, showFocusBars])

  function handleEventUpdate(update: GanttProposedUpdate<TimelineEventData>) {
    const data = update.event.data
    if (!data) return
    if (data.kind === "focus") {
      // Snap to the week's Monday rather than trusting where the pointer
      // landed — week_start_date is always a Monday (PRD §8.9).
      onFocusReschedule(data.focus.id, weekStartOf(formatDate(update.start)))
      return
    }
    const start = formatDate(update.start)
    const end = fromExclusiveEnd(update.end)
    if (end < start) return
    onProjectReschedule(data.project.id, start, end)
  }

  /**
   * Fit: put the projects currently on screen into one readable frame —
   * the coarsest scale their whole span still needs, at natural zoom,
   * centred on the middle of that span. Useful after a filter change or a
   * long scroll, which is when "where did everything go" happens.
   */
  function handleFit() {
    if (projects.length === 0) return
    let earliest = projects[0].start_date
    let latest = projects[0].end_date
    for (const project of projects) {
      if (project.start_date < earliest) earliest = project.start_date
      if (project.end_date > latest) latest = project.end_date
    }
    const days = inclusiveDays(earliest, latest)
    setScale(days <= 7 ? "week" : days <= 31 ? "month" : days <= 92 ? "quarter" : "year")
    setZoom(1)
    apiRef.current?.goTo(
      new Date((parseDate(earliest).getTime() + parseDate(latest).getTime()) / 2)
    )
  }

  return (
    <Gantt
      // The gantt IS the surface: one card, toolbar in its head, chart in its
      // body — no section card wrapped around a second bordered chart
      // (PRD §14.2, "the timeline must stay the dominant element").
      className="min-h-0 overflow-hidden rounded-lg border border-border bg-card shadow-xs"
      style={{ height: `max(${GANTT_MIN_HEIGHT_PX}px, calc(100svh - ${PAGE_CHROME_PX}px))` }}
      apiRef={apiRef}
      i18n={{
        labels: { resources: "Project" },
        functions: { formatTitle: formatTimelineTitle },
      }}
      scale={scale}
      onScaleChange={(next) => setScale(next as TimelineScale)}
      zoom={zoom}
      onZoomChange={setZoom}
      zoomRange={ZOOM}
      // The vendored corner control is zoom-only; this app docks zoom with
      // Fit and the Legend instead, so it renders its own (TimelineUtilityDock).
      zoomControl={false}
      resources={resources}
      events={events}
      onEventUpdate={handleEventUpdate}
      canDropEvent={(update) => update.end.getTime() > update.start.getTime()}
      onEventClick={(occurrence) => {
        const data = occurrence.event.data
        if (!data) return
        if (data.kind === "project") onProjectOpen(data.project.id)
        else onFocusOpen(data.focus.project_id, data.focus.week_start_date)
      }}
      // Drags land on whole days; nothing in this domain is finer than that.
      snapDuration={24 * 60}
      // Where a day starts and where Today sits. Defaults to the browser's zone
      // in the vendored gantt; this makes it the user's stated one instead, so a
      // team spread across WIB/WITA reads the same chart (docs/PRD.MD §14.10).
      timeZone={timeZone}
      // Monday, always — NOT the "week starts on" preference. Weekly Focus rows
      // are constrained to Mondays in the database (supabase/schema.sql), so
      // Sunday-start columns would cut every focus band across two of them
      // (docs/DECISIONS.md).
      weekStartsOn={1}
      scheduleMode="multiple"
      metrics={GANTT_METRICS}
      // A flat wash for weekends instead of the vendored diagonal hatch: at
      // the scales where whole days are visible, the columns are wide enough
      // that the texture reads as noise (PRD §14.2 "keep both subtle").
      offDays={{ className: "bg-muted/40" }}
      // Portfolio concerns the PRD keeps out of scope (§30, §38).
      dependencyLines={false}
      baselineBars={false}
      summaryBars={false}
      dragCreate={false}
      displayCreateTaskHint={false}
      displayScheduleHint={false}
      rowCheckboxes={false}
      // Quiet grid: period boundaries only, no row rules (PRD §30,
      // "readability over complex Gantt functionality").
      timelineLines={{ vertical: "solid", horizontal: false }}
      treePanel={{ width: 320, minWidth: 220, maxWidth: 480, nameColumnWidth: 320 }}
      renderResourceLabel={({ resource }) => {
        const project = projectsById.get(resource.id)
        if (!project) return resource.title
        const squad = squadsById.get(project.owner_squad_id)
        return (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            {/* Two lines before anything is cut: a project is identified by
                its name, and "Trade Finance Platform Rev…" identifies
                nothing. The title attribute covers the rare third line. */}
            <span
              title={project.name}
              className="line-clamp-2 text-sm leading-tight font-medium text-foreground"
            >
              {project.name}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <PriorityBadge priority={project.priority} className="text-[10px]" />
              <span className="truncate text-xs text-muted-foreground">
                {squad?.name ?? "–"} · {leadNameByProjectId.get(project.id) ?? "Unassigned"}
              </span>
            </span>
          </span>
        )
      }}
      renderEvent={({ occurrence }) => {
        const data = occurrence.event.data
        if (data?.kind === "focus") {
          return (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-muted-foreground/10 transition-colors duration-(--duration-quick) group-hover/gantt-bar-group:bg-muted-foreground/20"
              />
              <span className="relative truncate text-muted-foreground">
                {occurrence.event.title}
              </span>
            </>
          )
        }
        const project = data?.project
        const committed = project?.timeline_confidence !== "Tentative"
        // Exceptions only: a dot on every On Track bar would be a field of
        // green making the two states worth acting on harder to find (§31).
        const exception = project && project.health !== "On Track" ? project.health : null
        return (
          <>
            {/* Commitment is the bar's own treatment — solid fill + solid
                border vs. a light fill behind a dashed one — so it reads
                without the legend (PRD §12, §31). */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit] border transition-colors duration-(--duration-quick)",
                committed
                  ? "border-(--gantt-event-color) bg-(--gantt-event-color)/90 group-hover/gantt-bar-group:bg-(--gantt-event-color)"
                  : "border-dashed border-(--gantt-event-color)/60 group-hover/gantt-bar-group:border-(--gantt-event-color)"
              )}
            />
            {exception ? (
              <span
                aria-hidden
                className={cn(
                  "relative size-1.5 shrink-0 rounded-full ring-1 ring-background/60",
                  healthSolidClassName(exception)
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative truncate",
                committed ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {occurrence.event.title}
            </span>
          </>
        )
      }}
      renderEventTooltip={({ occurrence }) => {
        const data = occurrence.event.data
        if (data?.kind === "focus") {
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{data.focus.title}</div>
              <div className="opacity-80">
                Weekly focus · {formatWeekRangeLabel(data.focus.week_start_date)}
              </div>
            </div>
          )
        }
        if (data?.kind !== "project") return occurrence.event.title
        const project = data.project
        return (
          <div className="space-y-0.5">
            <div className="font-medium">{project.name}</div>
            <div className="opacity-80">
              {formatDayLabel(project.start_date)} – {formatDayLabel(project.end_date)}
            </div>
            <div className="opacity-80">
              {formatDuration(project.start_date, project.end_date)} ·{" "}
              {project.timeline_confidence} · {project.health}
            </div>
          </div>
        )
      }}
    >
      <GanttToolbar className="flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">{toolbarStart}</div>

        <TooltipProvider delay={400} closeDelay={0} timeout={300}>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {/* One navigation cluster, not three controls spread over the
                toolbar: Today sits with the stepper it acts on, and the
                readout is only as wide as the current scale needs, so the
                arrows stay beside the period instead of arm's length from it. */}
            <div className="flex items-center gap-2">
              <GanttNavToday />
              <div className="flex items-center gap-1">
                <GanttNavPrev />
                {/* overflow-visible + text-clip cancel GanttTitle's own
                    `truncate` — this readout grows, it never ellipsises. */}
                <GanttTitle
                  className={cn(
                    "overflow-visible text-clip whitespace-nowrap px-1 text-center text-sm font-medium tabular-nums text-foreground",
                    titleMinWidth(scale)
                  )}
                />
                <GanttNavNext />
              </div>
            </div>

            <Tabs
              value={scale}
              onValueChange={(next) => setScale(next as TimelineScale)}
              className="gap-0"
            >
              <TabsList className="group-data-horizontal/tabs:h-8">
                {TIMELINE_SCALES.map((value) => (
                  <TabsTrigger key={value} value={value} className="px-2.5">
                    {SCALE_LABELS[value]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </TooltipProvider>
      </GanttToolbar>

      {/* The gantt's own no-rows slot centres itself in the scroll TRACK, not
          the visible pane, so it lands half-hidden behind the sticky project
          column. An empty axis explains nothing anyway — the toolbar above
          stays put, which is what matters: the filters that emptied the view
          are right there to undo. */}
      {emptyState ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">{emptyState}</div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <GanttView />
          <TimelineUtilityDock
            zoom={zoom}
            onZoomChange={setZoom}
            onFit={handleFit}
          />
        </div>
      )}
    </Gantt>
  )
}

/**
 * The canvas utilities, docked in the corner of the chart they act on rather
 * than queued beside the toolbar's primary controls (PRD §14.2). Nothing here
 * is needed to read the timeline, so it stays a quiet ghost strip and sits
 * clear of the bottom scrollbar.
 */
function TimelineUtilityDock({
  zoom,
  onZoomChange,
  onFit,
}: {
  zoom: number
  onZoomChange: (updater: (value: number) => number) => void
  onFit: () => void
}) {
  return (
    <TooltipProvider delay={400} closeDelay={0} timeout={300}>
      <div
        data-slot="timeline-utility-dock"
        /* z-40 + last in DOM order: above the canvas layers, below the
           loading overlay, which should cover it */
        className="absolute end-4 bottom-5 z-40 flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-sm"
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={onFit}
              />
            }
          >
            Fit
          </TooltipTrigger>
          <TooltipContent side="top">Fit these projects in view</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-0.5 h-4" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Zoom out"
                disabled={zoom <= ZOOM.min}
                onClick={() => onZoomChange((value) => Math.max(ZOOM.min, value - ZOOM.step))}
              />
            }
          >
            <Minus />
          </TooltipTrigger>
          <TooltipContent side="top">Zoom out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Zoom in"
                disabled={zoom >= ZOOM.max}
                onClick={() => onZoomChange((value) => Math.min(ZOOM.max, value + ZOOM.step))}
              />
            }
          >
            <Plus />
          </TooltipTrigger>
          <TooltipContent side="top">Zoom in</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-0.5 h-4" />

        <TimelineLegend />
      </div>
    </TooltipProvider>
  )
}

/**
 * The legend, one click away instead of permanently parked above the chart:
 * commitment already reads from the bars themselves, so this only has to
 * cover what a first-time reader can't infer (PRD §14.2).
 */
function TimelineLegend() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        Legend
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 space-y-3 p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Schedule</p>
          <ul className="space-y-2 text-xs text-foreground">
            <li className="flex items-center gap-2">
              <span className="h-3 w-7 shrink-0 rounded-sm border border-primary bg-primary/90" />
              Committed
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-7 shrink-0 rounded-sm border border-dashed border-primary/60 bg-primary/20" />
              Tentative
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-7 shrink-0 rounded-sm bg-muted-foreground/15" />
              Weekly focus
            </li>
          </ul>
        </div>
        <Separator />
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Health</p>
          <ul className="space-y-1.5">
            <li>
              <HealthBadge health="At Risk" />
            </li>
            <li>
              <HealthBadge health="Blocked" />
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            On Track projects carry no marker — only the exceptions are flagged on their bar.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { PortfolioGantt }
