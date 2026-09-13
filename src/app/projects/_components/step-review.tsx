// Add/Edit Project — Step 4: Review (docs/PRD.MD §24). Read-only summary of
// everything entered in Steps 1-3, shaped after the PRD's own example.

import { HealthBadge } from "@/components/shared/health-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Department, Designer, Epic, Squad, Stakeholder } from "@/lib/domain/types"
import { formatDateLabel, formatMonthLabel } from "./project-form-types"
import type { ProjectFormState } from "./project-form-types"

interface StepReviewProps {
  form: ProjectFormState
  epics: Epic[]
  departments: Department[]
  squads: Squad[]
  stakeholders: Stakeholder[]
  designers: Designer[]
  /** What department_head_id will actually be saved (docs/PRD.MD §25 snapshot rule) — resolved by the wizard, not re-derived here. */
  departmentHeadName: string | null
}

function StepReview({
  form,
  epics,
  departments,
  squads,
  stakeholders,
  designers,
  departmentHeadName,
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{form.context.name || "Untitled project"}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={form.context.priority} />
          <StatusBadge status={form.context.status} />
          <HealthBadge health={form.context.health} />
          <span className="text-sm text-muted-foreground">{form.context.timelineConfidence}</span>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReviewItem label="Epic" value={epic?.name ?? "–"} />
        <ReviewItem label="Department" value={department?.name ?? "–"} />
        <ReviewItem label="Department Head" value={departmentHeadName ?? "None"} />
        <ReviewItem label="Owner Squad" value={squad?.name ?? "–"} />
        <ReviewItem
          label="Product Owner"
          value={productOwners.length ? productOwners.map((s) => s.name).join(", ") : "None"}
        />
        <ReviewItem
          label="Project Admin / PIC"
          value={projectAdmins.length ? projectAdmins.map((s) => s.name).join(", ") : "None"}
        />
      </dl>

      {form.context.description ? <ReviewItem label="Description" value={form.context.description} /> : null}

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReviewItem label="Design Lead" value={lead ? lead.name : "Unassigned"} />
        <ReviewItem label="Supporting" value={support.length ? support.map((d) => d.name).join(", ") : "None"} />
      </dl>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {form.startDate && form.endDate
            ? `${formatDateLabel(form.startDate)} – ${formatDateLabel(form.endDate)}`
            : "No timeline set"}
        </p>
        {targetRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No monthly targets set.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {targetRows.map((row) => (
              <li key={row.month} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="font-medium text-foreground">{formatMonthLabel(row.month)}</span>
                <span className="text-muted-foreground">
                  {row.phase ?? "No phase"}
                  {row.target ? ` – ${row.target}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  )
}

export { StepReview }
export type { StepReviewProps }
