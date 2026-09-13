// Timeline's filter toolbar. Same shared <FilterBar> shell as every other
// list screen (search box, ⌘K, "Clear filters", chip row), but Timeline is a
// canvas, not a table: filtering is a secondary act there, so only Search and
// one Filters button are permanently visible and every dimension lives in the
// popover behind it (docs/CHANGELOG.md).
//
// Unlike Projects' Advanced Filters panel, nothing here is staged behind an
// Apply: the chart re-filters live as you pick, which is the whole point of
// filtering a visualization you are looking at (docs/DECISIONS.md). The
// footer therefore carries "Clear all" and a "Done" that only closes.
//
// Every control inside the popover uses `variant="inline"` (expands in normal
// flow, no nested Popover) — nesting a second floating overlay inside this
// one risks the outer treating a click into the nested portal as an outside
// click and closing itself. See filter-select.tsx.

"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { FilterBar } from "@/components/shared/filter-bar"
import { FilterChip } from "@/components/shared/filter-chip"
import { FilterSelect, type FilterSelectOption } from "@/components/shared/filter-select"

import { PRIORITIES, PROJECT_HEALTHS, PROJECT_STATUSES } from "@/lib/domain/enums"
import type { Priority, ProjectHealth, ProjectStatus } from "@/lib/domain/enums"

export interface TimelineFilters {
  search: string
  squad: string
  department: string
  epic: string
  designer: string
  priority: Priority | "all"
  status: ProjectStatus | "all"
  health: ProjectHealth | "all"
  showArchived: boolean
}

export const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  search: "",
  squad: "all",
  department: "all",
  epic: "all",
  designer: "all",
  priority: "all",
  status: "all",
  health: "all",
  showArchived: false,
}

const PRIORITY_OPTIONS: FilterSelectOption[] = PRIORITIES.map((priority) => ({
  value: priority,
  label: priority,
}))
const STATUS_OPTIONS: FilterSelectOption[] = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: status,
}))
const HEALTH_OPTIONS: FilterSelectOption[] = PROJECT_HEALTHS.map((health) => ({
  value: health,
  label: health,
}))

interface TimelineFilterBarProps {
  filters: TimelineFilters
  onFiltersChange: (patch: Partial<TimelineFilters>) => void
  onClearAll: () => void
  hasFiltersApplied: boolean
  squadOptions: FilterSelectOption[]
  departmentOptions: FilterSelectOption[]
  epicOptions: FilterSelectOption[]
  designerOptions: FilterSelectOption[]
}

function TimelineFilterBar({
  filters,
  onFiltersChange,
  onClearAll,
  hasFiltersApplied,
  squadOptions,
  departmentOptions,
  epicOptions,
  designerOptions,
}: TimelineFilterBarProps) {
  const squadLabel = squadOptions.find((option) => option.value === filters.squad)?.label
  const departmentLabel = departmentOptions.find((option) => option.value === filters.department)?.label
  const epicLabel = epicOptions.find((option) => option.value === filters.epic)?.label
  const designerLabel = designerOptions.find((option) => option.value === filters.designer)?.label

  // One chip per active dimension, in the order they appear in the panel.
  // Search is deliberately not a chip — the query is already visible, and
  // spelling it out twice is noise.
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (filters.squad !== "all" && squadLabel) {
    chips.push({ key: "squad", label: squadLabel, onRemove: () => onFiltersChange({ squad: "all" }) })
  }
  if (filters.priority !== "all") {
    chips.push({
      key: "priority",
      label: filters.priority,
      onRemove: () => onFiltersChange({ priority: "all" }),
    })
  }
  if (filters.status !== "all") {
    chips.push({ key: "status", label: filters.status, onRemove: () => onFiltersChange({ status: "all" }) })
  }
  if (filters.department !== "all" && departmentLabel) {
    chips.push({
      key: "department",
      label: departmentLabel,
      onRemove: () => onFiltersChange({ department: "all" }),
    })
  }
  if (filters.epic !== "all" && epicLabel) {
    chips.push({ key: "epic", label: epicLabel, onRemove: () => onFiltersChange({ epic: "all" }) })
  }
  if (filters.health !== "all") {
    chips.push({ key: "health", label: filters.health, onRemove: () => onFiltersChange({ health: "all" }) })
  }
  if (filters.designer !== "all" && designerLabel) {
    chips.push({ key: "designer", label: designerLabel, onRemove: () => onFiltersChange({ designer: "all" }) })
  }
  if (filters.showArchived) {
    chips.push({
      key: "archived",
      label: "Archived included",
      onRemove: () => onFiltersChange({ showArchived: false }),
    })
  }

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (search) => onFiltersChange({ search }),
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
      <TimelineFiltersPopover
        filters={filters}
        onFiltersChange={onFiltersChange}
        activeCount={chips.length}
        squadOptions={squadOptions}
        departmentOptions={departmentOptions}
        epicOptions={epicOptions}
        designerOptions={designerOptions}
      />
    </FilterBar>
  )
}

