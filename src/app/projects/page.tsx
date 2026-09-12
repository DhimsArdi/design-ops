"use client"

// Projects — project directory / source of truth (PRD §14.3). Search,
// filter, and sort every project; drill into a project via its name link.
// This page never mutates a project itself — create/edit/archive live on
// /projects/new, /projects/[id], and /projects/[id]/edit — so it just reads
// fresh data from the repositories on every mount (see use-repository-list).
//
// Done and Archived projects are excluded by default (docs/DECISIONS.md,
// PRD §14.3): Done is reachable by explicitly picking it in the Status
// filter, Archived by the "Show archived" switch — either can be combined
// with the other, matching "reachable via the Status filter and an Archived
// toggle, not shown by default alongside active work."

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, FolderKanban, Plus, SearchX } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { HealthBadge } from "@/components/shared/health-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  currentMonthKey,
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
import { getProjectLead } from "@/lib/selectors/projectSelectors"
import { PRIORITIES } from "@/lib/domain/enums"
import type { Project } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

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

/** e.g. "Sep 2026 – Dec 2026", or "Nov 2026 – Feb 2027" across a year boundary. */
function formatTimeline(project: Project): string {
  return `${formatMonth(project.start_month)} – ${formatMonth(project.end_month)}`
}

type SortKey = "priority" | "timeline"
type SortDirection = "asc" | "desc"

export default function ProjectsPage() {
  const router = useRouter()
  const [projects] = useRepositoryList(projectRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [departments] = useRepositoryList(departmentRepository)
  const [epics] = useRepositoryList(epicRepository)
  const [designers] = useRepositoryList(designerRepository)

  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  const [sortKey, setSortKey] = useState<SortKey>("priority")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

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
  }, [projects])

  function patchFilters(patch: Partial<ProjectFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const visibleProjects = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim().toLowerCase()
    const todayKey = currentMonthKey()

    const filtered = projects.filter((project) => {
      if (!filters.showArchived && project.is_archived) return false

      const statusMatches =
        filters.status.length === 0 ? project.status !== "Done" : filters.status.includes(project.status)
      if (!statusMatches) return false

      if (filters.priority.length > 0 && !filters.priority.includes(project.priority)) return false
      if (filters.health !== "all" && project.health !== filters.health) return false
      if (filters.squad !== "all" && project.owner_squad_id !== filters.squad) return false
      if (filters.department !== "all" && project.department_id !== filters.department) return false
      if (filters.epic !== "all" && project.epic_id !== filters.epic) return false
      if (filters.timeline !== "all" && getProjectTimelineBucket(project, todayKey) !== filters.timeline) {
        return false
      }

      const lead = leadsByProjectId.get(project.id)
      if (filters.designLead !== "all" && lead?.id !== filters.designLead) return false

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
        return priorityDiff !== 0 ? priorityDiff : a.start_month.localeCompare(b.start_month)
      }
      const startDiff = a.start_month.localeCompare(b.start_month)
      return startDiff !== 0 ? startDiff : a.end_month.localeCompare(b.end_month)
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

      <ContentSection bodyClassName="p-0">
        {!hasAnyProjects ? (
          <div className="p-5">
            <EmptyState
              icon={FolderKanban}
              title="No projects found"
              description="Create your first project to start building the portfolio."
              action={
                <Button render={<Link href="/projects/new" />} nativeButton={false}>
                  <Plus />
                  Add Project
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <ProjectsFilterBar
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
              <div className="border-t border-border p-5">
                <EmptyState
                  icon={SearchX}
                  title="No projects match these filters."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="border-t border-border px-4 py-4">
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
                        <TableCell className="font-medium text-foreground">
                          <div className="flex max-w-xs items-center gap-2">
                            <Link
                              href={`/projects/${project.id}`}
                              className="truncate hover:underline"
                              title={project.name}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {project.name}
                            </Link>
                            {project.is_archived ? (
                              <Badge variant="outline" className="shrink-0 text-muted-foreground">
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
                        <TableCell className="text-muted-foreground">
                          {lead?.name ?? "Unassigned"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTimeline(project)}
                        </TableCell>
                        <TableCell>
                          <HealthBadge health={project.health} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </ContentSection>
    </div>
  )
}
