// Add/Edit Project — Step 1: Project Context (docs/PRD.MD §21).
//
// Three sections, in the order the questions get asked: what is this project,
// who owns it, how is it tracked. Same field list as before — the grouping and
// the people pickers are what changed (docs/CHANGELOG.md).

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableMultiSelect } from "@/components/shared/searchable-multi-select"
import { WizardField, WizardFieldRow, WizardSection, WizardSections } from "./wizard-section"
import { activeOrSelected, byName } from "./project-form-types"
import type { ProjectContextErrors, ProjectContextFormState } from "./project-form-types"
import {
  PRIORITIES,
  PROJECT_HEALTHS,
  PROJECT_STATUSES,
  TIMELINE_CONFIDENCES,
  type Priority,
  type ProjectHealth,
  type ProjectStatus,
  type TimelineConfidence,
} from "@/lib/domain/enums"
import { getDepartmentHead } from "@/lib/selectors/departmentSelectors"
import type { Department, Epic, Squad, Stakeholder } from "@/lib/domain/types"

interface StepProjectContextProps {
  value: ProjectContextFormState
  onChange: (patch: Partial<ProjectContextFormState>) => void
  epics: Epic[]
  departments: Department[]
  squads: Squad[]
  stakeholders: Stakeholder[]
  errors: ProjectContextErrors
  /** Project Health is an assessment of a project that is already running, so it
   * is not asked for at creation — only when editing one (docs/DECISIONS.md). */
  showHealth: boolean
}

