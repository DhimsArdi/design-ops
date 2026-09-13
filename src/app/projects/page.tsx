"use client"

// Projects — project directory / source of truth (PRD §14.3). Search,
// filter, and sort every project; drill into a project via its name link.
// This page mutates a project only via row-level Delete (archive/edit stay
// on /projects/[id] and /projects/[id]/edit) — so it just reads fresh data
// from the repositories on every mount (see use-repository-list).
//
// Active/Completed/All tabs (docs/PRD.MD §14.3) are the default lifecycle
// scope — Active = {Planning, In Progress, On Hold}, a deliberately broader
// definition than Overview's "Active Projects" KPI (Planning + In Progress
// only, docs/DECISIONS.md): this is the list's default view, not the
// headline metric. The granular Status filter only applies inside the All
// tab; Archived visibility is unrelated to the tab and stays the existing
// "Show archived" toggle.

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
  Trash2,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { HealthBadge } from "@/components/shared/health-badge"
import { ProjectNameLink } from "@/components/shared/project-name-link"
import { AssignLeadControl } from "@/components/shared/assign-lead-control"
import { DeleteEntityDialog } from "@/components/shared/delete-entity-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  ProjectsFilterBar,
  DEFAULT_FILTERS,
  currentDateKey,
  getProjectTimelineBucket,
  type ProjectFilters,
} from "./_components/projects-filter-bar"

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import { getProjectLead, UNASSIGNED_DESIGN_LEAD } from "@/lib/selectors/projectSelectors"
import { PRIORITIES, PROJECT_HEALTHS, PROJECT_STATUSES } from "@/lib/domain/enums"
import type { ProjectStatus } from "@/lib/domain/enums"
import type { Project } from "@/lib/domain/types"
import { monthOf } from "@/lib/domain/dateUtils"
import { cn } from "@/lib/utils"

/**
 * Seeds Status/Priority/Department-style "all" filters from a one-time read
 * of the URL query string — a drill-down entry point (e.g. Overview's
 * "Unassigned Projects" stat -> `/projects?designLead=unassigned`, a health
 * row -> `?health=At%20Risk`, or "View all" on a capped Overview list ->
 * `?status=Proposed`), not a two-way URL sync: the filter bar itself never
 * writes back to the URL.
 */
function initialFiltersFromSearchParams(searchParams: URLSearchParams): ProjectFilters {
  const designLeadParam = searchParams.get("designLead")
  const healthParam = searchParams.get("health")
  const health = PROJECT_HEALTHS.find((value) => value === healthParam)
  const statusParam = searchParams.get("status")
  const status = statusParam
    ? statusParam
        .split(",")
        .filter((value): value is ProjectStatus => (PROJECT_STATUSES as readonly string[]).includes(value))
    : DEFAULT_FILTERS.status

  return {
    ...DEFAULT_FILTERS,
    designLead: designLeadParam === UNASSIGNED_DESIGN_LEAD ? UNASSIGNED_DESIGN_LEAD : DEFAULT_FILTERS.designLead,
    health: health ?? DEFAULT_FILTERS.health,
    status,
  }
}

type ProjectsView = "active" | "completed" | "all"

const ACTIVE_TAB_STATUSES = new Set<ProjectStatus>(["Planning", "In Progress", "On Hold"])

/**
 * An explicit `?status=` drill-down (e.g. Overview's Priority Projects "View
 * all") means the caller wants exactly that status set, so the tab defaults
 * to All rather than re-narrowing it through the Active tab's own scope.
 */
