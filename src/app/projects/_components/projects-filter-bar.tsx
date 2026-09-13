// Compact enterprise-grade filter toolbar for the Projects list — replaces
// the old two-row bank of equal-weight <Select>s (docs/CHANGELOG.md).
//
// Layout, search box, the "Clear filters" action and the chip row all come
// from the shared <FilterBar> (components/shared/filter-bar.tsx); this file
// only supplies the Projects-specific controls and chip definitions.
//
// Interaction model:
// - Search, Status, Priority, Department are quick filters, always live
//   (every change applies immediately).
// - Epic, Owner Squad, Design Lead, Timeline, Health, and Show archived are
//   "advanced" — staged in the Filters popover and only take effect on
//   Apply (or are cleared immediately by Reset), matching the panel's
//   Reset/Apply footer.
// - Status/Priority/Department are *also* rendered (as live, non-staged
//   rows) at the top of the Filters popover, so they stay reachable once
//   their toolbar button is responsively hidden on narrower layouts — see
//   the `hidden md:…` / `hidden lg:…` classes below.
//
// Every control inside the Filters popover uses `variant="inline"`
// (expands in normal flow, no nested Popover) — nesting a second
// floating/portaled overlay inside this Popover risks the outer one
// treating a click into the nested portal as an outside click and closing
// itself. See filter-multiselect.tsx / filter-select.tsx.

"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { FilterBar } from "@/components/shared/filter-bar"
import { FilterChip } from "@/components/shared/filter-chip"
import { FilterMultiSelect, type FilterMultiSelectOption } from "@/components/shared/filter-multiselect"
import { FilterSelect, type FilterSelectOption } from "@/components/shared/filter-select"

import { PRIORITIES, PROJECT_HEALTHS, PROJECT_STATUSES } from "@/lib/domain/enums"
import type { Priority, ProjectHealth, ProjectStatus } from "@/lib/domain/enums"
import type { Project } from "@/lib/domain/types"
import { UNASSIGNED_DESIGN_LEAD } from "@/lib/selectors/projectSelectors"

type TimelineFilter = "all" | "active" | "upcoming" | "past"

interface ProjectFilters {
  search: string
  status: ProjectStatus[]
  priority: Priority[]
  department: string
  epic: string
  squad: string
  designLead: string
  health: ProjectHealth | "all"
  timeline: TimelineFilter
  showArchived: boolean
}

const DEFAULT_FILTERS: ProjectFilters = {
  search: "",
  status: [],
  priority: [],
  department: "all",
  epic: "all",
  squad: "all",
  designLead: "all",
  health: "all",
  timeline: "all",
  showArchived: false,
}

