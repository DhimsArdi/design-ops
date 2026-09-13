"use client"

// Shared 4-step Add/Edit Project flow (docs/PRD.MD §20-25), used by both
// /projects/new (mode="create") and /projects/[id]/edit (mode="edit") so
// the step UI is built once. See each step-*.tsx file for its own field
// list; this file owns the wizard's state, step navigation, master-data
// loading, and the create/update + assignment/monthly-target reconciliation
// on submit.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { cn } from "cn"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"
import * as projectMonthlyTargetRepository from "@/lib/repositories/projectMonthlyTargetRepository"
import * as projectWeeklyFocusRepository from "@/lib/repositories/projectWeeklyFocusRepository"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"

import { getDepartmentHead } from "@/lib/selectors/departmentSelectors"
import { getProjectAssignments, getProjectWeeklyFocus } from "@/lib/selectors/projectSelectors"

import type {
  Department,
  Designer,
  Epic,
  Project,
  ProjectAssignment,
  ProjectMonthlyTarget,
  ProjectWeeklyFocus,
  Squad,
  Stakeholder,
} from "@/lib/domain/types"

import {
  buildFormStateFromProject,
  emptyProjectFormState,
  toPersistableRows,
  toPersistableWeeklyFocus,
  type MonthlyTargetRowState,
  type ProjectFormState,
  type WeeklyFocusItemState,
} from "./project-form-types"
import { StepProjectContext } from "./step-project-context"
import { StepTimelinePlanning } from "./step-timeline-planning"
import { StepDesignTeam } from "./step-design-team"
import { StepReview } from "./step-review"

const STEP_LABELS = ["Project Context", "Timeline & Planning", "Design Team", "Review"] as const
const STEP_COUNT = STEP_LABELS.length

interface Lookups {
  epics: Epic[]
  departments: Department[]
  squads: Squad[]
  stakeholders: Stakeholder[]
  designers: Designer[]
}

interface ProjectFormWizardProps {
  mode: "create" | "edit"
  /** Required when mode === "edit". */
  projectId?: string
}