function initialViewFromSearchParams(searchParams: URLSearchParams): ProjectsView {
  return searchParams.get("status") ? "all" : "active"
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/** "2026-09" -> "Sep 2026". Falls back to the raw value if it's ever malformed. */
function formatMonth(value: string): string {
  const [year, month] = value.split("-")
  const label = MONTH_LABELS[Number(month) - 1]
  return label && year ? `${label} ${year}` : value
}

/** e.g. "Sep 2026 – Dec 2026", or "Nov 2026 – Feb 2027" across a year boundary.
 *  Month granularity on purpose: this is a dense list column, and the exact
 *  days are one click away on Project Detail. */
function formatTimeline(project: Project): string {
  return `${formatMonth(monthOf(project.start_date))} – ${formatMonth(monthOf(project.end_date))}`
}

type SortKey = "priority" | "timeline"
type SortDirection = "asc" | "desc"

// useSearchParams() opts the tree into client-side rendering, so Next requires
// a Suspense boundary around it (see the default export at the bottom of this
// file). Nothing here is prerenderable anyway — every row comes from the
// browser-side repository cache — so the boundary renders no fallback.
function ProjectsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, refreshProjects] = useRepositoryList(projectRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [departments] = useRepositoryList(departmentRepository)
  const [epics] = useRepositoryList(epicRepository)
  const [designers] = useRepositoryList(designerRepository)

  // Lazy initializer: reads the URL once on mount (a drill-down link from
  // Overview), not a live two-way sync — the filter bar never writes back.
  const [filters, setFilters] = useState<ProjectFilters>(() =>
    initialFiltersFromSearchParams(searchParams)
  )
  const [view, setView] = useState<ProjectsView>(() => initialViewFromSearchParams(searchParams))
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  const [sortKey, setSortKey] = useState<SortKey>("priority")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  // ProjectAssignment rows (Lead/Support) aren't tracked by useRepositoryList
  // anywhere else on this page — bumping this after an inline Lead assignment
  // (AssignLeadControl) is what invalidates leadsByProjectId below.
  const [assignmentVersion, setAssignmentVersion] = useState(0)

  const squadsById = useMemo(() => new Map(squads.map((squad) => [squad.id, squad])), [squads])
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  )
  const epicsById = useMemo(() => new Map(epics.map((epic) => [epic.id, epic])), [epics])

  const squadOptions = useMemo(
    () => [...squads].sort((a, b) => a.name.localeCompare(b.name)).map((squad) => ({ value: squad.id, label: squad.name })),
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
    () => [...epics].sort((a, b) => a.name.localeCompare(b.name)).map((epic) => ({ value: epic.id, label: epic.name })),
    [epics]
  )
  const designerOptions = useMemo(
    () =>
      [...designers]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((designer) => ({ value: designer.id, label: designer.name })),
    [designers]
  )

  const leadsByProjectId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getProjectLead>>()
    for (const project of projects) {
      map.set(project.id, getProjectLead(project.id))
    }
    return map
    // assignmentVersion isn't read above — it's a cache-bust dependency so an
    // inline AssignLeadControl edit (which writes ProjectAssignment directly,
    // outside useRepositoryList) invalidates this memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, assignmentVersion])

  function patchFilters(patch: Partial<ProjectFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  // Switching tabs changes what "no Status filter selected" means, so any
  // leftover Status selection from the All tab is cleared rather than left
  // stale and inert.
  function changeView(next: ProjectsView) {
    setView(next)
    patchFilters({ status: [] })
  }

  const visibleProjects = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim().toLowerCase()
    const todayKey = currentDateKey()

    const filtered = projects.filter((project) => {
      if (!filters.showArchived && project.is_archived) return false

      if (view === "completed" && project.status !== "Completed") return false
      if (view === "active" && !ACTIVE_TAB_STATUSES.has(project.status)) return false
      if (view === "all" && filters.status.length > 0 && !filters.status.includes(project.status)) {
        return false
      }

      if (filters.priority.length > 0 && !filters.priority.includes(project.priority)) return false
      if (filters.health !== "all" && project.health !== filters.health) return false
      if (filters.squad !== "all" && project.owner_squad_id !== filters.squad) return false
      if (filters.department !== "all" && project.department_id !== filters.department) return false
      if (filters.epic !== "all" && project.epic_id !== filters.epic) return false
      if (filters.timeline !== "all" && getProjectTimelineBucket(project, todayKey) !== filters.timeline) {
        return false
      }

      const lead = leadsByProjectId.get(project.id)
      if (filters.designLead === UNASSIGNED_DESIGN_LEAD) {
        if (lead) return false
      } else if (filters.designLead !== "all" && lead?.id !== filters.designLead) {
        return false
      }

      if (trimmedQuery) {
        const epic = epicsById.get(project.epic_id)
        const department = departmentsById.get(project.department_id)
        const squad = squadsById.get(project.owner_squad_id)
        const matchesSearch =
          project.name.toLowerCase().includes(trimmedQuery) ||
          Boolean(epic?.name.toLowerCase().includes(trimmedQuery)) ||
          Boolean(department?.name.toLowerCase().includes(trimmedQuery)) ||
          Boolean(squad?.name.toLowerCase().includes(trimmedQuery)) ||
          Boolean(lead?.name.toLowerCase().includes(trimmedQuery))
        if (!matchesSearch) return false
      }

      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "priority") {
        const priorityDiff = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
        return priorityDiff !== 0 ? priorityDiff : a.start_date.localeCompare(b.start_date)
      }
      const startDiff = a.start_date.localeCompare(b.start_date)
      return startDiff !== 0 ? startDiff : a.end_date.localeCompare(b.end_date)
    })

    if (sortDirection === "desc") sorted.reverse()
    return sorted
  }, [
    projects,
    debouncedSearch,
    filters,
    view,
    leadsByProjectId,
    epicsById,
    departmentsById,
    squadsById,
    sortKey,
    sortDirection,
  ])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    )
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  const hasAnyProjects = projects.length > 0
  const hasResults = visibleProjects.length > 0
  const hasFiltersApplied =
    filters.search.trim() !== "" ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.department !== "all" ||
    filters.epic !== "all" ||
    filters.squad !== "all" ||
    filters.designLead !== "all" ||
    filters.health !== "all" ||
    filters.timeline !== "all" ||
    filters.showArchived

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="The full project directory: search, filter, and drill into any project."
        actions={
          <Button render={<Link href="/projects/new" />} nativeButton={false}>
            <Plus />
            Add Project
          </Button>
        }
      />

      <ContentSection bodyClassName="space-y-4">
        {!hasAnyProjects ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to start building the portfolio."
            action={
              <Button render={<Link href="/projects/new" />} nativeButton={false}>
                <Plus />
                Add Project
              </Button>
            }
          />
        ) : (
          <>
            <Tabs value={view} onValueChange={(next) => changeView(next as ProjectsView)}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            <ProjectsFilterBar
              filters={filters}
              onFiltersChange={patchFilters}
              onClearAll={clearFilters}
              hasFiltersApplied={hasFiltersApplied}
              departmentOptions={departmentOptions}
              epicOptions={epicOptions}
              squadOptions={squadOptions}
              designerOptions={designerOptions}
              hideStatusFilter={view !== "all"}
            />

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Epic</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead
                      aria-sort={
                        sortKey === "priority"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort("priority")}
                        className="flex items-center gap-1 text-foreground hover:text-foreground/80"
                      >
                        Priority
                        {sortIndicator("priority")}
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner Squad</TableHead>
                    <TableHead>Design Lead</TableHead>
                    <TableHead
                      aria-sort={
                        sortKey === "timeline"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort("timeline")}
                        className="flex items-center gap-1 text-foreground hover:text-foreground/80"
                      >
                        Timeline
                        {sortIndicator("timeline")}
                      </button>
                    </TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((project) => {
                    const epic = epicsById.get(project.epic_id)
                    const department = departmentsById.get(project.department_id)
                    const squad = squadsById.get(project.owner_squad_id)
                    const lead = leadsByProjectId.get(project.id)

                    return (
                      <TableRow
                        key={project.id}
                        className={cn("cursor-pointer", project.is_archived && "opacity-70")}
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <TableCell className="whitespace-normal font-medium text-foreground">
                          <div className="flex max-w-xs items-start gap-2 py-0.5">
                            <ProjectNameLink
                              href={`/projects/${project.id}`}
                              name={project.name}
                              className="min-w-0"
                              onClick={(event) => event.stopPropagation()}
                            />
                            {project.is_archived ? (
                              <Badge variant="outline" className="mt-0.5 shrink-0 text-muted-foreground">
                                Archived
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{epic?.name ?? "–"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {department?.name ?? "–"}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={project.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{squad?.name ?? "–"}</TableCell>
                        <TableCell>
                          <AssignLeadControl
                            projectId={project.id}
                            lead={lead}
                            designers={designers}
                            onAssigned={() => setAssignmentVersion((v) => v + 1)}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTimeline(project)}
                        </TableCell>
                        <TableCell>
                          <HealthBadge health={project.health} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(event) => event.stopPropagation()}
                                />
                              }
                            >
                              <MoreHorizontal />
                              <span className="sr-only">Project actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onClick={() => router.push(`/projects/${project.id}/edit`)}
                              >
                                <Pencil />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const updated = project.is_archived
                                    ? projectRepository.unarchive(project.id)
                                    : projectRepository.archive(project.id)
                                  if (updated) refreshProjects()
                                }}
                              >
                                {project.is_archived ? <ArchiveRestore /> : <Archive />}
                                {project.is_archived ? "Unarchive" : "Archive"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeletingProject(project)}
                              >
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </ContentSection>

      {deletingProject ? (
        <DeleteEntityDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeletingProject(null)
          }}
          entityLabel="project"
          entityName={deletingProject.name}
          blockers={[]}
          onConfirm={() => {
            projectRepository.removeCascade(deletingProject.id)
            refreshProjects()
          }}
        />
      ) : null}
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageContent />
    </Suspense>
  )
}
