// Add/Edit Project — Step 4: Review (docs/PRD.MD §24).
//
// Read-only on purpose. This step exists to catch a wrong Epic or a slipped
// end date before the project is created, and a screen full of live controls
// is a worse place to notice that than a screen of plain values. Anything
// wrong is fixed where it was entered — each section's Edit goes back to the
// step that owns it, which is also why the sections are named after the
// sections in Steps 1-3 rather than after the database columns.

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HealthBadge } from "@/components/shared/health-badge"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { WizardSection, WizardSections } from "./wizard-section"
import { formatWeekRangeLabel } from "@/lib/domain/weekUtils"
import type { Department, Designer, Epic, Squad, Stakeholder } from "@/lib/domain/types"
import { formatDateLabel, formatMonthLabel } from "./project-form-types"
import type { ProjectFormState } from "./project-form-types"
import type { ReactNode } from "react"

interface StepReviewProps {
  form: ProjectFormState
  epics: Epic[]
  departments: Department[]
  squads: Squad[]
  stakeholders: Stakeholder[]
  designers: Designer[]
  /** What department_head_id will actually be saved (docs/PRD.MD §25 snapshot rule) — resolved by the wizard, not re-derived here. */
  departmentHeadName: string | null
  /** Health is only part of the summary when it was part of the form (docs/DECISIONS.md). */
  showHealth: boolean
  /** Jump back to the step that owns a section. */
  onEditStep: (step: number) => void
}

function StepReview({
  form,
  epics,
  departments,
  squads,
  stakeholders,
  designers,
  departmentHeadName,
  showHealth,
  onEditStep,
}: StepReviewProps) {
  const epic = epics.find((e) => e.id === form.context.epicId)
  const department = departments.find((d) => d.id === form.context.departmentId)
  const squad = squads.find((s) => s.id === form.context.ownerSquadId)
  const productOwners = stakeholders.filter((s) => form.context.productOwnerIds.includes(s.id))
  const projectAdmins = stakeholders.filter((s) => form.context.projectAdminIds.includes(s.id))
  const lead = form.team.leadDesignerId
    ? designers.find((d) => d.id === form.team.leadDesignerId)
    : undefined
  const support = designers.filter((d) => form.team.supportDesignerIds.includes(d.id))
  const targetRows = form.monthlyTargets.filter((row) => row.phase !== null || row.target.trim() !== "")
  const focusItems = [...form.weeklyFocus]
    .filter((item) => item.title.trim() !== "")
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))

  return (
    <WizardSections>
      <WizardSection
        title="Project Details"
        description="What this project is, and where it belongs."
        aside={<EditLink section="project details" onClick={() => onEditStep(1)} />}
      >
        <ReviewGrid>
          <ReviewItem label="Project Name" value={form.context.name || "—"} />
          <ReviewItem label="Epic" value={epic?.name ?? "—"} />
          <ReviewItem label="Department" value={department?.name ?? "—"} />
          <ReviewItem label="Department Head" value={departmentHeadName ?? "None"} />
        </ReviewGrid>
        {form.context.description ? (
          <ReviewItem label="Description" value={form.context.description} />
        ) : null}
      </WizardSection>

      <WizardSection
        title="Ownership"
        description="Who owns this project, and which squad is responsible."
        aside={<EditLink section="ownership" onClick={() => onEditStep(1)} />}
      >
        <ReviewGrid>
          <ReviewItem
            label="Product Owner"
            value={productOwners.length ? productOwners.map((s) => s.name).join(", ") : "—"}
          />
          <ReviewItem
            label="Project Admin / PIC"
            value={projectAdmins.length ? projectAdmins.map((s) => s.name).join(", ") : "None"}
          />
          <ReviewItem label="Owner Squad" value={squad?.name ?? "—"} />
        </ReviewGrid>
      </WizardSection>

      <WizardSection
        title="Project Classification"
        description="How this project will be prioritized and tracked."
        aside={<EditLink section="project classification" onClick={() => onEditStep(1)} />}
      >
        <ReviewGrid>
          <ReviewItem label="Priority" value={<PriorityBadge priority={form.context.priority} />} />
          <ReviewItem label="Status" value={<StatusBadge status={form.context.status} />} />
          <ReviewItem
            label="Timeline Confidence"
            value={
              <Badge variant="outline" className="font-normal">
                {form.context.timelineConfidence}
              </Badge>
            }
          />
          {showHealth ? (
            <ReviewItem label="Project Health" value={<HealthBadge health={form.context.health} />} />
          ) : null}
        </ReviewGrid>
      </WizardSection>

      <WizardSection
        title="Timeline & Planning"
        description="When this project runs, and what each month should achieve."
        aside={<EditLink section="timeline and planning" onClick={() => onEditStep(2)} />}
      >
        <ReviewGrid>
          <ReviewItem label="Start Date" value={form.startDate ? formatDateLabel(form.startDate) : "—"} />
          <ReviewItem label="Target End Date" value={form.endDate ? formatDateLabel(form.endDate) : "—"} />
        </ReviewGrid>

        <ReviewList
          label="Monthly Targets"
          emptyMessage="No monthly targets set."
          rows={targetRows.map((row) => ({
            key: row.month,
            term: formatMonthLabel(row.month),
            detail: `${row.phase ?? "No phase"}${row.target ? ` · ${row.target}` : ""}`,
          }))}
        />

        {focusItems.length > 0 ? (
          <ReviewList
            label="Weekly Focus"
            emptyMessage=""
            rows={focusItems.map((item) => ({
              key: item.key,
              term: formatWeekRangeLabel(item.weekStartDate),
              detail: item.title,
            }))}
          />
        ) : null}
      </WizardSection>

      <WizardSection
        title="Design Team"
        description="Who will design it, and how design ownership is distributed."
        aside={<EditLink section="design team" onClick={() => onEditStep(3)} />}
      >
        <ReviewItem
          label="Design Lead"
          value={
            lead ? (
              <span className="flex items-center gap-2">
                <PersonAvatar person={lead} size="sm" />
                {lead.name}
              </span>
            ) : (
              // Not an error (PRD §24) — a project with no Lead is Unassigned.
              "Unassigned"
            )
          }
        />
        <ReviewItem
          label="Supporting Designers"
          value={
            support.length ? (
              <ul className="space-y-1.5">
                {support.map((designer) => (
                  <li key={designer.id} className="flex items-center gap-2">
                    <PersonAvatar person={designer} size="sm" />
                    <span>{designer.name}</span>
                    <span className="text-xs text-muted-foreground">{designer.job_title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              "None"
            )
          }
        />
      </WizardSection>
    </WizardSections>
  )
}

/** Names the section it belongs to for screen readers — five "Edit"s on one page otherwise. */
function EditLink({ section, onClick }: { section: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={onClick}
      aria-label={`Edit ${section}`}
      className="h-auto px-0"
    >
      Edit
    </Button>
  )
}

function ReviewGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">{children}</dl>
}

function ReviewItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}

function ReviewList({
  label,
  rows,
  emptyMessage,
}: {
  label: string
  rows: { key: string; term: string; detail: string }[]
  emptyMessage: string
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="font-medium text-foreground">{row.term}</span>
              <span className="text-muted-foreground">{row.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { StepReview }
export type { StepReviewProps }
