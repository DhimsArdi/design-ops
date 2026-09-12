"use client"

// Overview — the primary stakeholder-facing dashboard (PRD §14.1, §40). A
// Design Lead reads this single screen out loud in a meeting: what's active,
// what's coming, who's at risk, who owns what, and where support crosses
// squad lines. No allocation/utilization math anywhere (PRD §4.2).
//
// Design Read: internal, stakeholder-facing status screen for an enterprise
// design-ops tool (PRD §29: enterprise / calm / minimal / light mode), read
// by a Design Lead presenting to non-technical stakeholders — not a
// marketing surface. Dial: ENERGY 1 (GOV.UK-plain, not Awwwards), RHYTHM 2
// (a full-width focal section, then two paired half-width sections — not one
// flat stack of identical cards), MOTION 1 (hover states only; this is a
// screen-shared status readout, not a scroll-reveal page).
//
// Every count/list on this page is computed from real repository data at
// render time — no invented numbers, no decorative charts (PRD explicitly:
// "Tidak perlu pie chart besar", "Avoid oversized project cards").
//
// Reads use the one-time-bootstrap-read pattern already established by
// app/projects/[id]/_components/project-detail-view.tsx: this page needs one
// consistent snapshot assembled from many repositories at once, not a
// reactive single-list subscription, and starting from `undefined` avoids an
// SSR/client hydration mismatch (localStorage doesn't exist on the server).

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { FolderKanban, Plus } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { HealthBadge } from "@/components/shared/health-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { Button } from "@/components/ui/button"

import * as projectRepository from "@/lib/repositories/projectRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import {
  getActiveProjects,
  getProjectAssignments,
  getProjectLead,
  getProposedProjects,
  getUnassignedProjects,
  isCrossSquadAssignment,
} from "@/lib/selectors/projectSelectors"
import { getSquadLead, getSquadMembers } from "@/lib/selectors/squadSelectors"
import { PRIORITIES, PROJECT_HEALTHS } from "@/lib/domain/enums"
import type { Designer, Project, Squad } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" })

/** month is "YYYY-MM" — parsed as local calendar parts, not via Date's own string parsing. */
function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number)
  return MONTH_FORMATTER.format(new Date(year, monthIndex - 1, 1))
}

function formatRange(project: Project): string {
  return `${formatMonth(project.start_month)} – ${formatMonth(project.end_month)}`
}

interface PriorityRow {
  project: Project
  squad: Squad | undefined
  lead: Designer | undefined
}

interface UpcomingRow {
  project: Project
  squad: Squad | undefined
  lead: Designer | undefined
}

interface TeamRow {
  squad: Squad
  lead: Designer | undefined
  memberCount: number
}

interface CrossSquadRow {
  key: string
  designer: Designer
  homeSquad: Squad | undefined
  project: Project
  ownerSquad: Squad | undefined
}

interface OverviewData {
  activeCount: number
  proposedCount: number
  activeDesignerCount: number
  unassignedCount: number
  priorityRows: PriorityRow[]
  upcomingRows: UpcomingRow[]
  healthCounts: Record<(typeof PROJECT_HEALTHS)[number], number>
  teamRows: TeamRow[]
  crossSquadRows: CrossSquadRow[]
  crossSquadTotal: number
  hasAnyProjects: boolean
}

const PRIORITY_LIST_CAP = 6
const UPCOMING_LIST_CAP = 5
const CROSS_SQUAD_CAP = 6

