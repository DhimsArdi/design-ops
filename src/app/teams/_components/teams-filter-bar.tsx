// Teams' filter toolbar. Layout, the search box and the "Clear filters"
// action come from the shared <FilterBar>; this file only picks the
// dimensions. Squad has no Department field in this domain model
// (PRD §8.2 — only id/name/lead_designer_id/description/status), so the
// contextual filters here are the ones that actually apply to a squad:
// staffing (derived from member count) and lead assignment (both tying into
// the same "intentional empty state" language as Teams' empty-state work),
// plus Status since squads can be Active/Inactive like other master data.
//
// All three dimensions live behind one "Filters" button rather than as
// standalone toolbar controls (docs/DECISIONS.md — global filter toolbar
// simplification), matching the same collapsed-popover shape Timeline uses:
// live application (no staged Apply — there's nothing here worth batching),
// a "Clear all" + "Done" footer, and a removable-chip row so active state
// stays visible once the individual controls are no longer directly on
// screen. The view switcher (Table/Squad) is passed in as `viewSwitcher` and
// rendered by <FilterBar> in the same row as Search/Filters.

"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FilterBar } from "@/components/shared/filter-bar"
import { FilterChip } from "@/components/shared/filter-chip"
import { FilterSelect, type FilterSelectOption } from "@/components/shared/filter-select"

import { ENTITY_STATUSES } from "@/lib/domain/enums"
import type { EntityStatus } from "@/lib/domain/enums"

export type StaffingFilter = "all" | "staffed" | "unstaffed"
export type LeadFilter = "all" | "assigned" | "unassigned"

export interface TeamsFilters {
  search: string
  staffing: StaffingFilter
  lead: LeadFilter
  status: EntityStatus | "all"
}

export const DEFAULT_TEAMS_FILTERS: TeamsFilters = {
  search: "",
  staffing: "all",
  lead: "all",
  status: "all",
}

const STAFFING_OPTIONS: FilterSelectOption[] = [
  { value: "staffed", label: "Has designers" },
  { value: "unstaffed", label: "No designers" },
]
const LEAD_OPTIONS: FilterSelectOption[] = [
  { value: "assigned", label: "Lead assigned" },
  { value: "unassigned", label: "No lead" },
]
const STATUS_OPTIONS: FilterSelectOption[] = ENTITY_STATUSES.map((status) => ({ value: status, label: status }))

interface TeamsFilterBarProps {
  filters: TeamsFilters
  onFiltersChange: (patch: Partial<TeamsFilters>) => void
  onClearAll: () => void
  hasFiltersApplied: boolean
  /** Table/Squad — rendered by <FilterBar> in the same row as Search/Filters. */
  viewSwitcher?: ReactNode
}

function TeamsFilterBar({ filters, onFiltersChange, onClearAll, hasFiltersApplied, viewSwitcher }: TeamsFilterBarProps) {
  const staffingLabel = STAFFING_OPTIONS.find((option) => option.value === filters.staffing)?.label
  const leadLabel = LEAD_OPTIONS.find((option) => option.value === filters.lead)?.label

  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (filters.staffing !== "all" && staffingLabel) {
    chips.push({
      key: "staffing",
      label: `Staffing: ${staffingLabel}`,
      onRemove: () => onFiltersChange({ staffing: "all" }),
    })
  }
  if (filters.lead !== "all" && leadLabel) {
    chips.push({ key: "lead", label: `Lead: ${leadLabel}`, onRemove: () => onFiltersChange({ lead: "all" }) })
  }
  if (filters.status !== "all") {
    chips.push({ key: "status", label: `Status: ${filters.status}`, onRemove: () => onFiltersChange({ status: "all" }) })
  }

  return (
    <FilterBar
      leading={viewSwitcher}
      search={{
        value: filters.search,
        onChange: (value) => onFiltersChange({ search: value }),
        placeholder: "Search squads…",
      }}
      hasFiltersApplied={hasFiltersApplied}
      onClear={onClearAll}
      chips={
        chips.length > 0
          ? chips.map((chip) => <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />)
          : undefined
      }
    >
      <TeamsFiltersPopover filters={filters} onFiltersChange={onFiltersChange} activeCount={chips.length} />
    </FilterBar>
  )
}

interface TeamsFiltersPopoverProps {
  filters: TeamsFilters
  onFiltersChange: (patch: Partial<TeamsFilters>) => void
  activeCount: number
}

function TeamsFiltersPopover({ filters, onFiltersChange, activeCount }: TeamsFiltersPopoverProps) {
  const [open, setOpen] = useState(false)

  function clearAllDimensions() {
    onFiltersChange({ staffing: "all", lead: "all", status: "all" })
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
        Filters
        {activeCount > 0 ? (
          <span className="text-muted-foreground">
            · <span className="text-foreground tabular-nums">{activeCount}</span>
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="space-y-3 p-3">
          <p className="px-1 text-sm font-semibold text-foreground">Filters</p>

          <div className="space-y-3">
            <FilterField label="Staffing">
              <FilterSelect
                label="Staffing"
                allLabel="Any staffing"
                options={STAFFING_OPTIONS}
                value={filters.staffing}
                onChange={(staffing) => onFiltersChange({ staffing: staffing as StaffingFilter })}
                variant="inline"
              />
            </FilterField>
            <FilterField label="Lead">
              <FilterSelect
                label="Lead"
                allLabel="Any lead"
                options={LEAD_OPTIONS}
                value={filters.lead}
                onChange={(lead) => onFiltersChange({ lead: lead as LeadFilter })}
                variant="inline"
              />
            </FilterField>
            <FilterField label="Status">
              <FilterSelect
                label="Status"
                allLabel="All statuses"
                options={STATUS_OPTIONS}
                value={filters.status}
                onChange={(status) => onFiltersChange({ status: status as EntityStatus | "all" })}
                variant="inline"
              />
            </FilterField>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAllDimensions}>
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

export { TeamsFilterBar }
