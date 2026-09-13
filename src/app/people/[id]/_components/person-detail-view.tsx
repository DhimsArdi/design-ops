"use client"

// Person Detail (PRD §14.6). Structural info (Home Squad/Squad Lead),
// Current Projects, and the Person Timeline — "important MVP feature" per
// the PRD, built by reusing month-range-track.tsx exactly as validated by
// the Timeline page. Read-only: no edit affordance here, only a link out to
// Master Data (all Designer CRUD lives there).
//
// Deliberately NOT here: any automatic "too much overlap" warning or score —
// the Person Timeline shows bars for a human to read, the system never
// judges them (PRD §14.6).
//
// Same pattern as project-detail-view.tsx: data starts as `undefined`
// ("loading") and is filled in a mount effect that then stays subscribed to
// the store, so the server render and first client paint match.

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table } from "@/components/motion/table"
import type { TableColumn } from "@/components/motion/table"
import {
  MonthRangeTrack,
  addMonths,
  type MonthRangeTrackRow,
} from "@/components/timeline/month-range-track"

import { subscribe } from "@/lib/store/dataStore"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"
import { getSquadLead } from "@/lib/selectors/squadSelectors"
import { isCrossSquadAssignment } from "@/lib/selectors/projectSelectors"
import type { Designer, Project, ProjectAssignment, Squad } from "@/lib/domain/types"
// Person Timeline stays month-granularity (PRD §14.6) even though Project now
// carries day-level dates — the months are derived here, not stored.
import { monthOf } from "@/lib/domain/dateUtils"

interface CurrentProjectRow {
  assignment: ProjectAssignment
  project: Project
  ownerSquad: Squad | undefined
  crossSquad: boolean
}

interface PersonDetailData {
  designer: Designer
  homeSquad: Squad | undefined
  squadLead: Designer | undefined
  currentProjects: CurrentProjectRow[]
}

/** null means "no designer with this id" — a normal not-found case, not an error. */
function loadPersonDetail(designerId: string): PersonDetailData | null {
  const designer = designerRepository.getById(designerId)
  if (!designer) return null

  const currentProjects = projectAssignmentRepository
    .getAll()
    .filter((assignment) => assignment.designer_id === designerId)
    .map((assignment): CurrentProjectRow | null => {
      const project = projectRepository.getById(assignment.project_id)
      if (!project || project.is_archived) return null
      return {
        assignment,
        project,
        ownerSquad: squadRepository.getById(project.owner_squad_id),
        crossSquad: isCrossSquadAssignment(project, designer),
      }
    })
    .filter((row): row is CurrentProjectRow => row !== null)
    .sort((a, b) => a.project.start_date.localeCompare(b.project.start_date))

  return {
    designer,
    homeSquad: squadRepository.getById(designer.home_squad_id),
    squadLead: getSquadLead(designer.home_squad_id),
    currentProjects,
  }
}

// Same "pad out a degenerate grid" convention as app/timeline/page.tsx —
// duplicated locally rather than shared, since it's a few lines of month
// arithmetic scoped to how each page computes its own visible range.
const MIN_VISIBLE_MONTHS = 6

