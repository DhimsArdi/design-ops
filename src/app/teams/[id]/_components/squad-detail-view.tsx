"use client"

// Squad Detail (PRD §14.8). Read-only: members, Squad Lead, projects the
// squad owns, and cross-squad support — no create/edit here (that's
// /master-data/squads). Cross-squad Support is derived fresh on every read
// from ProjectAssignment + isCrossSquadAssignment, never stored (PRD §32).
//
// Reads go straight through the repository/selector layer rather than the
// useRepositoryList hook: this page needs one record by id plus several
// derived lookups, not a reactive list. To avoid an SSR/client hydration
// mismatch (the cache is browser-only), data starts as `undefined`
// ("loading") and is filled in a mount effect that then stays subscribed to
// the store — the same pattern used by app/projects/[id]/_components/
// project-detail-view.tsx.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { EmptyFieldAction } from "@/components/shared/empty-field-action"
import { SupportingProjects } from "@/components/shared/supporting-projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { subscribe } from "@/lib/store/dataStore"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"
import { getSquadLead, getSquadMembers } from "@/lib/selectors/squadSelectors"
import type { Designer, Project, Squad } from "@/lib/domain/types"

interface OutgoingSupportRow {
  designer: Designer
  /** Every project (owned by another squad) this member currently supports. */
  projects: Project[]
}

interface IncomingSupportRow {
  designer: Designer
  homeSquad: Squad | undefined
  /** Every one of this squad's own projects that designer currently supports. */
  projects: Project[]
}

interface SquadDetailData {
  squad: Squad
  squadLead: Designer | undefined
  members: Designer[]
  projectsOwned: Project[]
  outgoing: OutgoingSupportRow[]
  incoming: IncomingSupportRow[]
}