interface TimelineFiltersPopoverProps {
  filters: TimelineFilters
  onFiltersChange: (patch: Partial<TimelineFilters>) => void
  activeCount: number
  squadOptions: FilterSelectOption[]
  departmentOptions: FilterSelectOption[]
  epicOptions: FilterSelectOption[]
  designerOptions: FilterSelectOption[]
}

function TimelineFiltersPopover({
  filters,
  onFiltersChange,
  activeCount,
  squadOptions,
  departmentOptions,
  epicOptions,
  designerOptions,
}: TimelineFiltersPopoverProps) {
  const [open, setOpen] = useState(false)

  function clearAllDimensions() {
    onFiltersChange({
      squad: "all",
      department: "all",
      epic: "all",
      designer: "all",
      priority: "all",
      status: "all",
      health: "all",
      showArchived: false,
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={activeCount > 0 ? "text-foreground" : "text-muted-foreground"}
          />
        }
      >
        <SlidersHorizontal />
        Filter
        {activeCount > 0 ? (
          <span className="text-muted-foreground">
            · <span className="text-foreground tabular-nums">{activeCount}</span>
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-88 p-0">
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-3">
          <p className="px-1 text-sm font-semibold text-foreground">Filter projects</p>

          <div className="space-y-3">
            <FilterField label="Squad">
              <FilterSelect
                label="Squad"
                allLabel="All squads"
                options={squadOptions}
                value={filters.squad}
                onChange={(squad) => onFiltersChange({ squad })}
                searchable
                variant="inline"
              />
            </FilterField>
            <FilterField label="Priority">
              <FilterSelect
                label="Priority"
                allLabel="All priorities"
                options={PRIORITY_OPTIONS}
                value={filters.priority}
                onChange={(priority) => onFiltersChange({ priority: priority as Priority | "all" })}
                variant="inline"
              />
            </FilterField>
            <FilterField label="Status">
              <FilterSelect
                label="Status"
                allLabel="All statuses"
                options={STATUS_OPTIONS}
                value={filters.status}
                onChange={(status) => onFiltersChange({ status: status as ProjectStatus | "all" })}
                variant="inline"
              />
            </FilterField>
            <FilterField label="Department">
              <FilterSelect
                label="Department"
                allLabel="All departments"
                options={departmentOptions}
                value={filters.department}
                onChange={(department) => onFiltersChange({ department })}
                searchable
                variant="inline"
              />
            </FilterField>
            <FilterField label="Epic">
              <FilterSelect
                label="Epic"
                allLabel="All epics"
                options={epicOptions}
                value={filters.epic}
                onChange={(epic) => onFiltersChange({ epic })}
                searchable
                variant="inline"
              />
            </FilterField>
            <FilterField label="Health">
              <FilterSelect
                label="Health"
                allLabel="All health statuses"
                options={HEALTH_OPTIONS}
                value={filters.health}
                onChange={(health) => onFiltersChange({ health: health as ProjectHealth | "all" })}
                variant="inline"
              />
            </FilterField>
            <FilterField label="Designer">
              <FilterSelect
                label="Designer"
                allLabel="All designers"
                options={designerOptions}
                value={filters.designer}
                onChange={(designer) => onFiltersChange({ designer })}
                searchable
                variant="inline"
              />
            </FilterField>
          </div>

          <Separator />

          <FilterField label="Project visibility">
            <Label className="px-1 py-1 font-normal">
              <Checkbox
                checked={filters.showArchived}
                onCheckedChange={(showArchived: boolean) => onFiltersChange({ showArchived })}
              />
              Include archived projects
            </Label>
          </FilterField>
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={clearAllDimensions}
          >
            Clear all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Done
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

export { TimelineFilterBar }
