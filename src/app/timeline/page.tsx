"use client"

// Timeline — the primary portfolio visualization (PRD §14.2, §29-32).
//
// One gantt across four scales (week / month / quarter / year), picked from a
// segmented control: `year` is the portfolio view, `quarter` has week columns,
// and week/month are the operational scales where Weekly Focus appears.
// Project bars can be dragged and resized to reschedule, which writes straight
// back to the project's dates (PRD §30).
//
// This page owns filtering, the repository reads/writes, and the Weekly Focus
// dialog; the chart, its toolbar and every pixel of the canvas live in
// ./_components/portfolio-gantt.tsx. The search + filter controls are passed
// into that toolbar so the page reads as one workspace, not a control panel
// stacked on top of a chart.
//
// Completed and Cancelled projects are excluded by default (docs/DECISIONS.md,
// PRD §14.2): either is reachable by explicitly picking it in the Status
// filter, Archived by "Include archived projects". Their bars are read-only
// even when shown — end_date on a completed project is a historical record.

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CalendarRange, Plus, SearchX } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { PortfolioGantt } from "./_components/portfolio-gantt"
import {
  TimelineFilterBar,
  DEFAULT_TIMELINE_FILTERS,
  type TimelineFilters,
} from "./_components/timeline-filter-bar"

import { useUserPreferences } from "@/lib/identity/current-user"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as projectMonthlyTargetRepository from "@/lib/repositories/projectMonthlyTargetRepository"
import * as projectWeeklyFocusRepository from "@/lib/repositories/projectWeeklyFocusRepository"
import { getProjectAssignments, getProjectLead, isTerminalStatus } from "@/lib/selectors/projectSelectors"
import { PRIORITIES } from "@/lib/domain/enums"
import { formatWeekRangeLabel, monthOfWeek } from "@/lib/domain/weekUtils"

// Same "all" | <value> plain-state filter convention as /projects — no URL
// query-param sync here. /projects now reads two params once on mount for a
// one-way drill-down entry point (Overview's stat/health links); mirror
// `initialFiltersFromSearchParams` there if Timeline ever needs the same.
// The filter shape itself lives with the toolbar, in
// ./_components/timeline-filter-bar.

