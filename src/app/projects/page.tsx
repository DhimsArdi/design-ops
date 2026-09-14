"use client"

// Projects — operational workspace (Projects page revamp, docs/PRD.MD
// §14.3). Board (default) / List / Table view modes over the same
// search/filter set; lifecycle status and view mode are unrelated axes —
// switching views never changes which projects are visible, only how.
//
// The old Active/Completed/All tabs are gone: Board's 3 columns and List's
// status groups already scope by lifecycle, and Table shows everything with
// the Status filter always available for a precise combination.

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import {
  Archive,
  ArchiveRestore,
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
import { AvatarGroup } from "@/components/shared/avatar-group"
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
import { Table } from "@/components/motion/table"
import type { TableColumn } from "@/components/motion/table"

import {
  ProjectsFilterBar,
  DEFAULT_FILTERS,
  currentDateKey,
  getProjectTimelineBucket,
  type ProjectFilters,
} from "./_components/projects-filter-bar"
import { ProjectViewSwitcher, type ProjectView } from "./_components/project-view-switcher"
import { ProjectBoard } from "./_components/board/project-board"
import { ProjectListView } from "./_components/list/project-list-view"
import { AssignTeamDialog } from "./_components/assign-team-dialog"

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import { canStartProject, UNASSIGNED_DESIGN_LEAD } from "@/lib/selectors/projectSelectors"
import { PRIORITIES, PROJECT_HEALTHS, PROJECT_STATUSES } from "@/lib/domain/enums"
import type { ProjectStatus } from "@/lib/domain/enums"
import type { Designer, Project } from "@/lib/domain/types"
import { monthOf } from "@/lib/domain/dateUtils"

const PROJECTS_VIEW_KEY = "dpp-projects-view"

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

/**
 * An explicit `?status=`/`?health=`/`?designLead=` drill-down (e.g.
 * Overview's stats) wants Table's always-visible, freely-combinable Status
 * filter, not Board's fixed 3-column scope — so it wins over whatever view
 * was last persisted. Otherwise, the persisted view (read in a mount effect
 * below, to avoid a localStorage/SSR hydration mismatch) applies, else Board.
 */
function initialViewFromSearchParams(searchParams: URLSearchParams): ProjectView {
  return searchParams.get("status") || searchParams.get("health") || searchParams.get("designLead")
    ? "table"
    : "board"
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
  const [assignments] = useRepositoryList(projectAssignmentRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [departments] = useRepositoryList(departmentRepository)
  const [epics] = useRepositoryList(epicRepository)
  const [designers] = useRepositoryList(designerRepository)

  // Lazy initializer: reads the URL once on mount (a drill-down link from
  // Overview), not a live two-way sync — the filter bar never writes back.
  const [filters, setFilters] = useState<ProjectFilters>(() =>
    initialFiltersFromSearchParams(searchParams)
  )
  const [view, setView] = useState<ProjectView>(() => initialViewFromSearchParams(searchParams))
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  const [sortKey, setSortKey] = useState<SortKey>("priority")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [tableAssignTarget, setTableAssignTarget] = useState<Project | null>(null)

  // A URL drill-down already decided the view (see initialViewFromSearchParams)
  // — only the persisted preference should override the Board default
  // otherwise, and only localStorage can be read on the client.
  useEffect(() => {
    if (searchParams.get("status") || searchParams.get("health") || searchParams.get("designLead")) return
    const stored = window.localStorage.getItem(PROJECTS_VIEW_KEY)
    if (stored === "board" || stored === "list" || stored === "table") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(stored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changeView(next: ProjectView) {
    setView(next)
    window.localStorage.setItem(PROJECTS_VIEW_KEY, next)
  }

  const squadsById = useMemo(() => new Map(squads.map((squad) => [squad.id, squad])), [squads])
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  )
  const epicsById = useMemo(() => new Map(epics.map((epic) => [epic.id, epic])), [epics])
  const designersById = useMemo(() => new Map(designers.map((designer) => [designer.id, designer])), [designers])

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

  // Reactive (assignments comes from useRepositoryList, so this recomputes on
  // any assignment write, inline Lead edit included) — replaces the old
  // manual "assignmentVersion" cache-bust counter.
  const leadsByProjectId = useMemo(() => {
    const map = new Map<string, Designer | undefined>()
    for (const assignment of assignments) {
      if (assignment.project_role === "Lead") map.set(assignment.project_id, designersById.get(assignment.designer_id))
    }
    return map
  }, [assignments, designersById])

  const supportByProjectId = useMemo(() => {
    const map = new Map<string, Designer[]>()
    for (const assignment of assignments) {
      if (assignment.project_role !== "Support") continue
      const designer = designersById.get(assignment.designer_id)
      if (!designer) continue
      const list = map.get(assignment.project_id) ?? []
      list.push(designer)
      map.set(assignment.project_id, list)
    }
    return map
  }, [assignments, designersById])

  function patchFilters(patch: Partial<ProjectFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  function viewStatusInTable(status: ProjectStatus) {
    changeView("table")
    patchFilters({ status: [status] })
  }

  const visibleProjects = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim().toLowerCase()
    const todayKey = currentDateKey()

    const filtered = projects.filter((project) => {
      if (!filters.showArchived && project.is_archived) return false

      if (filters.status.length > 0 && !filters.status.includes(project.status)) return false
      if (filters.priority.length > 0 && !filters.priority.includes(project.priority)) return false
      if (filters.health !== "all" && project.health !== filters.health) return false
      if (filters.squad !== "all" && project.owner_squad_id !== filters.squad) return false
      if (filters.department !== "all" && project.department_id !== filters.department) return false
      if (filters.epic !== "all" && project.epic_id !== filters.epic) return false
      if (filters.timeline !== "all" && getProjectTimelineBucket(project, todayKey) !== filters.timeline) {
        return false
      }
      if (filters.needsAllocation && canStartProject(project.id)) return false

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
    leadsByProjectId,
    epicsById,
    departmentsById,
    squadsById,
    sortKey,
    sortDirection,
  ])

  // Fed to the Table's controlled `sort`/`onSortChange` so its built-in
  // sortable headers drive the same sortKey/sortDirection this page already
  // uses to order Board and List (they read the same `visibleProjects`, so
  // sorting can't move into the Table alone). A third click on the same
  // header asks for "unsorted" — this page has no such state, so that tick
  // just wraps back to ascending instead of clearing the sort.
  function handleTableSortChange(next: { key: string; direction: SortDirection } | null) {
    if (next) {
      setSortKey(next.key as SortKey)
      setSortDirection(next.direction)
    } else {
      setSortDirection("asc")
    }
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  const columns = useMemo<TableColumn<Project>[]>(
    () => [
      {
        key: "name",
        header: "Project",
        cell: (project) => (
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
        ),
      },
      {
        key: "epic",
        header: "Epic",
        cell: (project) => (
          <span className="text-muted-foreground">{epicsById.get(project.epic_id)?.name ?? "–"}</span>
        ),
      },
      {
        key: "department",
        header: "Department",
        cell: (project) => (
          <span className="text-muted-foreground">
            {departmentsById.get(project.department_id)?.name ?? "–"}
          </span>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        sortable: true,
        sortValue: (project) => `${project.priority}~${project.start_date}`,
        cell: (project) => <PriorityBadge priority={project.priority} />,
      },
      {
        key: "status",
        header: "Status",
        cell: (project) => <StatusBadge status={project.status} />,
      },
      {
        key: "owner_squad",
        header: "Owner Squad",
        cell: (project) => (
          <span className="text-muted-foreground">
            {squadsById.get(project.owner_squad_id)?.name ?? "–"}
          </span>
        ),
      },
      {
        key: "design_lead",
        header: "Design Lead",
        cell: (project) => (
          <div onClick={(event) => event.stopPropagation()}>
            <AssignLeadControl
              projectId={project.id}
              lead={leadsByProjectId.get(project.id)}
              designers={designers}
              onAssigned={() => {}}
            />
          </div>
        ),
      },
      {
        key: "designers",
        header: "Designers",
        cell: (project) => {
          const support = supportByProjectId.get(project.id) ?? []
          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setTableAssignTarget(project)
              }}
            >
              {support.length > 0 ? (
                <AvatarGroup people={support} />
              ) : (
                <span className="text-sm text-primary underline underline-offset-2">Assign</span>
              )}
            </button>
          )
        },
      },
      {
        key: "timeline",
        header: "Timeline",
        sortable: true,
        sortValue: (project) => `${project.start_date}~${project.end_date}`,
        cell: (project) => (
          <span className="text-muted-foreground">{formatTimeline(project)}</span>
        ),
      },
      {
        key: "health",
        header: "Health",
        cell: (project) => <HealthBadge health={project.health} />,
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: "56px",
        align: "right",
        cell: (project) => (
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
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
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
              <DropdownMenuItem variant="destructive" onClick={() => setDeletingProject(project)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      epicsById,
      departmentsById,
      squadsById,
      leadsByProjectId,
      designers,
      supportByProjectId,
      router,
      refreshProjects,
    ]
  )

  const tableHeight = Math.min(560, (visibleProjects.length + 1) * 48)

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
    filters.showArchived ||
    filters.needsAllocation

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Plan, assign, and track design projects across the team."
        actions={
          <Button render={<Link href="/projects/new" />} nativeButton={false}>
            <Plus />
            Add Project
          </Button>
        }
      />

      <div className="space-y-6">
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
            <ProjectsFilterBar
              viewSwitcher={<ProjectViewSwitcher value={view} onChange={changeView} />}
              filters={filters}
              onFiltersChange={patchFilters}
              onClearAll={clearFilters}
              hasFiltersApplied={hasFiltersApplied}
              departmentOptions={departmentOptions}
              epicOptions={epicOptions}
              squadOptions={squadOptions}
              designerOptions={designerOptions}
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
            ) : view === "board" ? (
              <ProjectBoard
                projects={visibleProjects}
                epicsById={epicsById}
                departmentsById={departmentsById}
                assignments={assignments}
                designers={designers}
                squads={squads}
                onViewStatusInTable={viewStatusInTable}
              />
            ) : view === "list" ? (
              <ProjectListView
                projects={visibleProjects}
                epicsById={epicsById}
                departmentsById={departmentsById}
                assignments={assignments}
                designers={designers}
                squads={squads}
              />
            ) : (
              <Table
                data={visibleProjects}
                columns={columns}
                getRowId={(project) => project.id}
                onRowClick={(project) => router.push(`/projects/${project.id}`)}
                rowClassName={(project) => (project.is_archived ? "opacity-70" : undefined)}
                sort={{ key: sortKey, direction: sortDirection }}
                onSortChange={handleTableSortChange}
                height={tableHeight}
              />
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

      {tableAssignTarget ? (
        <AssignTeamDialog
          open
          onOpenChange={(open) => {
            if (!open) setTableAssignTarget(null)
          }}
          projectId={tableAssignTarget.id}
          projectName={tableAssignTarget.name}
          ownerSquadId={tableAssignTarget.owner_squad_id}
          designers={designers}
          squads={squads}
          onSaved={() => setTableAssignTarget(null)}
        />
      ) : null}
      </div>
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
