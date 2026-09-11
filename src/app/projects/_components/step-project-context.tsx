// Add/Edit Project — Step 1: Project Context (docs/PRD.MD §21).

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelectChecklist } from "./multi-select-checklist"
import { activeOrSelected, byName } from "./project-form-types"
import type { ProjectContextFormState } from "./project-form-types"
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
}

function StepProjectContext({
  value,
  onChange,
  epics,
  departments,
  squads,
  stakeholders,
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
  ).sort(byName)
  const projectAdminOptions = activeOrSelected(
    stakeholders.filter((s) => s.stakeholder_type === "Project Admin / PIC"),
    value.projectAdminIds,
  ).sort(byName)

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
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="project-name">Project Name *</Label>
        <Input
          id="project-name"
          value={value.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="e.g. Trade Finance Platform Revamp"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-epic">Epic *</Label>
          <Select value={value.epicId} onValueChange={(epicId) => handleEpicChange(epicId ?? "")}>
            <SelectTrigger id="project-epic" className="w-full">
              <SelectValue placeholder="Select an epic" />
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-department">Department *</Label>
          <Select
            value={value.departmentId}
            onValueChange={(departmentId) => onChange({ departmentId: departmentId ?? "" })}
          >
            <SelectTrigger id="project-department" className="w-full">
              <SelectValue placeholder="Select a department" />
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
        </div>
      </div>

      {value.departmentId ? (
        <p className="text-sm text-muted-foreground">
          Department Head: {departmentHead ? `Auto-filled: ${departmentHead.name}` : "None set for this department"}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Product Owner *</Label>
          <MultiSelectChecklist
            idPrefix="product-owner"
            options={productOwnerOptions.map((s) => ({ id: s.id, label: s.name, description: s.title }))}
            selectedIds={value.productOwnerIds}
            onChange={(ids) => onChange({ productOwnerIds: ids })}
            emptyMessage="No active Product Owner stakeholders yet. Add one in Master Data first."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Project Admin / PIC</Label>
          <MultiSelectChecklist
            idPrefix="project-admin"
            options={projectAdminOptions.map((s) => ({ id: s.id, label: s.name, description: s.title }))}
            selectedIds={value.projectAdminIds}
            onChange={(ids) => onChange({ projectAdminIds: ids })}
            emptyMessage="No active Project Admin / PIC stakeholders yet."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="project-priority">Priority *</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-status">Status *</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-health">Project Health</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-timeline-confidence">Timeline Confidence *</Label>
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
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-owner-squad">Owner Squad *</Label>
        <Select
          value={value.ownerSquadId}
          onValueChange={(ownerSquadId) => onChange({ ownerSquadId: ownerSquadId ?? "" })}
        >
          <SelectTrigger id="project-owner-squad" className="w-full">
            <SelectValue placeholder="Select the owning squad" />
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="What is this project about? (optional)"
        />
      </div>
    </div>
  )
}

export { StepProjectContext }
export type { StepProjectContextProps }
