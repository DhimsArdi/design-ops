"use client"

// Project Detail (PRD §14.4) — a Project Control Page: what/where/who/when
// for one project, scannable in a few seconds, not a database record dump.
// One primary content surface (Overview / Design Team / Timeline & Monthly
// Targets / Weekly Plan, separated by subtle dividers and typography, not
// stacked cards) plus a lightweight "Project Details" footer for metadata.
//
// Lifecycle actions (Mark as complete / Put on hold / Cancel / Reopen /
// Archive / Delete) live in the header's overflow menu, contextual on the
// project's current status — see docs/PRD.MD §25 and docs/DECISIONS.md for
// why Archive stays a separate concept from Status.
//
// Reads go straight through the repository/selector layer rather than the
// useRepositoryList hook: this page needs one record by id plus several
// small derived lookups, not a reactive list. To avoid an SSR/client
// hydration mismatch (the cache is browser-only), data starts as `undefined`
// ("loading") and is filled in a mount effect that then stays subscribed to
// the store — the same pattern used by app/overview/page.tsx.

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Info,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { HealthBadge } from "@/components/shared/health-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { AssignLeadControl } from "@/components/shared/assign-lead-control"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DeleteEntityDialog } from "@/components/shared/delete-entity-dialog"
import { MarkCompleteDialog } from "./mark-complete-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { subscribe } from "@/lib/store/dataStore"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
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
  /** Candidates for the inline "Assign" Design Lead control when unassigned. */
  designers: Designer[]
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
    designers: designerRepository.getAll(),
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
  const router = useRouter()
  const [data, setData] = useState<ProjectDetailData | null | undefined>(undefined)

  const [markCompleteOpen, setMarkCompleteOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(() => {
    setData(loadProjectDetail(projectId))
  }, [projectId])

  useEffect(() => {
    // Subscribes to the store rather than to one repository's list, because
    // this view joins project, epic, department, squad, assignment, target and
    // weekly-focus data. Re-reads on every change, including edits made by
    // other people (docs/DECISIONS.md).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return subscribe(load)
  }, [load])

  // `message` is optional because MarkCompleteDialog passes this straight in as
  // its onCompleted callback and raises its own toast.
  function applyUpdate(updated: Project | undefined, message?: string) {
    if (!updated) return
    setData((current) => (current ? { ...current, project: updated } : current))
    if (message) toast.success(message)
  }

  function handleUnarchive() {
    if (!data) return
    applyUpdate(projectRepository.unarchive(data.project.id), `${data.project.name} restored from archive`)
  }

  function handleArchiveConfirm() {
    if (!data) return
    applyUpdate(projectRepository.archive(data.project.id), `${data.project.name} archived`)
  }

  function handlePutOnHold() {
    if (!data) return
    applyUpdate(projectRepository.update(data.project.id, { status: "On Hold" }), `${data.project.name} put on hold`)
  }

  function handleResume() {
    if (!data) return
    applyUpdate(projectRepository.update(data.project.id, { status: "In Progress" }), `${data.project.name} resumed`)
  }

  function handleReopen() {
    if (!data) return
    applyUpdate(
      projectRepository.update(data.project.id, { status: "In Progress", completed_at: null }),
      `${data.project.name} reopened`
    )
  }

  function handleCancelConfirm() {
    if (!data) return
    applyUpdate(projectRepository.update(data.project.id, { status: "Cancelled" }), `${data.project.name} cancelled`)
  }

  function handleDeleteConfirm() {
    if (!data) return
    const { name } = data.project
    projectRepository.removeCascade(data.project.id)
    toast.success(`${name} deleted`)
    router.push("/projects")
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
    designers,
  } = data
  const weeklyPlan = groupWeeklyFocusByMonth(weeklyFocus)
  const phaseByMonth = new Map(monthlyTargets.map((target) => [target.month, target.phase]))

  const flagReview = isNeedsReview(project)
  const isOnHold = project.status === "On Hold"
  const isTerminal = project.status === "Completed" || project.status === "Cancelled"

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
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
                <MoreHorizontal />
                <span className="sr-only">More project actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto min-w-[280px] [&_[data-slot=dropdown-menu-item]]:whitespace-nowrap">
                {isTerminal ? (
                  <DropdownMenuItem onClick={handleReopen}>
                    <RotateCcw />
                    Reopen project
                  </DropdownMenuItem>
                ) : (
                  <>
                    {isOnHold ? (
                      <DropdownMenuItem onClick={handleResume}>
                        <RotateCcw />
                        Resume project
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => setMarkCompleteOpen(true)}>
                      <CheckCircle2 />
                      Mark as complete
                    </DropdownMenuItem>
                    {!isOnHold ? (
                      <DropdownMenuItem onClick={handlePutOnHold}>
                        <PauseCircle />
                        Put on hold
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => setCancelConfirmOpen(true)}>
                      <Ban />
                      Cancel project
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={project.is_archived ? handleUnarchive : () => setArchiveConfirmOpen(true)}
                >
                  {project.is_archived ? <ArchiveRestore /> : <Archive />}
                  {project.is_archived ? "Unarchive project" : "Archive project"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          {formatDate(project.start_date)} – {formatDate(project.end_date)}
        </span>
      </div>

      <ContentSection>
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Overview</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Epic" value={epic?.name ?? "Not set"} />
            <Field label="Department" value={department?.name ?? "Not set"} />
            <Field
              label="Product Owner"
              value={productOwners.length ? productOwners.map((s) => s.name).join(", ") : "Not assigned"}
            />
            <Field
              label={
                <span className="inline-flex items-center gap-1">
                  Department Head
                  <Tooltip>
                    <TooltipTrigger
                      render={<button type="button" className="text-muted-foreground/70 hover:text-muted-foreground" />}
                    >
                      <Info className="size-3.5" />
                      <span className="sr-only">About Department Head</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Snapshot at project creation — may differ from the department&apos;s current head.
                    </TooltipContent>
                  </Tooltip>
                </span>
              }
              value={departmentHead?.name ?? "Not assigned"}
            />
            <Field
              label="Project Admin / PIC"
              value={projectAdmins.length ? projectAdmins.map((s) => s.name).join(", ") : "Not assigned"}
            />
          </dl>
        </div>

        <Separator className="my-6" />

        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Design Team</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Owner Squad" value={ownerSquad?.name ?? "Not set"} />
            <Field
              label="Squad Lead"
              value={
                squadLead ? (
                  <span className="inline-flex items-center gap-2">
                    <PersonAvatar person={squadLead} size="sm" />
                    {squadLead.name}
                  </span>
                ) : (
                  "Not assigned"
                )
              }
            />
            <Field
              label="Design Lead"
              value={
                projectLead ? (
                  <PersonInline
                    designer={projectLead}
                    crossSquad={isCrossSquadAssignment(project, projectLead)}
                  />
                ) : (
                  <AssignLeadControl
                    projectId={project.id}
                    lead={undefined}
                    designers={designers}
                    onAssigned={load}
                  />
                )
              }
            />
          </dl>

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
            <Link
              href={`/projects/${project.id}/edit`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-3.5" />
              Add designer
            </Link>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Timeline & Monthly Targets</h2>
          {monthlyTargets.length === 0 ? (
            <EmptyState
              title="No monthly targets yet"
              description="Break the project timeline into monthly outcomes so the team can see what is expected each month."
              action={
                <Button variant="outline" render={<Link href={`/projects/${project.id}/edit`} />} nativeButton={false}>
                  <Plus />
                  Add monthly target
                </Button>
              }
            />
          ) : (
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain scrollbar-themed pb-2">
              {monthlyTargets.map((target) => (
                <div
                  key={target.id}
                  className="w-44 shrink-0 space-y-2 rounded-md border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{formatMonth(target.month)}</p>
                    <Badge variant="outline" className="shrink-0">
                      {target.phase}
                    </Badge>
                  </div>
                  <div className="h-1 rounded-full bg-primary/60" />
                  <p className="text-xs whitespace-normal text-muted-foreground">{target.target}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {weeklyPlan.length > 0 ? (
          <>
            <Separator className="my-6" />
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">Weekly Plan</h2>
                <p className="text-xs text-muted-foreground">
                  Secondary to the timeline above: what this project is focusing on week by week.
                </p>
              </div>
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
            </div>
          </>
        ) : null}
      </ContentSection>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground/70">Project Details</p>
        <span>Created {formatDate(project.created_at)}</span>
        <span>
          Last updated {formatRelativeTime(project.updated_at)} · {formatDate(project.updated_at)}
        </span>
        {flagReview ? (
          <Badge variant="outline" className="text-xs">
            Needs review
          </Badge>
        ) : null}
      </div>

      <MarkCompleteDialog
        open={markCompleteOpen}
        onOpenChange={setMarkCompleteOpen}
        project={project}
        onCompleted={applyUpdate}
      />

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Archive this project?"
        description="It will be removed from Overview and Timeline, but stays fully accessible from the Projects page. This can be undone at any time."
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Cancel this project?"
        description="Its status becomes Cancelled. Timeline, assignments, and monthly targets are all preserved — this can be reopened later."
        confirmLabel="Cancel project"
        confirmVariant="destructive"
        onConfirm={handleCancelConfirm}
      />

      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityLabel="project"
        entityName={project.name}
        blockers={[]}
        onConfirm={handleDeleteConfirm}
      />
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