function StepProjectContext({
  value,
  onChange,
  epics,
  departments,
  squads,
  stakeholders,
  errors,
  showHealth,
}: StepProjectContextProps) {
  const epicOptions = activeOrSelected(epics, value.epicId ? [value.epicId] : []).sort(byName)
  const departmentOptions = activeOrSelected(
    departments,
    value.departmentId ? [value.departmentId] : [],
  ).sort(byName)
  const squadOptions = activeOrSelected(
    squads,
    value.ownerSquadId ? [value.ownerSquadId] : [],
  ).sort(byName)

  const productOwnerOptions = activeOrSelected(
    stakeholders.filter((s) => s.stakeholder_type === "Product Owner"),
    value.productOwnerIds,
  )
    .sort(byName)
    .map((s) => ({ id: s.id, label: s.name, description: s.title }))
  const projectAdminOptions = activeOrSelected(
    stakeholders.filter((s) => s.stakeholder_type === "Project Admin / PIC"),
    value.projectAdminIds,
  )
    .sort(byName)
    .map((s) => ({ id: s.id, label: s.name, description: s.title }))

  // Live preview of what Department Head would auto-fill to for whichever
  // Department is currently selected — the actual stored snapshot decision
  // (whether it's re-derived or the original snapshot is preserved when
  // editing without changing Department) happens once, at submit time, in
  // the wizard (docs/PRD.MD §25, docs/DECISIONS.md).
  const departmentHead = value.departmentId ? getDepartmentHead(value.departmentId) : undefined

  function handleEpicChange(epicId: string) {
    const epic = epics.find((e) => e.id === epicId)
    onChange({
      epicId,
      // Epic prefills Department every time Epic changes, but Department
      // stays independently editable afterward (PRD §21, docs/DECISIONS.md)
      // — this assignment only ever runs on an Epic change, never elsewhere.
      departmentId: epic ? epic.department_id : value.departmentId,
    })
  }

  return (
    <WizardSections>
      <WizardSection
        title="Project Details"
        description="Basic information used to identify and organize this project."
      >
        <WizardField label="Project Name" htmlFor="project-name" required error={errors.name}>
          <Input
            id="project-name"
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="e.g. Trade Finance Platform Revamp"
            aria-invalid={errors.name ? true : undefined}
          />
        </WizardField>

        <WizardFieldRow>
          <WizardField label="Epic" htmlFor="project-epic" required error={errors.epicId}>
            <Select value={value.epicId || null} onValueChange={(epicId) => handleEpicChange(epicId ?? "")}>
              <SelectTrigger id="project-epic" className="w-full" aria-invalid={errors.epicId ? true : undefined}>
                <SelectValue placeholder="Select an epic">
                  {(epicId: string) => epicOptions.find((e) => e.id === epicId)?.name ?? ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {epicOptions.map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    {epic.name}
                    {epic.status === "Inactive" ? " (Inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>

          <WizardField
            label="Department"
            htmlFor="project-department"
            required
            error={errors.departmentId}
            // Department Head is auto-filled and read-only (PRD §21) — said
            // here, next to the field that decides it, rather than as a
            // disabled input pretending to be editable.
            hint={
              value.departmentId
                ? departmentHead
                  ? `Department Head: ${departmentHead.name} (auto-filled)`
                  : "No Department Head set for this department."
                : undefined
            }
          >
            <Select
              value={value.departmentId || null}
              onValueChange={(departmentId) => onChange({ departmentId: departmentId ?? "" })}
            >
              <SelectTrigger
                id="project-department"
                className="w-full"
                aria-invalid={errors.departmentId ? true : undefined}
              >
                <SelectValue placeholder="Select a department">
                  {(departmentId: string) =>
                    departmentOptions.find((d) => d.id === departmentId)?.name ?? ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                    {department.status === "Inactive" ? " (Inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>
        </WizardFieldRow>

        <WizardField label="Description" htmlFor="project-description" optional>
          <Textarea
            id="project-description"
            value={value.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="What is this project about?"
            rows={3}
          />
        </WizardField>
      </WizardSection>

      <WizardSection
        title="Ownership"
        description="Define who owns the project, and which squad is responsible for it."
      >
        <WizardField
          label="Product Owner"
          htmlFor="project-product-owner"
          required
          error={errors.productOwnerIds}
        >
          <SearchableMultiSelect
            id="project-product-owner"
            options={productOwnerOptions}
            selectedIds={value.productOwnerIds}
            onChange={(ids) => onChange({ productOwnerIds: ids })}
            placeholder="Search or select product owner…"
            searchPlaceholder="Search product owners…"
            selectionLabel="Selected"
            emptyMessage="No active Product Owner stakeholders yet. Add one in Master Data first."
            noMatchMessage="No matching product owners."
            invalid={Boolean(errors.productOwnerIds)}
          />
        </WizardField>

        <WizardField label="Project Admin / PIC" htmlFor="project-admin" optional>
          <SearchableMultiSelect
            id="project-admin"
            options={projectAdminOptions}
            selectedIds={value.projectAdminIds}
            onChange={(ids) => onChange({ projectAdminIds: ids })}
            placeholder="Search or select project admin…"
            searchPlaceholder="Search project admins…"
            selectionLabel="Selected"
            emptyMessage="No active Project Admin / PIC stakeholders yet."
            noMatchMessage="No matching project admins."
          />
        </WizardField>

        <WizardField
          label="Owner Squad"
          htmlFor="project-owner-squad"
          required
          error={errors.ownerSquadId}
          hint="Designers from other squads can still be assigned in Step 3."
        >
          <Select
            value={value.ownerSquadId || null}
            onValueChange={(ownerSquadId) => onChange({ ownerSquadId: ownerSquadId ?? "" })}
          >
            <SelectTrigger
              id="project-owner-squad"
              className="w-full"
              aria-invalid={errors.ownerSquadId ? true : undefined}
            >
              <SelectValue placeholder="Select the owning squad">
                {(squadId: string) => squadOptions.find((s) => s.id === squadId)?.name ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {squadOptions.map((squad) => (
                <SelectItem key={squad.id} value={squad.id}>
                  {squad.name}
                  {squad.status === "Inactive" ? " (Inactive)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </WizardField>
      </WizardSection>

      <WizardSection
        title="Project Classification"
        description="Define how this project should be prioritized and tracked."
      >
        <WizardFieldRow>
          <WizardField label="Priority" htmlFor="project-priority" required>
            <Select
              value={value.priority}
              onValueChange={(priority) => onChange({ priority: priority as Priority })}
            >
              <SelectTrigger id="project-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>

          <WizardField label="Status" htmlFor="project-status" required>
            <Select
              value={value.status}
              onValueChange={(status) => onChange({ status: status as ProjectStatus })}
            >
              <SelectTrigger id="project-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>
        </WizardFieldRow>

        <WizardFieldRow>
          <WizardField
            label="Timeline Confidence"
            htmlFor="project-timeline-confidence"
            required
            hint="Tentative dates may still move."
          >
            <Select
              value={value.timelineConfidence}
              onValueChange={(confidence) =>
                onChange({ timelineConfidence: confidence as TimelineConfidence })
              }
            >
              <SelectTrigger id="project-timeline-confidence" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_CONFIDENCES.map((confidence) => (
                  <SelectItem key={confidence} value={confidence}>
                    {confidence}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>

          {showHealth ? (
            <WizardField label="Project Health" htmlFor="project-health">
              <Select
                value={value.health}
                onValueChange={(health) => onChange({ health: health as ProjectHealth })}
              >
                <SelectTrigger id="project-health" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_HEALTHS.map((health) => (
                    <SelectItem key={health} value={health}>
                      {health}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WizardField>
          ) : null}
        </WizardFieldRow>
      </WizardSection>
    </WizardSections>
  )
}

export { StepProjectContext }
export type { StepProjectContextProps }
