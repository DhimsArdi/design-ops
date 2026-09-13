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
// Reads follow the same pattern as app/projects/[id]/_components/
// project-detail-view.tsx: this page needs one consistent snapshot assembled
// from many repositories at once, so it subscribes to the whole store rather
// than to a single repository's list. Starting from `undefined` avoids an
// SSR/client hydration mismatch (the cache is browser-only).

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, FolderKanban, Plus } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { HealthBadge, healthSolidClassName } from "@/components/shared/health-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { ProjectNameLink } from "@/components/shared/project-name-link"
import { AssignLeadControl } from "@/components/shared/assign-lead-control"
import { SupportingProjects } from "@/components/shared/supporting-projects"
import { Button } from "@/components/ui/button"

import { subscribe } from "@/lib/store/dataStore"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import {
  getActiveProjects,
  getProjectAssignments,
  getProjectLead,
  getUnassignedProjects,
  isCrossSquadAssignment,
  isTerminalStatus,
  UNASSIGNED_DESIGN_LEAD,
} from "@/lib/selectors/projectSelectors"
import { getSquadLead, getSquadMembers } from "@/lib/selectors/squadSelectors"
import { PRIORITIES, PROJECT_HEALTHS } from "@/lib/domain/enums"
import { monthOf } from "@/lib/domain/dateUtils"
import type { Designer, Project, Squad } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" })

/** month is "YYYY-MM" — parsed as local calendar parts, not via Date's own string parsing. */
function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number)
  return MONTH_FORMATTER.format(new Date(year, monthIndex - 1, 1))
}

/** Overview summarizes at month granularity; the day-level dates stay on Timeline and Project Detail. */
function formatRange(project: Project): string {
  return `${formatMonth(monthOf(project.start_date))} – ${formatMonth(monthOf(project.end_date))}`
}

interface PriorityRow {
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
  designer: Designer
  homeSquad: Squad | undefined
  /** Every non-archived, non-Done project this designer cross-squad supports — grouped per designer rather than one row per (project, designer) pair. */
  projects: Project[]
}

interface OverviewData {
  activeCount: number
  activeDesignerCount: number
  unassignedCount: number
  priorityRows: PriorityRow[]
  healthCounts: Record<(typeof PROJECT_HEALTHS)[number], number>
  teamRows: TeamRow[]
  crossSquadRows: CrossSquadRow[]
  crossSquadTotal: number
  hasAnyProjects: boolean
  /** Candidates for the inline "Assign" Design Lead control (PRD-adjacent UI ask). */
  designers: Designer[]
}

const PRIORITY_LIST_CAP = 6
const CROSS_SQUAD_CAP = 6