export default function TimelinePage() {
  const [projects, refreshProjects] = useRepositoryList(projectRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [departments] = useRepositoryList(departmentRepository)
  const [epics] = useRepositoryList(epicRepository)
  const [designers] = useRepositoryList(designerRepository)
  const [monthlyTargets] = useRepositoryList(projectMonthlyTargetRepository)
  const [weeklyFocus, refreshWeeklyFocus] = useRepositoryList(projectWeeklyFocusRepository)

  const router = useRouter()
  const { defaultTimelineView, timezone } = useUserPreferences()

  const [selectedWeekDetail, setSelectedWeekDetail] = useState<{
    projectId: string
    weekStart: string
  } | null>(null)

  const [filters, setFilters] = useState<TimelineFilters>(DEFAULT_TIMELINE_FILTERS)
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  const squadsById = useMemo(() => new Map(squads.map((s) => [s.id, s])), [squads])
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  )
  const epicsById = useMemo(() => new Map(epics.map((epic) => [epic.id, epic])), [epics])
  const designersById = useMemo(
    () => new Map(designers.map((designer) => [designer.id, designer])),
    [designers]
  )

  const squadOptions = useMemo(
    () =>
      [...squads]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((squad) => ({ value: squad.id, label: squad.name })),
    [squads]
  )
  const departmentOptions = useMemo(
    () =>
      [...departments]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((department) => ({ value: department.id, label: department.name })),
    [departments]
  )
  const epicOptions = useMemo(
    () =>
      [...epics]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((epic) => ({ value: epic.id, label: epic.name })),
    [epics]
  )
  const designerOptions = useMemo(
    () =>
      designers
        .filter((designer) => designer.status === "Active")
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((designer) => ({ value: designer.id, label: designer.name })),
    [designers]
  )

  const visibleProjects = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim().toLowerCase()

    const filtered = projects.filter((project) => {
      if (!filters.showArchived && project.is_archived) return false
      const statusMatches =
        filters.status === "all" ? !isTerminalStatus(project.status) : project.status === filters.status
      if (!statusMatches) return false
      if (filters.priority !== "all" && project.priority !== filters.priority) return false
      if (filters.health !== "all" && project.health !== filters.health) return false
      if (filters.squad !== "all" && project.owner_squad_id !== filters.squad) return false
      if (filters.department !== "all" && project.department_id !== filters.department) return false
      if (filters.epic !== "all" && project.epic_id !== filters.epic) return false

      // Read once per project and shared with the search below — every
      // getProjectAssignments call re-reads the assignments table.
      const assignedDesignerIds =
        filters.designer !== "all" || trimmedQuery
          ? getProjectAssignments(project.id).map((assignment) => assignment.designer_id)
          : []
      if (filters.designer !== "all" && !assignedDesignerIds.includes(filters.designer)) {
        return false
      }

      // Quick lookup, not a second filter surface (PRD §29.1): the fields a
      // Design Lead would type — the project, the people on it, and the two
      // groupings its rows are labelled with.
      if (trimmedQuery) {
        const epic = epicsById.get(project.epic_id)
        const department = departmentsById.get(project.department_id)
        const squad = squadsById.get(project.owner_squad_id)
        const matchesSearch =
          project.name.toLowerCase().includes(trimmedQuery) ||
          Boolean(epic?.name.toLowerCase().includes(trimmedQuery)) ||
          Boolean(department?.name.toLowerCase().includes(trimmedQuery)) ||
          Boolean(squad?.name.toLowerCase().includes(trimmedQuery)) ||
          assignedDesignerIds.some((id) =>
            designersById.get(id)?.name.toLowerCase().includes(trimmedQuery)
          )
        if (!matchesSearch) return false
      }

      return true
    })

    return [...filtered].sort((a, b) => {
      const priorityDiff = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
      return priorityDiff !== 0 ? priorityDiff : a.start_date.localeCompare(b.start_date)
    })
  }, [projects, filters, debouncedSearch, epicsById, departmentsById, squadsById, designersById])

  // getProjectLead reads the assignments table on every call, so it's resolved
  // once per visible project here rather than per render inside the chart.
  const leadNameByProjectId = useMemo(() => {
    const map = new Map<string, string>()
    for (const project of visibleProjects) {
      const lead = getProjectLead(project.id)
      if (lead) map.set(project.id, lead.name)
    }
    return map
  }, [visibleProjects])

  function patchFilters(patch: Partial<TimelineFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  function clearFilters() {
    setFilters(DEFAULT_TIMELINE_FILTERS)
  }

  // The write updates the shared cache in this same tick, so the dragged bar
  // keeps its new position on the next render rather than snapping back
  // (see dataStore).
  function handleProjectReschedule(projectId: string, startDate: string, endDate: string) {
    const updated = projectRepository.update(projectId, {
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    if (updated) toast.success(`${updated.name} rescheduled`)
    refreshProjects()
  }

  function handleFocusReschedule(focusId: string, weekStartDate: string) {
    const updated = projectWeeklyFocusRepository.update(focusId, {
      week_start_date: weekStartDate,
    })
    if (updated) toast.success(`"${updated.title}" moved to ${formatWeekRangeLabel(weekStartDate)}`)
    refreshWeeklyFocus()
  }

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
    filters.search.trim() !== "" ||
    filters.squad !== "all" ||
    filters.department !== "all" ||
    filters.epic !== "all" ||
    filters.designer !== "all" ||
    filters.priority !== "all" ||
    filters.status !== "all" ||
    filters.health !== "all" ||
    filters.showArchived

  return (
    <div className="space-y-4">
      <PageHeader
        title="Timeline"
        description="Project schedules, commitments, and delivery risk. Drag or resize a bar to reschedule it."
      />

      {!hasAnyProjects ? (
        <ContentSection>
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
        </ContentSection>
      ) : (
        <PortfolioGantt
          projects={visibleProjects}
          weeklyFocus={weeklyFocus}
          squadsById={squadsById}
          leadNameByProjectId={leadNameByProjectId}
          onProjectReschedule={handleProjectReschedule}
          onFocusReschedule={handleFocusReschedule}
          defaultScale={defaultTimelineView}
          timeZone={timezone}
          onProjectOpen={(projectId) => router.push(`/projects/${projectId}`)}
          onFocusOpen={(projectId, weekStart) => setSelectedWeekDetail({ projectId, weekStart })}
          toolbarStart={
            <TimelineFilterBar
              filters={filters}
              onFiltersChange={patchFilters}
              onClearAll={clearFilters}
              hasFiltersApplied={hasFiltersApplied}
              squadOptions={squadOptions}
              departmentOptions={departmentOptions}
              epicOptions={epicOptions}
              designerOptions={designerOptions}
            />
          }
          // Rendered inside the chart body rather than instead of the chart,
          // so the filters that emptied it stay right there to be undone.
          emptyState={
            hasResults ? undefined : (
              <EmptyState
                icon={SearchX}
                title="No projects match these filters"
                description="Try a different search, or clear the filters to see the whole portfolio again."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            )
          }
        />
      )}

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