function ProjectFormWizard({ mode, projectId }: ProjectFormWizardProps) {
  const router = useRouter()

  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "not-found">(
    mode === "edit" ? "loading" : "ready",
  )
  const [form, setForm] = useState<ProjectFormState>(() => emptyProjectFormState())
  const [originalProject, setOriginalProject] = useState<Project | null>(null)
  const [originalAssignments, setOriginalAssignments] = useState<ProjectAssignment[]>([])
  const [originalMonthlyTargets, setOriginalMonthlyTargets] = useState<ProjectMonthlyTarget[]>([])
  const [originalWeeklyFocus, setOriginalWeeklyFocus] = useState<ProjectWeeklyFocus[]>([])
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // One-time read on mount, deliberately not a subscription: these are the
    // form's dropdown options, and having them change under the user
    // mid-edit — because someone else added a department — would be worse
    // than showing the set they started with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLookups({
      epics: epicRepository.getAll(),
      departments: departmentRepository.getAll(),
      squads: squadRepository.getAll(),
      stakeholders: stakeholderRepository.getAll(),
      designers: designerRepository.getAll(),
    })

    if (mode !== "edit" || !projectId) return

    const project = projectRepository.getById(projectId)
    if (!project) {
      setLoadStatus("not-found")
      return
    }

    const assignments = getProjectAssignments(projectId)
    const monthlyTargets = projectMonthlyTargetRepository
      .getAll()
      .filter((target) => target.project_id === projectId)
    const weeklyFocus = getProjectWeeklyFocus(projectId)

    setForm(buildFormStateFromProject(project, assignments, monthlyTargets, weeklyFocus))
    setOriginalProject(project)
    setOriginalAssignments(assignments)
    setOriginalMonthlyTargets(monthlyTargets)
    setOriginalWeeklyFocus(weeklyFocus)
    setLoadStatus("ready")
  }, [mode, projectId])

  const cancelHref = mode === "edit" && projectId ? `/projects/${projectId}` : "/projects"

  if (loadStatus === "loading" || lookups === null) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Project" description="Loading project…" />
      </div>
    )
  }

  if (loadStatus === "not-found") {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Project" />
        <ContentSection>
          <EmptyState
            title="Project not found"
            description="This project may have been archived or removed. Go back to the Projects list."
            action={
              <Button render={<Link href="/projects" />} nativeButton={false}>
                Back to Projects
              </Button>
            }
          />
        </ContentSection>
      </div>
    )
  }

  function updateContext(patch: Partial<ProjectFormState["context"]>) {
    setForm((current) => ({ ...current, context: { ...current.context, ...patch } }))
  }

  function handleRangeCommit(next: {
    startDate: string
    endDate: string
    monthlyRows: MonthlyTargetRowState[]
    weeklyFocus: WeeklyFocusItemState[]
  }) {
    setForm((current) => ({
      ...current,
      startDate: next.startDate,
      endDate: next.endDate,
      monthlyTargets: next.monthlyRows,
      weeklyFocus: next.weeklyFocus,
    }))
  }

  function handleMonthlyRowFieldChange(
    month: string,
    patch: Partial<Pick<MonthlyTargetRowState, "phase" | "target">>,
  ) {
    setForm((current) => ({
      ...current,
      monthlyTargets: current.monthlyTargets.map((row) => (row.month === month ? { ...row, ...patch } : row)),
    }))
  }

  function handleWeeklyFocusAdd(item: WeeklyFocusItemState) {
    setForm((current) => ({ ...current, weeklyFocus: [...current.weeklyFocus, item] }))
  }

  function handleWeeklyFocusRemove(key: string) {
    setForm((current) => ({
      ...current,
      weeklyFocus: current.weeklyFocus.filter((item) => item.key !== key),
    }))
  }

  function handleLeadChange(leadId: string | null) {
    setForm((current) => ({
      ...current,
      team: {
        leadDesignerId: leadId,
        // No duplicate designer across Lead + Support (PRD §8.7): if this
        // designer was already a Support pick, promoting them to Lead drops
        // the Support row.
        supportDesignerIds: current.team.supportDesignerIds.filter((id) => id !== leadId),
      },
    }))
  }

  function handleSupportChange(ids: string[]) {
    setForm((current) => ({ ...current, team: { ...current.team, supportDesignerIds: ids } }))
  }

  const step1Valid =
    form.context.name.trim() !== "" &&
    form.context.epicId !== "" &&
    form.context.departmentId !== "" &&
    form.context.productOwnerIds.length > 0 &&
    form.context.ownerSquadId !== ""

  const step2Valid =
    form.startDate !== "" && form.endDate !== "" && form.startDate <= form.endDate

  const canGoNext = step === 1 ? step1Valid : step === 2 ? step2Valid : true

  // Names every still-missing required field so a disabled Next button never
  // looks simply dead (antislop-human: a disabled control needs a reason).
  const missingFields: string[] = []
  if (step === 1) {
    if (form.context.name.trim() === "") missingFields.push("Project Name")
    if (form.context.epicId === "") missingFields.push("Epic")
    if (form.context.departmentId === "") missingFields.push("Department")
    if (form.context.productOwnerIds.length === 0) missingFields.push("Product Owner")
    if (form.context.ownerSquadId === "") missingFields.push("Owner Squad")
  } else if (step === 2) {
    if (form.startDate === "" || form.endDate === "") missingFields.push("Start and end date")
    else if (form.startDate > form.endDate) missingFields.push("An end date on or after the start date")
  }

  function goNext() {
    if (!canGoNext) return
    setStep((current) => Math.min(STEP_COUNT, current + 1))
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1))
  }

  // department_head_id is a snapshot (§8.6): re-derived from the currently
  // selected Department whenever it differs from the project's original
  // Department (create mode always derives fresh, since there is no
  // "original" yet); otherwise the original snapshot is preserved untouched,
  // even if that department's live head has since changed (§25, DECISIONS.md).
  const departmentChanged =
    mode === "create" || !originalProject || form.context.departmentId !== originalProject.department_id
  const departmentHeadId = departmentChanged
    ? (getDepartmentHead(form.context.departmentId)?.id ?? null)
    : originalProject!.department_head_id
  const departmentHeadName = departmentHeadId
    ? (lookups.stakeholders.find((s) => s.id === departmentHeadId)?.name ?? null)
    : null

  function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)

    const now = new Date().toISOString()
    const basePayload = {
      name: form.context.name.trim(),
      epic_id: form.context.epicId,
      department_id: form.context.departmentId,
      department_head_id: departmentHeadId,
      product_owner_ids: form.context.productOwnerIds,
      project_admin_ids: form.context.projectAdminIds,
      owner_squad_id: form.context.ownerSquadId,
      priority: form.context.priority,
      status: form.context.status,
      health: form.context.health,
      timeline_confidence: form.context.timelineConfidence,
      start_date: form.startDate,
      end_date: form.endDate,
      description: form.context.description.trim(),
    }
    const finalRows = toPersistableRows(form.monthlyTargets)
    const finalWeeklyFocus = toPersistableWeeklyFocus(form.weeklyFocus)

    if (mode === "create") {
      const project = projectRepository.create({
        ...basePayload,
        is_archived: false,
        completed_at: null,
        created_at: now,
        updated_at: now,
      })

      if (form.team.leadDesignerId) {
        projectAssignmentRepository.create({
          project_id: project.id,
          designer_id: form.team.leadDesignerId,
          project_role: "Lead",
        })
      }
      for (const designerId of form.team.supportDesignerIds) {
        projectAssignmentRepository.create({
          project_id: project.id,
          designer_id: designerId,
          project_role: "Support",
        })
      }
      for (const row of finalRows) {
        projectMonthlyTargetRepository.create({ project_id: project.id, ...row })
      }
      for (const item of finalWeeklyFocus) {
        projectWeeklyFocusRepository.create({
          project_id: project.id,
          week_start_date: item.weekStartDate,
          title: item.title,
          description: item.description || undefined,
        })
      }

      toast.success(`${basePayload.name} created`)
      router.push(`/projects/${project.id}`)
      return
    }

    if (!projectId) return
    projectRepository.update(projectId, { ...basePayload, updated_at: now })

    // Reconcile ProjectAssignment rows against what was originally loaded
    // (nothing here has been persisted yet, so `originalAssignments` is
    // still an accurate "before" snapshot to diff against).
    const desiredAssignments = [
      ...(form.team.leadDesignerId ? [{ designerId: form.team.leadDesignerId, role: "Lead" as const }] : []),
      ...form.team.supportDesignerIds.map((id) => ({ designerId: id, role: "Support" as const })),
    ]
    for (const assignment of originalAssignments) {
      const stillWanted = desiredAssignments.some(
        (desired) => desired.designerId === assignment.designer_id && desired.role === assignment.project_role,
      )
      if (!stillWanted) projectAssignmentRepository.remove(assignment.id)
    }
    for (const desired of desiredAssignments) {
      const alreadyExists = originalAssignments.some(
        (assignment) => assignment.designer_id === desired.designerId && assignment.project_role === desired.role,
      )
      if (!alreadyExists) {
        projectAssignmentRepository.create({
          project_id: projectId,
          designer_id: desired.designerId,
          project_role: desired.role,
        })
      }
    }

    // Reconcile ProjectMonthlyTarget rows the same way — diffed against the
    // originally-loaded rows, one per (project_id, month).
    const finalMonths = new Set(finalRows.map((row) => row.month))
    for (const original of originalMonthlyTargets) {
      if (!finalMonths.has(original.month)) projectMonthlyTargetRepository.remove(original.id)
    }
    for (const row of finalRows) {
      const existing = originalMonthlyTargets.find((target) => target.month === row.month)
      if (existing) {
        projectMonthlyTargetRepository.update(existing.id, { phase: row.phase, target: row.target })
      } else {
        projectMonthlyTargetRepository.create({ project_id: projectId, ...row })
      }
    }

    // Reconcile ProjectWeeklyFocus rows by id — unlike monthly targets, a
    // week can hold multiple items, so identity is the row id, not the week.
    const finalWeeklyFocusIds = new Set(finalWeeklyFocus.map((item) => item.id).filter(Boolean))
    for (const original of originalWeeklyFocus) {
      if (!finalWeeklyFocusIds.has(original.id)) projectWeeklyFocusRepository.remove(original.id)
    }
    for (const item of finalWeeklyFocus) {
      if (item.id) {
        projectWeeklyFocusRepository.update(item.id, {
          week_start_date: item.weekStartDate,
          title: item.title,
          description: item.description || undefined,
        })
      } else {
        projectWeeklyFocusRepository.create({
          project_id: projectId,
          week_start_date: item.weekStartDate,
          title: item.title,
          description: item.description || undefined,
        })
      }
    }

    toast.success(`${basePayload.name} updated`)
    router.push(`/projects/${projectId}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "Add Project" : `Edit ${originalProject?.name ?? "Project"}`}
        description={
          mode === "create"
            ? "Create a new project in four steps."
            : "Update this project's details, team, and timeline."
        }
        actions={
          <Button variant="outline" render={<Link href={cancelHref} />} nativeButton={false}>
            Cancel
          </Button>
        }
      />

      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isCurrent = stepNumber === step
          const isComplete = stepNumber < step
          return (
            <li key={label} className="flex items-center gap-1.5">
              {index > 0 ? <span className="text-muted-foreground/50">/</span> : null}
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                  isCurrent ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[10px]",
                    isCurrent
                      ? "bg-primary-foreground text-primary"
                      : isComplete
                        ? "bg-foreground/10 text-foreground"
                        : "border border-current",
                  )}
                >
                  {isComplete ? <Check className="size-3" /> : stepNumber}
                </span>
                {label}
              </span>
            </li>
          )
        })}
      </ol>

      <ContentSection title={`Step ${step} of ${STEP_COUNT}: ${STEP_LABELS[step - 1]}`}>
        {step === 1 ? (
          <StepProjectContext
            value={form.context}
            onChange={updateContext}
            epics={lookups.epics}
            departments={lookups.departments}
            squads={lookups.squads}
            stakeholders={lookups.stakeholders}
          />
        ) : null}
        {step === 2 ? (
          <StepTimelinePlanning
            startDate={form.startDate}
            endDate={form.endDate}
            monthlyRows={form.monthlyTargets}
            weeklyFocus={form.weeklyFocus}
            onRangeCommit={handleRangeCommit}
            onMonthlyRowFieldChange={handleMonthlyRowFieldChange}
            onWeeklyFocusAdd={handleWeeklyFocusAdd}
            onWeeklyFocusRemove={handleWeeklyFocusRemove}
          />
        ) : null}
        {step === 3 ? (
          <StepDesignTeam
            ownerSquadId={form.context.ownerSquadId}
            leadDesignerId={form.team.leadDesignerId}
            supportDesignerIds={form.team.supportDesignerIds}
            onLeadChange={handleLeadChange}
            onSupportChange={handleSupportChange}
            designers={lookups.designers}
            squads={lookups.squads}
          />
        ) : null}
        {step === 4 ? (
          <StepReview
            form={form}
            epics={lookups.epics}
            departments={lookups.departments}
            squads={lookups.squads}
            stakeholders={lookups.stakeholders}
            designers={lookups.designers}
            departmentHeadName={departmentHeadName}
          />
        ) : null}
      </ContentSection>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!canGoNext && missingFields.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Required to continue: {missingFields.join(", ")}
            </p>
          ) : null}
          {step < STEP_COUNT ? (
            <Button type="button" onClick={goNext} disabled={!canGoNext}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {mode === "create" ? "Create Project" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export { ProjectFormWizard }
export type { ProjectFormWizardProps }