const STATUS_OPTIONS: FilterMultiSelectOption[] = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: status,
}))
const PRIORITY_OPTIONS: FilterMultiSelectOption[] = PRIORITIES.map((priority) => ({
  value: priority,
  label: priority,
}))
const HEALTH_OPTIONS: FilterSelectOption[] = PROJECT_HEALTHS.map((health) => ({ value: health, label: health }))
const TIMELINE_OPTIONS: FilterSelectOption[] = [
  { value: "active", label: "Active now" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
]

/** "YYYY-MM-DD" for today — the pivot for the Timeline filter's buckets. */
function currentDateKey(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * Buckets a project's start_date/end_date against `todayKey` ("YYYY-MM-DD").
 * Plain string comparison is valid — all three are always zero-padded ISO
 * dates (see docs/DECISIONS.md: no quarter concept, no range picker).
 *
 * Day-accurate since Project moved off month strings: a project that ended on
 * the 3rd now reads "Past" on the 12th, where the old month pivot kept calling
 * it "Active now" until the month turned over.
 */
function getProjectTimelineBucket(project: Project, todayKey: string): "active" | "upcoming" | "past" {
  if (project.start_date > todayKey) return "upcoming"
  if (project.end_date < todayKey) return "past"
  return "active"
}

interface ProjectsFilterBarProps {
  filters: ProjectFilters
  onFiltersChange: (patch: Partial<ProjectFilters>) => void
  onClearAll: () => void
  hasFiltersApplied: boolean
  departmentOptions: FilterSelectOption[]
  epicOptions: FilterSelectOption[]
  squadOptions: FilterSelectOption[]
  designerOptions: FilterSelectOption[]
  /** The Active/Completed tabs already imply a status scope — the granular
   * Status control is only meaningful (and only shown) inside the All tab. */
  hideStatusFilter?: boolean
}

function ProjectsFilterBar({
  filters,
  onFiltersChange,
  onClearAll,
  hasFiltersApplied,
  departmentOptions,
  epicOptions,
  squadOptions,
  designerOptions,
  hideStatusFilter,
}: ProjectsFilterBarProps) {
  const advancedFilterCount = [
    filters.epic !== "all",
    filters.squad !== "all",
    filters.designLead !== "all",
    filters.health !== "all",
    filters.timeline !== "all",
    filters.showArchived,
  ].filter(Boolean).length

  const departmentLabel = departmentOptions.find((option) => option.value === filters.department)?.label
  const epicLabel = epicOptions.find((option) => option.value === filters.epic)?.label
  const squadLabel = squadOptions.find((option) => option.value === filters.squad)?.label
  const designLeadLabel =
    filters.designLead === UNASSIGNED_DESIGN_LEAD
      ? "Unassigned"
      : designerOptions.find((option) => option.value === filters.designLead)?.label
  const timelineLabel = TIMELINE_OPTIONS.find((option) => option.value === filters.timeline)?.label

  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...filters.status.map((status) => ({
      key: `status-${status}`,
      label: `Status: ${status}`,
      onRemove: () => onFiltersChange({ status: filters.status.filter((value) => value !== status) }),
    })),
    ...filters.priority.map((priority) => ({
      key: `priority-${priority}`,
      label: `Priority: ${priority}`,
      onRemove: () => onFiltersChange({ priority: filters.priority.filter((value) => value !== priority) }),
    })),
  ]
  if (filters.department !== "all" && departmentLabel) {
    chips.push({
      key: "department",
      label: `Department: ${departmentLabel}`,
      onRemove: () => onFiltersChange({ department: "all" }),
    })
  }
  if (filters.epic !== "all" && epicLabel) {
    chips.push({ key: "epic", label: `Epic: ${epicLabel}`, onRemove: () => onFiltersChange({ epic: "all" }) })
  }
  if (filters.squad !== "all" && squadLabel) {
    chips.push({
      key: "squad",
      label: `Owner Squad: ${squadLabel}`,
      onRemove: () => onFiltersChange({ squad: "all" }),
    })
  }
  if (filters.designLead !== "all" && designLeadLabel) {
    chips.push({
      key: "designLead",
      label: `Design Lead: ${designLeadLabel}`,
      onRemove: () => onFiltersChange({ designLead: "all" }),
    })
  }
  if (filters.health !== "all") {
    chips.push({ key: "health", label: `Health: ${filters.health}`, onRemove: () => onFiltersChange({ health: "all" }) })
  }
  if (filters.timeline !== "all" && timelineLabel) {
    chips.push({
      key: "timeline",
      label: `Timeline: ${timelineLabel}`,
      onRemove: () => onFiltersChange({ timeline: "all" }),
    })
  }
  if (filters.showArchived) {
    chips.push({ key: "archived", label: "Archived: shown", onRemove: () => onFiltersChange({ showArchived: false }) })
  }

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (value) => onFiltersChange({ search: value }),
        placeholder: "Search projects…",
      }}
      hasFiltersApplied={hasFiltersApplied}
      onClear={onClearAll}
      chips={
        chips.length > 0
          ? chips.map((chip) => <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />)
          : undefined
      }
    >
      {!hideStatusFilter ? (
        <FilterMultiSelect
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.status}
          onChange={(status) => onFiltersChange({ status: status as ProjectStatus[] })}
          className="hidden md:inline-flex"
        />
      ) : null}
      <FilterMultiSelect
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priority}
        onChange={(priority) => onFiltersChange({ priority: priority as Priority[] })}
        className="hidden md:inline-flex"
      />
      <FilterSelect
        label="Department"
        allLabel="All departments"
        triggerPlaceholder="Department"
        options={departmentOptions}
        value={filters.department}
        onChange={(department) => onFiltersChange({ department })}
        className="hidden lg:inline-flex"
      />

      <AdvancedFiltersPopover
        filters={filters}
        onFiltersChange={onFiltersChange}
        advancedFilterCount={advancedFilterCount}
        departmentOptions={departmentOptions}
        epicOptions={epicOptions}
        squadOptions={squadOptions}
        designerOptions={designerOptions}
        hideStatusFilter={hideStatusFilter}
      />
    </FilterBar>
  )
}

interface AdvancedDraft {
  epic: string
  squad: string
  designLead: string
  health: ProjectHealth | "all"
  timeline: TimelineFilter
  showArchived: boolean
}

const RESET_DRAFT: AdvancedDraft = {
  epic: "all",
  squad: "all",
  designLead: "all",
  health: "all",
  timeline: "all",
  showArchived: false,
}