function loadOverviewData(): OverviewData {
  const allProjects = projectRepository.getAll()
  const squadsById = new Map(squadRepository.getAll().map((squad) => [squad.id, squad]))

  const liveProjects = allProjects.filter((project) => !project.is_archived)

  const activeProjects = getActiveProjects().filter((project) => !project.is_archived)
  const proposedProjects = getProposedProjects().filter((project) => !project.is_archived)
  const unassignedProjects = getUnassignedProjects().filter(
    (project) => !project.is_archived && project.status !== "Done"
  )

  const priorityRows: PriorityRow[] = [...activeProjects]
    .sort((a, b) => {
      const priorityDiff = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
      return priorityDiff !== 0 ? priorityDiff : a.start_month.localeCompare(b.start_month)
    })
    .slice(0, PRIORITY_LIST_CAP)
    .map((project) => ({
      project,
      squad: squadsById.get(project.owner_squad_id),
      lead: getProjectLead(project.id),
    }))

  const upcomingRows: UpcomingRow[] = [...proposedProjects]
    .sort((a, b) => a.start_month.localeCompare(b.start_month))
    .slice(0, UPCOMING_LIST_CAP)
    .map((project) => ({
      project,
      squad: squadsById.get(project.owner_squad_id),
      lead: getProjectLead(project.id),
    }))

  const healthEligible = liveProjects.filter((project) => project.status !== "Done")
  const healthCounts = Object.fromEntries(
    PROJECT_HEALTHS.map((health) => [
      health,
      healthEligible.filter((project) => project.health === health).length,
    ])
  ) as Record<(typeof PROJECT_HEALTHS)[number], number>

  const teamRows: TeamRow[] = squadRepository
    .getAll()
    .filter((squad) => squad.status === "Active")
    .map((squad) => ({
      squad,
      lead: getSquadLead(squad.id),
      memberCount: getSquadMembers(squad.id).length,
    }))
    .sort((a, b) => a.squad.name.localeCompare(b.squad.name))

  const allCrossSquadRows: CrossSquadRow[] = healthEligible
    .flatMap((project) =>
      getProjectAssignments(project.id).map((assignment) => {
        const designer = designerRepository.getById(assignment.designer_id)
        return designer && isCrossSquadAssignment(project, designer)
          ? { project, designer }
          : null
      })
    )
    .filter((row): row is { project: Project; designer: Designer } => row !== null)
    .map(({ project, designer }) => ({
      key: `${project.id}:${designer.id}`,
      designer,
      homeSquad: squadsById.get(designer.home_squad_id),
      project,
      ownerSquad: squadsById.get(project.owner_squad_id),
    }))
    .sort((a, b) => {
      const priorityDiff = PRIORITIES.indexOf(a.project.priority) - PRIORITIES.indexOf(b.project.priority)
      return priorityDiff !== 0 ? priorityDiff : a.designer.name.localeCompare(b.designer.name)
    })

  return {
    activeCount: activeProjects.length,
    proposedCount: proposedProjects.length,
    activeDesignerCount: designerRepository.getAll().filter((d) => d.status === "Active").length,
    unassignedCount: unassignedProjects.length,
    priorityRows,
    upcomingRows,
    healthCounts,
    teamRows,
    crossSquadRows: allCrossSquadRows.slice(0, CROSS_SQUAD_CAP),
    crossSquadTotal: allCrossSquadRows.length,
    hasAnyProjects: allProjects.length > 0,
  }
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | undefined>(undefined)

  const load = useCallback(() => {
    setData(loadOverviewData())
  }, [])

  useEffect(() => {
    // One-time bootstrap read of a synchronous, browser-only data source
    // (localStorage via the repository layer), not a subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (data === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading portfolio…</p>
  }

  if (!data.hasAnyProjects) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Design Portfolio"
          description="Current status across active work, timeline, and the design team."
        />
        <ContentSection>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Add your first project to start building the portfolio overview."
            action={
              <Button render={<Link href="/projects/new" />} nativeButton={false}>
                <Plus />
                Add Project
              </Button>
            }
          />
        </ContentSection>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design Portfolio"
        description="Current status across active work, timeline, and the design team."
      />

      <ContentSection bodyClassName="flex flex-wrap divide-x divide-border p-0">
        <Stat label="Active Projects" value={data.activeCount} />
        <Stat label="Upcoming / Proposed" value={data.proposedCount} />
        <Stat label="Designers" value={data.activeDesignerCount} />
        <Stat
          label="Unassigned Projects"
          value={data.unassignedCount}
          emphasize={data.unassignedCount > 0}
        />
      </ContentSection>

      <ContentSection
        title="Priority Projects"
        description="Active work (Planning / In Progress), highest priority first."
      >
        {data.priorityRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active projects right now.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.priorityRows.map(({ project, squad, lead }) => (
              <li key={project.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0">
                <PriorityBadge priority={project.priority} />
                <Link
                  href={`/projects/${project.id}`}
                  className="min-w-40 flex-1 text-sm font-medium text-foreground hover:underline"
                >
                  {project.name}
                </Link>
                <span className="w-36 shrink-0 text-sm text-muted-foreground">{formatRange(project)}</span>
                <span className="w-28 shrink-0 text-sm text-muted-foreground">{squad?.name ?? "–"}</span>
                <span
                  className={cn(
                    "w-28 shrink-0 text-sm",
                    lead ? "text-muted-foreground" : "font-medium text-status-warning"
                  )}
                >
                  {lead?.name ?? "Unassigned"}
                </span>
                <HealthBadge health={project.health} />
              </li>
            ))}
          </ul>
        )}
      </ContentSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <ContentSection title="Upcoming Projects" description="Proposed work, earliest start first." className="lg:col-span-3">
          {data.upcomingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming projects right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.upcomingRows.map(({ project, squad, lead }) => (
                <li key={project.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                  <PriorityBadge priority={project.priority} />
                  <Link
                    href={`/projects/${project.id}`}
                    className="min-w-40 flex-1 text-sm font-medium text-foreground hover:underline"
                  >
                    {project.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    Starts {formatMonth(project.start_month)}
                  </span>
                  <span className="text-sm text-muted-foreground">{squad?.name ?? "–"}</span>
                  {!lead ? (
                    <span className="text-xs font-medium text-status-warning">
                      Design Lead not assigned
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ContentSection>

        <ContentSection title="Project Health" description="Across active and on-hold work." className="lg:col-span-2">
          <ul className="space-y-3">
            {PROJECT_HEALTHS.map((health) => (
              <li key={health} className="flex items-center justify-between">
                <HealthBadge health={health} />
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {data.healthCounts[health]}
                </span>
              </li>
            ))}
          </ul>
        </ContentSection>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <ContentSection title="Team Snapshot" className="lg:col-span-2">
          {data.teamRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active squads right now.</p>
          ) : (
            <ul className="space-y-4">
              {data.teamRows.map(({ squad, lead, memberCount }) => (
                <li key={squad.id}>
                  <Link
                    href={`/teams/${squad.id}`}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {squad.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Lead: {lead?.name ?? "Unassigned"} · {memberCount}{" "}
                    {memberCount === 1 ? "Designer" : "Designers"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ContentSection>

        <ContentSection title="Cross-squad Support" className="lg:col-span-3">
          {data.crossSquadRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cross-squad support right now.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {data.crossSquadRows.map((row) => (
                  <li key={row.key} className="flex items-center gap-2 text-sm">
                    <PersonAvatar person={row.designer} size="sm" />
                    <span className="font-medium text-foreground">{row.designer.name}</span>
                    <span className="text-muted-foreground">
                      {row.homeSquad?.name ?? "–"} →{" "}
                      <Link href={`/projects/${row.project.id}`} className="hover:underline">
                        {row.project.name}
                      </Link>{" "}
                      / {row.ownerSquad?.name ?? "–"}
                    </span>
                  </li>
                ))}
              </ul>
              {data.crossSquadTotal > data.crossSquadRows.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  +{data.crossSquadTotal - data.crossSquadRows.length} more cross-squad assignment
                  {data.crossSquadTotal - data.crossSquadRows.length === 1 ? "" : "s"}.
                </p>
              ) : null}
            </>
          )}
        </ContentSection>
      </div>
    </div>
  )
}

interface StatProps {
  label: string
  value: number
  emphasize?: boolean
}

function Stat({ label, value, emphasize }: StatProps) {
  return (
    <div className="min-w-36 flex-1 px-5 py-4">
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          emphasize ? "text-status-warning" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
