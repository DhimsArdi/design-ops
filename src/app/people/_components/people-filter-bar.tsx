// People's filter toolbar. Layout, the search box and the "Clear filters"
// action come from the shared <FilterBar>; this file only picks the
// dimensions that actually matter for a designer roster: Home Squad,
// Seniority, Status, and whether the designer currently has an active
// project. Unlike Projects, this set is small enough that every filter is
// shown directly — no "Filters" popover to hide anything behind (same call
// already made for the Timeline toolbar).
//
// No capacity/availability/allocation filter here on purpose — those
// concepts don't exist in this product (PRD §4.2). "Assignment" only checks
// presence/absence of an active ProjectAssignment, never a percentage.

"use client"

import { FilterBar } from "@/components/shared/filter-bar"
import { FilterSelect, type FilterSelectOption } from "@/components/shared/filter-select"
import { FilterMultiSelect, type FilterMultiSelectOption } from "@/components/shared/filter-multiselect"

import { ENTITY_STATUSES, SENIORITIES } from "@/lib/domain/enums"
import type { EntityStatus, Seniority } from "@/lib/domain/enums"

export type AssignmentFilter = "all" | "assigned" | "unassigned"

export interface PeopleFilters {
  search: string
  squad: string
  seniority: Seniority[]
  status: EntityStatus | "all"
  assignment: AssignmentFilter
}

export const DEFAULT_PEOPLE_FILTERS: PeopleFilters = {
  search: "",
  squad: "all",
  seniority: [],
  status: "all",
  assignment: "all",
}

const SENIORITY_OPTIONS: FilterMultiSelectOption[] = SENIORITIES.map((seniority) => ({
  value: seniority,
  label: seniority,
}))
const STATUS_OPTIONS: FilterSelectOption[] = ENTITY_STATUSES.map((status) => ({ value: status, label: status }))
const ASSIGNMENT_OPTIONS: FilterSelectOption[] = [
  { value: "assigned", label: "Has active project" },
  { value: "unassigned", label: "Unassigned" },
]

interface PeopleFilterBarProps {
  filters: PeopleFilters
  onFiltersChange: (patch: Partial<PeopleFilters>) => void
  onClearAll: () => void
  hasFiltersApplied: boolean
  squadOptions: FilterSelectOption[]
}

function PeopleFilterBar({
  filters,
  onFiltersChange,
  onClearAll,
  hasFiltersApplied,
  squadOptions,
}: PeopleFilterBarProps) {
  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (value) => onFiltersChange({ search: value }),
        placeholder: "Search people…",
      }}
      hasFiltersApplied={hasFiltersApplied}
      onClear={onClearAll}
    >
      <FilterSelect
        label="Home Squad"
        allLabel="All squads"
        triggerPlaceholder="Home Squad"
        options={squadOptions}
        value={filters.squad}
        onChange={(squad) => onFiltersChange({ squad })}
      />

      <FilterMultiSelect
        label="Seniority"
        options={SENIORITY_OPTIONS}
        selected={filters.seniority}
        onChange={(seniority) => onFiltersChange({ seniority: seniority as Seniority[] })}
      />

      <FilterSelect
        label="Status"
        allLabel="All statuses"
        triggerPlaceholder="Status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(status) => onFiltersChange({ status: status as EntityStatus | "all" })}
      />

      <FilterSelect
        label="Assignment"
        allLabel="Any assignment"
        triggerPlaceholder="Assignment"
        options={ASSIGNMENT_OPTIONS}
        value={filters.assignment}
        onChange={(assignment) => onFiltersChange({ assignment: assignment as AssignmentFilter })}
      />
    </FilterBar>
  )
}

export { PeopleFilterBar }
