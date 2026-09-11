"use client"

// Project Detail (PRD §14.4). Answers "what/where/who/when" for one project:
// business context (Epic/Department/stakeholders), design ownership (Owner
// Squad/Squad Lead/Project Design Lead/Support), timeline + monthly targets,
// and freshness metadata. Archive/Unarchive lives here too (§25) — separate
// from Status, never a delete.
//
// Reads go straight through the repository/selector layer rather than the
// useRepositoryList hook: this page needs one record by id plus several
// small derived lookups, not a reactive list. To avoid an SSR/client
// hydration mismatch (server and first client paint have no localStorage),
// data starts as `undefined` ("loading") and is filled in a mount effect —
// the same one-time-bootstrap-read pattern already used by
// app/overview/page.tsx and app/master-data/squads/page.tsx.

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Archive, ArchiveRestore, ArrowLeft, Pencil } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { HealthBadge } from "@/components/shared/health-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import * as projectRepository from "@/lib/repositories/projectRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as projectMonthlyTargetRepository from "@/lib/repositories/projectMonthlyTargetRepository"
import { getSquadLead } from "@/lib/selectors/squadSelectors"
import {
  getProjectLead,
  getProjectSupportDesigners,
  getProjectWeeklyFocus,
  isCrossSquadAssignment,
} from "@/lib/selectors/projectSelectors"
import type {
  Department,
  Designer,
  Epic,
  Project,
  ProjectMonthlyTarget,
  ProjectWeeklyFocus,
  Squad,
  Stakeholder,
} from "@/lib/domain/types"
import type { TimelineConfidence } from "@/lib/domain/enums"
import { formatWeekRangeLabel, monthOfWeek } from "@/lib/domain/weekUtils"

interface ProjectDetailData {
  project: Project
  epic: Epic | undefined
  department: Department | undefined
  departmentHead: Stakeholder | undefined
  productOwners: Stakeholder[]
  projectAdmins: Stakeholder[]
  ownerSquad: Squad | undefined
  squadLead: Designer | undefined
  projectLead: Designer | undefined
  supportDesigners: Designer[]
  monthlyTargets: ProjectMonthlyTarget[]
  weeklyFocus: ProjectWeeklyFocus[]
}

function resolveStakeholders(ids: string[]): Stakeholder[] {
  return ids
    .map((id) => stakeholderRepository.getById(id))
    .filter((stakeholder): stakeholder is Stakeholder => stakeholder !== undefined)
}

/** null means "no project with this id" — a normal not-found case, not an error. */
function loadProjectDetail(projectId: string): ProjectDetailData | null {
  const project = projectRepository.getById(projectId)
  if (!project) return null

  return {
    project,
    epic: epicRepository.getById(project.epic_id),
    department: departmentRepository.getById(project.department_id),
    departmentHead: project.department_head_id
      ? stakeholderRepository.getById(project.department_head_id)
      : undefined,
    productOwners: resolveStakeholders(project.product_owner_ids),
    projectAdmins: resolveStakeholders(project.project_admin_ids),
    ownerSquad: squadRepository.getById(project.owner_squad_id),
    squadLead: getSquadLead(project.owner_squad_id),
    projectLead: getProjectLead(project.id),
    supportDesigners: getProjectSupportDesigners(project.id),
    monthlyTargets: projectMonthlyTargetRepository
      .getAll()
      .filter((target) => target.project_id === project.id)
      .sort((a, b) => a.month.localeCompare(b.month)),
    weeklyFocus: getProjectWeeklyFocus(project.id),
  }
}

interface WeeklyPlanMonthGroup {
  month: string
  weeks: { week: string; items: ProjectWeeklyFocus[] }[]
}

/** Groups Weekly Focus rows by month (for the "September 2026" header, PRD
 * §14.4), then by week within that month — both already chronological since
 * getProjectWeeklyFocus sorts by week_start_date. */
function groupWeeklyFocusByMonth(items: ProjectWeeklyFocus[]): WeeklyPlanMonthGroup[] {
  const groups: WeeklyPlanMonthGroup[] = []
  for (const item of items) {
    const month = monthOfWeek(item.week_start_date)
    let monthGroup = groups.find((g) => g.month === month)
    if (!monthGroup) {
      monthGroup = { month, weeks: [] }
      groups.push(monthGroup)
    }
    let weekGroup = monthGroup.weeks.find((w) => w.week === item.week_start_date)
    if (!weekGroup) {
      weekGroup = { week: item.week_start_date, items: [] }
      monthGroup.weeks.push(weekGroup)
    }
    weekGroup.items.push(item)
  }
  return groups
}