function monthsBetween(start: string, end: string): number {
  const [startYear, startMonth] = start.split("-").map(Number)
  const [endYear, endMonth] = end.split("-").map(Number)
  return (endYear! - startYear!) * 12 + (endMonth! - startMonth!)
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function computeMonthRange(rows: CurrentProjectRow[]): { start: string; end: string } {
  const current = currentMonthKey()
  if (rows.length === 0) {
    return { start: addMonths(current, -2), end: addMonths(current, 3) }
  }

  let start = monthOf(rows[0]!.project.start_date)
  let end = monthOf(rows[0]!.project.end_date)
  for (const row of rows) {
    const rowStart = monthOf(row.project.start_date)
    const rowEnd = monthOf(row.project.end_date)
    if (rowStart < start) start = rowStart
    if (rowEnd > end) end = rowEnd
  }

  const span = monthsBetween(start, end) + 1
  if (span < MIN_VISIBLE_MONTHS) {
    const deficit = MIN_VISIBLE_MONTHS - span
    start = addMonths(start, -Math.floor(deficit / 2))
    end = addMonths(end, Math.ceil(deficit / 2))
  }
  return { start, end }
}

interface PersonDetailViewProps {
  designerId: string
}

export function PersonDetailView({ designerId }: PersonDetailViewProps) {
  const [data, setData] = useState<PersonDetailData | null | undefined>(undefined)
  const router = useRouter()

  const load = useCallback(() => {
    setData(loadPersonDetail(designerId))
  }, [designerId])

  useEffect(() => {
    // Subscribes to the store rather than to one repository's list, because
    // this view joins designer, squad, assignment and project data. Re-reads on
    // every change, including edits made by other people (docs/DECISIONS.md).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return subscribe(load)
  }, [load])

  const rows: MonthRangeTrackRow[] = useMemo(() => {
    if (!data) return []
    return data.currentProjects.map((row) => ({
      id: row.project.id,
      label: row.project.name,
      startMonth: monthOf(row.project.start_date),
      endMonth: monthOf(row.project.end_date),
      confidence: row.project.timeline_confidence,
      meta: `${row.assignment.project_role}${row.crossSquad ? " · Cross-squad" : ""}`,
      onClick: () => router.push(`/projects/${row.project.id}`),
    }))
  }, [data, router])

  const monthRange = useMemo(
    () => computeMonthRange(data?.currentProjects ?? []),
    [data]
  )

  const projectColumns = useMemo<TableColumn<CurrentProjectRow>[]>(
    () => [
      {
        key: "project",
        header: "Project",
        cell: (row) => (
          <Link
            href={`/projects/${row.project.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {row.project.name}
          </Link>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        cell: (row) => <PriorityBadge priority={row.project.priority} />,
      },
      {
        key: "owner_squad",
        header: "Owner Squad",
        cell: (row) => <span className="text-muted-foreground">{row.ownerSquad?.name ?? "–"}</span>,
      },
      {
        key: "role",
        header: "Role",
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{row.assignment.project_role}</Badge>
            {row.crossSquad ? (
              <Badge variant="outline" className="text-xs">
                Cross-squad
              </Badge>
            ) : null}
          </div>
        ),
      },
    ],
    []
  )

  if (data === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading person…</p>
  }

  if (data === null) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Person not found"
          description="This designer may have been removed, or the link is no longer valid."
        />
        <Button variant="outline" render={<Link href="/people" />} nativeButton={false}>
          <ArrowLeft />
          Back to People
        </Button>
      </div>
    )
  }

  const { designer, homeSquad, squadLead, currentProjects } = data

  return (
    <div className="space-y-6">
      <Link
        href="/people"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to People
      </Link>

      <PageHeader
        title={designer.name}
        description={`${designer.job_title} · ${designer.seniority}`}
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

      <div className="-mt-3 flex flex-wrap items-center gap-2">
        <EntityStatusBadge status={designer.status} />
      </div>

      <ContentSection title="Overview">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Home Squad" value={homeSquad?.name ?? "–"} />
          <Field label="Squad Lead" value={squadLead?.name ?? "Unassigned"} />
        </dl>
      </ContentSection>

      <ContentSection
        title="Current Projects"
        description="Every non-archived project this person is assigned to, as Lead or Support."
        bodyClassName={currentProjects.length ? "p-0" : undefined}
      >
        {currentProjects.length === 0 ? (
          <EmptyState
            title="No current projects"
            description="This designer has no active or upcoming project assignments."
          />
        ) : (
          <Table
            data={currentProjects}
            columns={projectColumns}
            getRowId={(row) => row.assignment.id}
            height={Math.min(560, (currentProjects.length + 1) * 48)}
          />
        )}
      </ContentSection>

      <ContentSection
        title="Person Timeline"
        description="Every project bar this person is on, so overlap is easy to see. The system does not judge whether it's too much."
      >
        {rows.length === 0 ? (
          <EmptyState title="Nothing to show on the timeline yet" />
        ) : (
          <div className="overflow-x-auto">
            <MonthRangeTrack rows={rows} monthRange={monthRange} />
          </div>
        )}
      </ContentSection>
    </div>
  )
}

interface FieldProps {
  label: ReactNode
  value: ReactNode
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
