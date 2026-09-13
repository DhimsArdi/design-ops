// Teams' filter toolbar. Layout, the search box and the "Clear filters"
// action come from the shared <FilterBar>; this file only picks the
// dimensions. Squad has no Department field in this domain model
// (PRD §8.2 — only id/name/lead_designer_id/description/status), so the
// contextual filters here are the ones that actually apply to a squad:
// staffing (derived from member count) and lead assignment (both tying into
// the same "intentional empty state" language as Teams' empty-state work),
// plus Status since squads can be Active/Inactive like other master data.

"use client"

import { FilterBar } from "@/components/shared/filter-bar"
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
}

function TeamsFilterBar({ filters, onFiltersChange, onClearAll, hasFiltersApplied }: TeamsFilterBarProps) {
  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (value) => onFiltersChange({ search: value }),
        placeholder: "Search squads…",
      }}
      hasFiltersApplied={hasFiltersApplied}
      onClear={onClearAll}
    >
      <FilterSelect
        label="Staffing"
        allLabel="Any staffing"
        triggerPlaceholder="Staffing"
        options={STAFFING_OPTIONS}
        value={filters.staffing}
        onChange={(staffing) => onFiltersChange({ staffing: staffing as StaffingFilter })}
      />

      <FilterSelect
        label="Lead"
        allLabel="Any lead"
        triggerPlaceholder="Lead"
        options={LEAD_OPTIONS}
        value={filters.lead}
        onChange={(lead) => onFiltersChange({ lead: lead as LeadFilter })}
      />

      <FilterSelect
        label="Status"
        allLabel="All statuses"
        triggerPlaceholder="Status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(status) => onFiltersChange({ status: status as EntityStatus | "all" })}
      />
    </FilterBar>
  )
}

export { TeamsFilterBar }
