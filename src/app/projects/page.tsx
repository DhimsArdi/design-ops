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
import { SearchInput } from "@/components/shared/search-input"
import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { HealthBadge } from "@/components/shared/health-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import { getProjectLead } from "@/lib/selectors/projectSelectors"
import { PRIORITIES, PROJECT_HEALTHS, PROJECT_STATUSES } from "@/lib/domain/enums"
import type { Priority, ProjectHealth, ProjectStatus } from "@/lib/domain/enums"
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

// Every filter is a plain "all" | <value> union kept in component state (no
// URL query-param sync — nothing links into this page with a preset filter
// yet, and every other list page in this app follows the same plain-state
// pattern). If a later phase needs deep-linking, these are the state shapes
// and "all" sentinel to mirror as query params: squad/department/epic by id,
// priority/status/health by their exact enum string, showArchived boolean.
type SquadFilter = "all" | string
type DepartmentFilter = "all" | string
type EpicFilter = "all" | string
type PriorityFilter = "all" | Priority
type StatusFilter = "all" | ProjectStatus
type HealthFilter = "all" | ProjectHealth

type SortKey = "priority" | "timeline"
type SortDirection = "asc" | "desc"

export default function ProjectsPage() {
  const router = useRouter()
  const [projects] = useRepositoryList(projectRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [departments] = useRepositoryList(departmentRepository)
  const [epics] = useRepositoryList(epicRepository)

  const [search, setSearch] = useState("")
  const [squadFilter, setSquadFilter] = useState<SquadFilter>("all")
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all")
  const [epicFilter, setEpicFilter] = useState<EpicFilter>("all")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all")
  const [showArchived, setShowArchived] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>("priority")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const squadsById = useMemo(() => new Map(squads.map((squad) => [squad.id, squad])), [squads])
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  )
  const epicsById = useMemo(() => new Map(epics.map((epic) => [epic.id, epic])), [epics])

  const squadOptions = useMemo(
    () => [...squads].sort((a, b) => a.name.localeCompare(b.name)),
    [squads]
  )
  const departmentOptions = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name)),
    [departments]
  )
  const epicOptions = useMemo(() => [...epics].sort((a, b) => a.name.localeCompare(b.name)), [epics])

  const visibleProjects = useMemo(() => {
    const trimmedQuery = search.trim().toLowerCase()

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
      if (trimmedQuery && !project.name.toLowerCase().includes(trimmedQuery)) return false
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
    search,
    showArchived,
    statusFilter,
    priorityFilter,
    healthFilter,
    squadFilter,
    departmentFilter,
    epicFilter,
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
    setSearch("")
    setSquadFilter("all")
    setDepartmentFilter("all")
    setEpicFilter("all")
    setPriorityFilter("all")
    setStatusFilter("all")
    setHealthFilter("all")
    setShowArchived(false)
  }

  const hasAnyProjects = projects.length > 0
  const hasResults = visibleProjects.length > 0
  const hasFiltersApplied =
    search.trim() !== "" ||
    squadFilter !== "all" ||
    departmentFilter !== "all" ||
    epicFilter !== "all" ||
    priorityFilter !== "all" ||
    statusFilter !== "all" ||
    healthFilter !== "all" ||
    showArchived

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
            title="No projects found"
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
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search projects…"
                className="w-full sm:w-56"
              />

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

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value ?? "all")}
              >
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

              <Select
                value={healthFilter}
                onValueChange={(value) => setHealthFilter(value ?? "all")}
              >
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((project) => {
                    const epic = epicsById.get(project.epic_id)
                    const department = departmentsById.get(project.department_id)
                    const squad = squadsById.get(project.owner_squad_id)
                    const lead = getProjectLead(project.id)

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
            )}
          </>
        )}
      </ContentSection>
    </div>
  )
}