function draftFromFilters(filters: ProjectFilters): AdvancedDraft {
  return {
    epic: filters.epic,
    squad: filters.squad,
    designLead: filters.designLead,
    health: filters.health,
    timeline: filters.timeline,
    showArchived: filters.showArchived,
  }
}

interface AdvancedFiltersPopoverProps {
  filters: ProjectFilters
  onFiltersChange: (patch: Partial<ProjectFilters>) => void
  advancedFilterCount: number
  departmentOptions: FilterSelectOption[]
  epicOptions: FilterSelectOption[]
  squadOptions: FilterSelectOption[]
  designerOptions: FilterSelectOption[]
  hideStatusFilter?: boolean
}

function AdvancedFiltersPopover({
  filters,
  onFiltersChange,
  advancedFilterCount,
  departmentOptions,
  epicOptions,
  squadOptions,
  designerOptions,
  hideStatusFilter,
}: AdvancedFiltersPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AdvancedDraft>(() => draftFromFilters(filters))

  function handleOpenChange(next: boolean) {
    if (next) setDraft(draftFromFilters(filters))
    setOpen(next)
  }

  function patchDraft(patch: Partial<AdvancedDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function handleApply() {
    onFiltersChange(draft)
    setOpen(false)
  }

  function handleReset() {
    setDraft(RESET_DRAFT)
    onFiltersChange(RESET_DRAFT)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={advancedFilterCount > 0 ? "text-foreground" : "text-muted-foreground"}
          />
        }
      >
        <SlidersHorizontal />
        Filters
        {advancedFilterCount > 0 ? <span className="text-foreground">{advancedFilterCount}</span> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="max-h-[70vh] overflow-y-auto p-3">
          <p className="px-1 pb-2 text-sm font-semibold text-foreground">Filters</p>

          <div className="space-y-1">
            <p className="px-1 text-xs font-medium text-muted-foreground">Quick filters</p>
            {!hideStatusFilter ? (
              <FilterMultiSelect
                label="Status"
                options={STATUS_OPTIONS}
                selected={filters.status}
                onChange={(status) => onFiltersChange({ status: status as ProjectStatus[] })}
                variant="inline"
              />
            ) : null}
            <FilterMultiSelect
              label="Priority"
              options={PRIORITY_OPTIONS}
              selected={filters.priority}
              onChange={(priority) => onFiltersChange({ priority: priority as Priority[] })}
              variant="inline"
            />
            <FilterSelect
              label="Department"
              allLabel="All departments"
              triggerPlaceholder="Department"
              options={departmentOptions}
              value={filters.department}
              onChange={(department) => onFiltersChange({ department })}
              variant="inline"
            />
          </div>

          <Separator className="my-3" />

          <div className="space-y-3">
            <FilterField label="Epic">
              <FilterSelect
                label="Epic"
                allLabel="All epics"
                options={epicOptions}
                value={draft.epic}
                onChange={(epic) => patchDraft({ epic })}
                variant="inline"
              />
            </FilterField>
            <FilterField label="Owner Squad">
              <FilterSelect
                label="Owner Squad"
                allLabel="All squads"
                options={squadOptions}
                value={draft.squad}
                onChange={(squad) => patchDraft({ squad })}
                searchable
                variant="inline"
              />
            </FilterField>
            <FilterField label="Design Lead">
              <FilterSelect
                label="Design Lead"
                allLabel="All design leads"
                options={[{ value: UNASSIGNED_DESIGN_LEAD, label: "Unassigned" }, ...designerOptions]}
                value={draft.designLead}
                onChange={(designLead) => patchDraft({ designLead })}
                searchable
                variant="inline"
              />
            </FilterField>
            <FilterField label="Timeline">
              <FilterSelect
                label="Timeline"
                allLabel="Any timeline"
                options={TIMELINE_OPTIONS}
                value={draft.timeline}
                onChange={(timeline) => patchDraft({ timeline: timeline as TimelineFilter })}
                variant="inline"
              />
            </FilterField>
            <FilterField label="Health">
              <FilterSelect
                label="Health"
                allLabel="All health statuses"
                options={HEALTH_OPTIONS}
                value={draft.health}
                onChange={(health) => patchDraft({ health: health as ProjectHealth | "all" })}
                variant="inline"
              />
            </FilterField>

            <Label className="pt-1">
              <Switch
                checked={draft.showArchived}
                onCheckedChange={(showArchived) => patchDraft({ showArchived })}
              />
              Show archived
            </Label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="px-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

export { ProjectsFilterBar, DEFAULT_FILTERS, currentDateKey, getProjectTimelineBucket }
export type { ProjectFilters, TimelineFilter }