/** null means "no squad with this id" — a normal not-found case, not an error. */
function loadSquadDetail(squadId: string): SquadDetailData | null {
  const squad = squadRepository.getById(squadId)
  if (!squad) return null

  const squadsById = new Map(squadRepository.getAll().map((s) => [s.id, s]))
  const members = getSquadMembers(squadId)

  // Non-archived projects only — cross-squad support is recomputed across
  // these every read (PRD §32), never persisted.
  const activeProjects = projectRepository.getAll().filter((project) => !project.is_archived)
  const activeProjectsById = new Map(activeProjects.map((project) => [project.id, project]))
  const projectsOwned = activeProjects.filter((project) => project.owner_squad_id === squadId)

  const assignments = projectAssignmentRepository.getAll()

  // Outgoing: this squad's own members, assigned to a project owned by
  // another squad — grouped per designer (one row per person, not per
  // project) so someone supporting several projects reads as one line.
  const outgoingProjectsByMemberId = new Map<string, Project[]>()
  for (const member of members) {
    for (const assignment of assignments) {
      if (assignment.designer_id !== member.id) continue
      const project = activeProjectsById.get(assignment.project_id)
      if (!project || project.owner_squad_id === squadId) continue
      const list = outgoingProjectsByMemberId.get(member.id) ?? []
      list.push(project)
      outgoingProjectsByMemberId.set(member.id, list)
    }
  }
  const outgoing: OutgoingSupportRow[] = [...outgoingProjectsByMemberId.entries()]
    .map(([memberId, projects]) => ({
      designer: members.find((member) => member.id === memberId)!,
      projects: [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.designer.name.localeCompare(b.designer.name))

  // Incoming: designers from other squads, assigned to a project this squad
  // owns — same per-designer grouping.
  const incomingProjectsByDesignerId = new Map<string, Project[]>()
  for (const project of projectsOwned) {
    for (const assignment of assignments) {
      if (assignment.project_id !== project.id) continue
      const designer = designerRepository.getById(assignment.designer_id)
      if (!designer || designer.home_squad_id === squadId) continue
      const list = incomingProjectsByDesignerId.get(designer.id) ?? []
      list.push(project)
      incomingProjectsByDesignerId.set(designer.id, list)
    }
  }
  const incoming: IncomingSupportRow[] = [...incomingProjectsByDesignerId.entries()]
    .map(([designerId, projects]) => {
      const designer = designerRepository.getById(designerId)!
      return {
        designer,
        homeSquad: squadsById.get(designer.home_squad_id),
        projects: [...projects].sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    .sort((a, b) => a.designer.name.localeCompare(b.designer.name))

  return {
    squad,
    squadLead: getSquadLead(squadId),
    members: [...members].sort((a, b) => a.name.localeCompare(b.name)),
    projectsOwned,
    outgoing,
    incoming,
  }
}

interface SquadDetailViewProps {
  squadId: string
}

export function SquadDetailView({ squadId }: SquadDetailViewProps) {
  const [data, setData] = useState<SquadDetailData | null | undefined>(undefined)

  const load = useCallback(() => {
    setData(loadSquadDetail(squadId))
  }, [squadId])

  useEffect(() => {
    // Subscribes to the store rather than to one repository's list, because
    // this view joins squad, designer, assignment and project data. Re-reads on
    // every change, including edits made by other people (docs/DECISIONS.md).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return subscribe(load)
  }, [load])

  if (data === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading squad…</p>
  }

  if (data === null) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Squad not found"
          description="This squad may have been removed, or the link is no longer valid."
        />
        <Button variant="outline" render={<Link href="/teams" />} nativeButton={false}>
          <ArrowLeft />
          Back to Teams
        </Button>
      </div>
    )
  }

  const { squad, squadLead, members, projectsOwned, outgoing, incoming } = data

  return (
    <div className="space-y-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Teams
      </Link>

      <PageHeader
        title={squad.name}
        actions={
          <Button variant="outline" render={<Link href="/master-data/squads" />} nativeButton={false}>
            <ExternalLink />
            Manage in Master Data
          </Button>
        }
      />

      <div className="-mt-3 flex flex-wrap items-center gap-3">
        <EntityStatusBadge status={squad.status} />
        {squadLead ? (
          <span className="text-sm text-muted-foreground">Squad Lead: {squadLead.name}</span>
        ) : (
          <EmptyFieldAction
            label="No lead assigned"
            actionLabel="Assign in Master Data"
            href="/master-data/squads"
          />
        )}
      </div>

      <ContentSection
        title="Members"
        bodyClassName={members.length === 0 ? undefined : "p-0"}
      >
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No designers in this squad"
            description="This may be intentional — a future team or available capacity. A designer joins by setting this as their Home Squad in Master Data."
            action={
              <Button variant="outline" render={<Link href="/master-data/designers" />} nativeButton={false}>
                <ExternalLink />
                Go to Master Data
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <PersonAvatar person={member} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.job_title}</p>
                </div>
                {member.status === "Inactive" ? <EntityStatusBadge status={member.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </ContentSection>

      <ContentSection
        title="Projects Owned by Squad"
        bodyClassName={projectsOwned.length === 0 ? undefined : "p-0"}
      >
        {projectsOwned.length === 0 ? (
          <EmptyState title="No projects currently owned by this squad" />
        ) : (
          <ul className="divide-y divide-border">
            {projectsOwned.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <Link href={`/projects/${project.id}`} className="text-sm font-medium text-foreground hover:underline">
                  {project.name}
                </Link>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={project.priority} />
                  <StatusBadge status={project.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </ContentSection>

      <ContentSection
        title="Cross-squad Support"
        description="Derived from current project assignments, recomputed every time, never stored."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Outgoing: this squad&apos;s designers helping elsewhere
            </p>
            {outgoing.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outgoing cross-squad support.</p>
            ) : (
              <ul className="space-y-3">
                {outgoing.map((row) => (
                  <li key={row.designer.id} className="text-sm">
                    <p className="font-medium text-foreground">{row.designer.name}</p>
                    <SupportingProjects projects={row.projects} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Incoming: designers from other squads helping here
            </p>
            {incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incoming cross-squad support.</p>
            ) : (
              <ul className="space-y-3">
                {incoming.map((row) => (
                  <li key={row.designer.id} className="text-sm">
                    <p className="font-medium text-foreground">
                      {row.designer.name}{" "}
                      <Badge variant="outline" className="ml-1 text-xs font-normal">
                        {row.homeSquad?.name ?? "–"}
                      </Badge>
                    </p>
                    <SupportingProjects projects={row.projects} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ContentSection>
    </div>
  )
}
