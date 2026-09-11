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
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

  const [query, setQuery] = useState("")

  const squadsById = useMemo(() => new Map(squads.map((squad) => [squad.id, squad])), [squads])
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [
    projects,
  ])

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
    const trimmedQuery = query.trim().toLowerCase()
    const matches = trimmedQuery
      ? designers.filter((designer) => designer.name.toLowerCase().includes(trimmedQuery))
      : designers
    return [...matches].sort((a, b) => a.name.localeCompare(b.name))
  }, [designers, query])

  const hasAnyDesigners = designers.length > 0
  const hasResults = visibleDesigners.length > 0

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

      <ContentSection
        title={hasAnyDesigners ? `${visibleDesigners.length} of ${designers.length} people` : undefined}
        bodyClassName="space-y-4"
      >
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
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search people…"
                className="w-full sm:w-64"
              />
            </div>

            {!hasResults ? (
              <EmptyState
                icon={SearchX}
                title="No designers match your search"
                description={`Nothing matches "${query}". Try a different name.`}
                action={
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
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