function loadOverviewData(): OverviewData {
  const allProjects = projectRepository.getAll()
  const squadsById = new Map(squadRepository.getAll().map((squad) => [squad.id, squad]))

  const liveProjects = allProjects.filter((project) => !project.is_archived)

  const activeProjects = getActiveProjects().filter((project) => !project.is_archived)
  const unassignedProjects = getUnassignedProjects().filter(
    (project) => !project.is_archived && !isTerminalStatus(project.status)
  )

  const priorityRows: PriorityRow[] = [...activeProjects]
    .sort((a, b) => {
      const priorityDiff = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
      return priorityDiff !== 0 ? priorityDiff : a.start_date.localeCompare(b.start_date)
    })
    .slice(0, PRIORITY_LIST_CAP)
    .map((project) => ({
      project,
      squad: squadsById.get(project.owner_squad_id),
      lead: getProjectLead(project.id),
    }))

  const healthEligible = liveProjects.filter((project) => !isTerminalStatus(project.status))
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

  const crossSquadProjectsByDesignerId = new Map<string, Project[]>()
  for (const project of healthEligible) {
    for (const assignment of getProjectAssignments(project.id)) {
      const designer = designerRepository.getById(assignment.designer_id)
      if (!designer || !isCrossSquadAssignment(project, designer)) continue
      const list = crossSquadProjectsByDesignerId.get(designer.id) ?? []
      list.push(project)
      crossSquadProjectsByDesignerId.set(designer.id, list)
    }
  }

  const allCrossSquadRows: CrossSquadRow[] = [...crossSquadProjectsByDesignerId.entries()]
    .map(([designerId, projects]) => {
      const designer = designerRepository.getById(designerId)!
      return {
        designer,
        homeSquad: squadsById.get(designer.home_squad_id),
        projects: [...projects].sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    .sort((a, b) => a.designer.name.localeCompare(b.designer.name))

  const allDesigners = designerRepository.getAll()

  return {
    activeCount: activeProjects.length,
    activeDesignerCount: allDesigners.filter((d) => d.status === "Active").length,
    unassignedCount: unassignedProjects.length,
    priorityRows,
    healthCounts,
    teamRows,
    crossSquadRows: allCrossSquadRows.slice(0, CROSS_SQUAD_CAP),
    crossSquadTotal: allCrossSquadRows.length,
    hasAnyProjects: allProjects.length > 0,
    designers: allDesigners,
  }
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | undefined>(undefined)

  const load = useCallback(() => {
    setData(loadOverviewData())
  }, [])

  useEffect(() => {
    // Subscribes to the store rather than to one repository's list, because
    // this page derives from six tables at once. Re-reads on every change,
    // including edits made by other people (docs/DECISIONS.md).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return subscribe(load)
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

  const healthTotal = PROJECT_HEALTHS.reduce((sum, health) => sum + data.healthCounts[health], 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Design Portfolio"
        description="Current status across active work, timeline, and the design team."
      />

      <ContentSection bodyClassName="flex flex-wrap divide-x divide-border p-0">
        <Stat label="Active Projects" value={data.activeCount} />
        <Stat label="Designers" value={data.activeDesignerCount} />
        <Stat
          label="Unassigned Projects"
          value={data.unassignedCount}
          emphasize={data.unassignedCount > 0}
          href={data.unassignedCount > 0 ? `/projects?designLead=${UNASSIGNED_DESIGN_LEAD}` : undefined}
        />
      </ContentSection>

      <ContentSection
        title="Priority Projects"
        description="Active work (Planning / In Progress), highest priority first."
        actions={
          data.activeCount > data.priorityRows.length ? (
            <Link
              href={`/projects?status=${["Planning", "In Progress"].map(encodeURIComponent).join(",")}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all {data.activeCount}
            </Link>
          ) : undefined
        }
      >
        {data.priorityRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active projects right now.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.priorityRows.map(({ project, squad, lead }) => (
              <li key={project.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0">
                <PriorityBadge priority={project.priority} />
                <ProjectNameLink
                  href={`/projects/${project.id}`}
                  name={project.name}
                  className="min-w-40 flex-1"
                />
                <span className="w-36 shrink-0 text-sm text-muted-foreground">{formatRange(project)}</span>
                <span className="w-28 shrink-0 text-sm text-muted-foreground">{squad?.name ?? "–"}</span>
                <span className="w-40 shrink-0">
                  <AssignLeadControl
                    projectId={project.id}
                    lead={lead}
                    designers={data.designers}
                    onAssigned={load}
                  />
                </span>
                <HealthBadge health={project.health} />
              </li>
            ))}
          </ul>
        )}
      </ContentSection>

      <ContentSection title="Project Health" description="Across active and on-hold work.">
        {healthTotal > 0 ? (
          <div className="mb-4 flex h-2.5 w-full gap-0.5">
            {PROJECT_HEALTHS.map((health) => {
              const count = data.healthCounts[health]
              if (count === 0) return null
              return (
                <Link
                  key={health}
                  href={`/projects?health=${encodeURIComponent(health)}`}
                  title={`${health}: ${count} of ${healthTotal}`}
                  aria-label={`${health}: ${count} of ${healthTotal} projects`}
                  style={{ flexGrow: count }}
                  className={cn(
                    "min-w-1.5 rounded-full transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    healthSolidClassName(health)
                  )}
                />
              )
            })}
          </div>
        ) : null}
        <ul className="space-y-1">
          {PROJECT_HEALTHS.map((health) => {
            const count = data.healthCounts[health]
            const row = (
              <>
                <HealthBadge health={health} />
                <span className="text-sm font-semibold tabular-nums text-foreground">{count}</span>
              </>
            )
            return (
              <li key={health}>
                {count > 0 ? (
                  <Link
                    href={`/projects?health=${encodeURIComponent(health)}`}
                    className="-mx-2 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1.5">{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      </ContentSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <ContentSection title="Squad Snapshot" className="lg:col-span-2">
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

        <ContentSection
          title="Cross-squad Support"
          description="Designers helping outside their Home Squad."
          className="lg:col-span-3"
        >
          {data.crossSquadRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cross-squad support right now.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {data.crossSquadRows.map((row) => (
                  <li key={row.designer.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <PersonAvatar person={row.designer} size="sm" />
                    <span className="font-medium text-foreground">{row.designer.name}</span>
                    <span className="text-xs text-muted-foreground">{row.homeSquad?.name ?? "–"}</span>
                    <SupportingProjects projects={row.projects} />
                  </li>
                ))}
              </ul>
              {data.crossSquadTotal > data.crossSquadRows.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  +{data.crossSquadTotal - data.crossSquadRows.length} more designer
                  {data.crossSquadTotal - data.crossSquadRows.length === 1 ? "" : "s"} with cross-squad support.
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
  /** When set, the stat becomes a drill-down entry point into the underlying data (task ask §9) — still visually a stat, not a CTA. */
  href?: string
}

function Stat({ label, value, emphasize, href }: StatProps) {
  const body = (
    <>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          emphasize ? "text-status-warning" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {href ? (
          <ChevronRight className="size-3 opacity-0 transition-opacity group-hover/stat:opacity-100 group-focus-visible/stat:opacity-100" />
        ) : null}
      </p>
    </>
  )

  if (!href) {
    return <div className="min-w-36 flex-1 px-5 py-4">{body}</div>
  }

  return (
    <Link
      href={href}
      className="group/stat min-w-36 flex-1 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    >
      {body}
    </Link>
  )
}
