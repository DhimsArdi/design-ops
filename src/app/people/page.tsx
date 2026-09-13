"use client"

// People (PRD §14.5). A read-only directory of every Designer — Active AND
// Inactive, both shown with EntityStatusBadge (§37: "see every designer";
// nothing here hides Inactive rows). All CRUD for Designers stays in Master
// Data (docs — "People/Teams are read-only") — this page only links there.
//
// No capacity/utilization/allocation/hours/workload anywhere (see the three
// count columns below, all plain occurrence counts, never a percentage).

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ExternalLink, SearchX, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { PeopleFilterBar, DEFAULT_PEOPLE_FILTERS, type PeopleFilters } from "./_components/people-filter-bar"

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"

// "Active Projects" per docs/DECISIONS.md / PRD §14.1 — a local literal set
// (same convention as project-detail-view.tsx) rather than importing
// getActiveProjects(), since only the predicate is needed here, applied
// per-assignment while walking every designer's rows once.
const ACTIVE_STATUSES = new Set(["Planning", "In Progress"])

interface DesignerStats {
  activeProjects: number
  leadProjects: number
  supportProjects: number
}

export default function PeoplePage() {
  const router = useRouter()
  const [designers] = useRepositoryList(designerRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [projects] = useRepositoryList(projectRepository)
  const [assignments] = useRepositoryList(projectAssignmentRepository)

  const [filters, setFilters] = useState<PeopleFilters>(DEFAULT_PEOPLE_FILTERS)
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  const squadsById = useMemo(() => new Map(squads.map((squad) => [squad.id, squad])), [squads])
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [
    projects,
  ])

  const squadOptions = useMemo(
    () => [...squads].sort((a, b) => a.name.localeCompare(b.name)).map((squad) => ({ value: squad.id, label: squad.name })),
    [squads]
  )

  function patchFilters(patch: Partial<PeopleFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  function clearFilters() {
    setFilters(DEFAULT_PEOPLE_FILTERS)
  }

  // Every count below is scoped to non-archived projects only (task spec) —
  // archived rows are skipped before either count is incremented.
  const statsByDesignerId = useMemo(() => {
    const stats = new Map<string, DesignerStats>()
    for (const designer of designers) {
      stats.set(designer.id, { activeProjects: 0, leadProjects: 0, supportProjects: 0 })
    }
    for (const assignment of assignments) {
      const project = projectsById.get(assignment.project_id)
      if (!project || project.is_archived) continue
      const entry = stats.get(assignment.designer_id)
      if (!entry) continue
      if (ACTIVE_STATUSES.has(project.status)) entry.activeProjects += 1
      if (assignment.project_role === "Lead") entry.leadProjects += 1
      else entry.supportProjects += 1
    }
    return stats
  }, [designers, assignments, projectsById])

  const visibleDesigners = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim().toLowerCase()

    const matches = designers.filter((designer) => {
      if (filters.squad !== "all" && designer.home_squad_id !== filters.squad) return false
      if (filters.seniority.length > 0 && !filters.seniority.includes(designer.seniority)) return false
      if (filters.status !== "all" && designer.status !== filters.status) return false

      if (filters.assignment !== "all") {
        const hasActiveProject = (statsByDesignerId.get(designer.id)?.activeProjects ?? 0) > 0
        if (filters.assignment === "assigned" && !hasActiveProject) return false
        if (filters.assignment === "unassigned" && hasActiveProject) return false
      }

      if (trimmedQuery) {
        const squad = squadsById.get(designer.home_squad_id)
        const matchesSearch =
          designer.name.toLowerCase().includes(trimmedQuery) ||
          designer.job_title.toLowerCase().includes(trimmedQuery) ||
          Boolean(squad?.name.toLowerCase().includes(trimmedQuery))
        if (!matchesSearch) return false
      }

      return true
    })
    return [...matches].sort((a, b) => a.name.localeCompare(b.name))
  }, [designers, debouncedSearch, filters, squadsById, statsByDesignerId])

  const hasAnyDesigners = designers.length > 0
  const hasResults = visibleDesigners.length > 0
  const hasFiltersApplied =
    filters.search.trim() !== "" ||
    filters.squad !== "all" ||
    filters.seniority.length > 0 ||
    filters.status !== "all" ||
    filters.assignment !== "all"

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Every designer on the team: role, home squad, and project involvement."
        actions={
          <Button
            variant="outline"
            render={<Link href="/master-data/designers" />}
            nativeButton={false}
          >
            <ExternalLink />
            Manage in Master Data
          </Button>
        }
      />

      <ContentSection bodyClassName="space-y-4">
        {!hasAnyDesigners ? (
          <EmptyState
            icon={Users}
            title="No designers yet"
            description="Add designers in Master Data to build the team roster."
            action={
              <Button render={<Link href="/master-data/designers" />} nativeButton={false}>
                Go to Master Data
              </Button>
            }
          />
        ) : (
          <>
            <PeopleFilterBar
              filters={filters}
              onFiltersChange={patchFilters}
              onClearAll={clearFilters}
              hasFiltersApplied={hasFiltersApplied}
              squadOptions={squadOptions}
            />

            {!hasResults ? (
              <EmptyState
                icon={SearchX}
                title="No designers match these filters"
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
                    <TableHead className="w-10">
                      <span className="sr-only">Avatar</span>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Home Squad</TableHead>
                    <TableHead className="text-right">Active Projects</TableHead>
                    <TableHead className="text-right">Lead Projects</TableHead>
                    <TableHead className="text-right">Support Projects</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDesigners.map((designer) => {
                    const squad = squadsById.get(designer.home_squad_id)
                    const stats = statsByDesignerId.get(designer.id)
                    return (
                      <TableRow
                        key={designer.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/people/${designer.id}`)}
                      >
                        <TableCell>
                          <PersonAvatar person={designer} size="sm" />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/people/${designer.id}`}
                            className="font-medium text-foreground hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {designer.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{designer.job_title}</TableCell>
                        <TableCell className="text-muted-foreground">{designer.seniority}</TableCell>
                        <TableCell className="text-muted-foreground">{squad?.name ?? "–"}</TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {stats?.activeProjects ?? 0}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {stats?.leadProjects ?? 0}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {stats?.supportProjects ?? 0}
                        </TableCell>
                        <TableCell>
                          <EntityStatusBadge status={designer.status} />
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