const MONTH_FULL_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })

function formatMonthFull(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number)
  return MONTH_FULL_FORMATTER.format(new Date(year, monthIndex - 1, 1))
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" })
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })

/** month is "YYYY-MM" (docs/lib/domain/types.ts) — parsed as local calendar parts, not through Date's own string parsing, so no UTC/local timezone drift. */
function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number)
  return MONTH_FORMATTER.format(new Date(year, monthIndex - 1, 1))
}

function formatDate(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso))
}

/** Small local relative-time formatter (PRD §33) — no date library needed for "Updated 2 days ago". */
function formatRelativeTime(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const diffMinutes = Math.round(diffMs / (60 * 1000))
  const diffHours = Math.round(diffMs / (60 * 60 * 1000))
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  const diffMonths = Math.round(diffDays / 30)
  const diffYears = Math.round(diffDays / 365)

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`
}

// "Active Projects" per docs/DECISIONS.md / PRD §14.1 — kept as a local
// literal set rather than importing getActiveProjects(), since that selector
// filters a whole list and we only need the predicate for one project here.
const ACTIVE_STATUSES = new Set(["Planning", "In Progress"])
const NEEDS_REVIEW_THRESHOLD_DAYS = 14

/** PRD §33: subtle, optional — never an error/critical warning. */
function isNeedsReview(project: Project): boolean {
  if (!ACTIVE_STATUSES.has(project.status)) return false
  const diffDays = (Date.now() - new Date(project.updated_at).getTime()) / (24 * 60 * 60 * 1000)
  return diffDays > NEEDS_REVIEW_THRESHOLD_DAYS
}

interface ProjectDetailViewProps {
  projectId: string
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const [data, setData] = useState<ProjectDetailData | null | undefined>(undefined)

  const load = useCallback(() => {
    setData(loadProjectDetail(projectId))
  }, [projectId])

  useEffect(() => {
    // One-time bootstrap read of a synchronous, browser-only data source
    // (localStorage via the repository layer), not a subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function handleArchiveToggle() {
    if (!data) return
    const updated = data.project.is_archived
      ? projectRepository.unarchive(data.project.id)
      : projectRepository.archive(data.project.id)
    if (updated) {
      setData((current) => (current ? { ...current, project: updated } : current))
    }
  }

  if (data === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading project…</p>
  }

  if (data === null) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Project not found"
          description="This project may have been removed, or the link is no longer valid."
        />
        <Button variant="outline" render={<Link href="/projects" />} nativeButton={false}>
          <ArrowLeft />
          Back to Projects
        </Button>
      </div>
    )
  }

  const {
    project,
    epic,
    department,
    departmentHead,
    productOwners,
    projectAdmins,
    ownerSquad,
    squadLead,
    projectLead,
    supportDesigners,
    monthlyTargets,
    weeklyFocus,
  } = data
  const weeklyPlan = groupWeeklyFocusByMonth(weeklyFocus)
  const phaseByMonth = new Map(monthlyTargets.map((target) => [target.month, target.phase]))

  const flagReview = isNeedsReview(project)

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <PageHeader
        title={project.name}
        actions={
          <>
            <Button variant="outline" render={<Link href={`/projects/${project.id}/edit`} />} nativeButton={false}>
              <Pencil />
              Edit
            </Button>
            <Button variant="outline" onClick={handleArchiveToggle}>
              {project.is_archived ? <ArchiveRestore /> : <Archive />}
              {project.is_archived ? "Unarchive" : "Archive"}
            </Button>
          </>
        }
      />

      <div className="-mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={project.priority} />
        <StatusBadge status={project.status} />
        <HealthBadge health={project.health} />
        <TimelineConfidenceTag confidence={project.timeline_confidence} />
        {project.is_archived ? (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Archive className="size-3" />
            Archived
          </Badge>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {formatMonth(project.start_month)} – {formatMonth(project.end_month)}
        </span>
      </div>

      <ContentSection title="Project Context">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Epic" value={epic?.name ?? "–"} />
          <Field label="Department" value={department?.name ?? "–"} />
          <Field
            label="Department Head"
            value={
              <div className="space-y-1">
                <p>{departmentHead?.name ?? "Unassigned"}</p>
                <p className="text-xs text-muted-foreground">
                  Snapshot at project creation, may differ from the department&apos;s current
                  head.
                </p>
              </div>
            }
          />
          <Field
            label="Product Owners"
            value={
              productOwners.length ? productOwners.map((s) => s.name).join(", ") : "None"
            }
          />
          <Field
            label="Project Admin / PIC"
            value={
              projectAdmins.length ? projectAdmins.map((s) => s.name).join(", ") : "None"
            }
          />
        </dl>
      </ContentSection>

      <ContentSection title="Design Ownership">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Owner Squad" value={ownerSquad?.name ?? "–"} />
          <Field label="Squad Lead" value={squadLead?.name ?? "Unassigned"} />
          <Field
            label="Project Design Lead"
            value={
              projectLead ? (
                <PersonInline
                  designer={projectLead}
                  crossSquad={isCrossSquadAssignment(project, projectLead)}
                />
              ) : (
                "Unassigned"
              )
            }
          />
        </dl>

        <Separator className="my-5" />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Supporting Designers</p>
          {supportDesigners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supporting designers assigned.</p>
          ) : (
            <ul className="space-y-2.5">
              {supportDesigners.map((designer) => (
                <li key={designer.id} className="flex flex-wrap items-center gap-2">
                  <PersonAvatar person={designer} size="sm" />
                  <span className="text-sm font-medium text-foreground">{designer.name}</span>
                  <span className="text-xs text-muted-foreground">{designer.job_title}</span>
                  {isCrossSquadAssignment(project, designer) ? (
                    <Badge variant="outline" className="text-xs">
                      Cross-squad
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </ContentSection>

      <ContentSection
        title="Timeline & Monthly Targets"
        bodyClassName={monthlyTargets.length ? "p-0" : undefined}
      >
        {monthlyTargets.length === 0 ? (
          <EmptyState title="No monthly targets recorded yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyTargets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell className="font-medium text-foreground">
                    {formatMonth(target.month)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{target.phase}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {target.target}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ContentSection>

      {weeklyPlan.length > 0 ? (
        <ContentSection
          title="Weekly Plan"
          description="Secondary to the timeline above: what this project is focusing on week by week."
        >
          <div className="space-y-5">
            {weeklyPlan.map((group) => (
              <div key={group.month} className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">{formatMonthFull(group.month)}</p>
                <div className="space-y-3">
                  {group.weeks.map(({ week, items }) => (
                    <div key={week}>
                      <p className="text-sm font-medium text-foreground">{formatWeekRangeLabel(week)}</p>
                      {phaseByMonth.get(monthOfWeek(week)) ? (
                        <p className="text-xs text-muted-foreground">{phaseByMonth.get(monthOfWeek(week))}</p>
                      ) : null}
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                        {items.map((item) => (
                          <li key={item.id}>{item.title}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ContentSection>
      ) : null}

      <ContentSection title="Metadata">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Created" value={formatDate(project.created_at)} />
          <Field
            label="Updated"
            value={
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Updated {formatRelativeTime(project.updated_at)}
                  <span className="text-muted-foreground"> · {formatDate(project.updated_at)}</span>
                </span>
                {flagReview ? <Badge variant="outline">Needs review</Badge> : null}
              </div>
            }
          />
        </dl>
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

interface PersonInlineProps {
  designer: Designer
  crossSquad: boolean
}

function PersonInline({ designer, crossSquad }: PersonInlineProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <PersonAvatar person={designer} size="sm" />
      {designer.name}
      {crossSquad ? (
        <Badge variant="outline" className="text-xs">
          Cross-squad
        </Badge>
      ) : null}
    </span>
  )
}

interface TimelineConfidenceTagProps {
  confidence: TimelineConfidence
}

/** PRD §12/§31: Committed = solid, Tentative = dashed — pattern is the
 * primary signal, the label text reinforces it; never color alone. */
function TimelineConfidenceTag({ confidence }: TimelineConfidenceTagProps) {
  const isCommitted = confidence === "Committed"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        isCommitted
          ? "border-border text-foreground"
          : "border-muted-foreground/40 text-muted-foreground"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-0 w-3 border-t-2",
          isCommitted ? "border-solid border-foreground" : "border-dashed border-muted-foreground"
        )}
      />
      {confidence}
    </span>
  )
}
