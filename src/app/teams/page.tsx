"use client"

// Teams (PRD §14.7, §13.1) — structural overview of every squad, in two
// views. Table stays exactly as before: read-only, all squad
// create/edit/activate/deactivate lives on /master-data/squads. Squad View
// (the kanban) is the one place on this page that mutates squad membership
// directly — drag-and-drop move/share — a deliberate, documented exception to
// "Teams is read-only" (docs/DECISIONS.md), same shape as the earlier
// "No designers · Add" reversal. Both Active and Inactive squads are shown
// here (Inactive still needs to stay visible wherever historical Project
// data references it — docs/DECISIONS.md), distinguished by EntityStatusBadge.

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { SearchX, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { EmptyFieldAction } from "@/components/shared/empty-field-action"
import { Button } from "@/components/ui/button"
import { Table } from "@/components/motion/table"
import type { TableColumn } from "@/components/motion/table"

import { TeamsFilterBar, DEFAULT_TEAMS_FILTERS, type TeamsFilters } from "./_components/teams-filter-bar"
import { TeamsViewSwitcher, type TeamsView } from "./_components/teams-view-switcher"
import { SquadBoard } from "./_components/board/squad-board"
import { AddSquadMembersDialog } from "@/components/shared/add-squad-members-dialog"

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import {
  getSquadDesignerRoster,
  getSquadLead,
  getSquadMembers,
  getSquadSharedMembers,
} from "@/lib/selectors/squadSelectors"
import type { Squad } from "@/lib/domain/types"

const TEAMS_VIEW_KEY = "designops.teams.view"

export default function TeamsPage() {
  const router = useRouter()
  const [squads] = useRepositoryList(squadRepository)
  const [designers, refreshDesigners] = useRepositoryList(designerRepository)

  const [assignTarget, setAssignTarget] = useState<Squad | null>(null)

  const [view, setView] = useState<TeamsView>("table")
  const [filters, setFilters] = useState<TeamsFilters>(DEFAULT_TEAMS_FILTERS)
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  // Session-only preference (spec: "preserve the user's selected view during
  // the current session if easy") — read after mount, same SSR-safe pattern
  // Projects' own Board/List/Table switcher uses, to avoid a hydration
  // mismatch between server render and whatever was last picked client-side.
  useEffect(() => {
    const stored = window.localStorage.getItem(TEAMS_VIEW_KEY)
    if (stored === "table" || stored === "squad") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(stored)
    }
  }, [])

  function changeView(next: TeamsView) {
    setView(next)
    window.localStorage.setItem(TEAMS_VIEW_KEY, next)
  }

  function patchFilters(patch: Partial<TeamsFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  function clearFilters() {
    setFilters(DEFAULT_TEAMS_FILTERS)
  }

  const trimmedQuery = debouncedSearch.trim().toLowerCase()

  const squadsPassingFilters = useMemo(() => {
    return squads.filter((squad) => {
      if (filters.status !== "all" && squad.status !== filters.status) return false

      const memberCount = getSquadMembers(squad.id).length
      if (filters.staffing === "staffed" && memberCount === 0) return false
      if (filters.staffing === "unstaffed" && memberCount > 0) return false

      const lead = getSquadLead(squad.id)
      if (filters.lead === "assigned" && !lead) return false
      if (filters.lead === "unassigned" && lead) return false

      return true
    })
    // `designers` isn't read directly above, but getSquadMembers/getSquadLead
    // both derive from it — it must stay a dep or reassigning a designer's
    // Home Squad wouldn't recompute member counts here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squads, designers, filters])

  const visibleSquads = useMemo(() => {
    return squadsPassingFilters
      .filter((squad) => !trimmedQuery || squad.name.toLowerCase().includes(trimmedQuery))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [squadsPassingFilters, trimmedQuery])

  // Squad View's search additionally matches designer names — a squad
  // containing a matching designer stays visible even if its own name
  // doesn't match (spec §19), without changing Table's own search behavior.
  const visibleBoardSquads = useMemo(() => {
    return squadsPassingFilters
      .filter((squad) => {
        if (!trimmedQuery) return true
        if (squad.name.toLowerCase().includes(trimmedQuery)) return true
        const memberNames = [...getSquadMembers(squad.id), ...getSquadSharedMembers(squad.id)].map((d) =>
          d.name.toLowerCase(),
        )
        return memberNames.some((name) => name.includes(trimmedQuery))
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadsPassingFilters, trimmedQuery, designers])

  const columns: TableColumn<Squad>[] = [
    {
      key: "name",
      header: "Squad Name",
      sortable: true,
      cell: (squad) => (
        <Link
          href={`/teams/${squad.id}`}
          className="font-medium text-foreground hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {squad.name}
        </Link>
      ),
    },
    {
      key: "lead",
      header: "Squad Lead",
      cell: (squad) => {
        const lead = getSquadLead(squad.id)
        return lead ? (
          <span className="text-muted-foreground">{lead.name}</span>
        ) : (
          <EmptyFieldAction
            label="No lead assigned"
            actionLabel="Assign"
            href="/master-data/squads"
          />
        )
      },
    },
    {
      key: "designers",
      header: "Designers",
      cell: (squad) => {
        // Excludes the Squad Lead — shown in its own column, so it isn't
        // double-counted here as a separate designer.
        const memberCount = getSquadDesignerRoster(squad.id).length
        return memberCount > 0 ? (
          <span className="text-muted-foreground">
            {memberCount} {memberCount === 1 ? "designer" : "designers"}
          </span>
        ) : (
          <EmptyFieldAction
            label="No designers"
            actionLabel="Add"
            onClick={() => setAssignTarget(squad)}
          />
        )
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (squad) => <EntityStatusBadge status={squad.status} />,
    },
  ]

  const tableHeight = Math.min(560, (visibleSquads.length + 1) * 48)

  const hasAnySquads = squads.length > 0
  const activeResultCount = view === "table" ? visibleSquads.length : visibleBoardSquads.length
  const hasResults = activeResultCount > 0
  const hasFiltersApplied =
    filters.search.trim() !== "" || filters.staffing !== "all" || filters.lead !== "all" || filters.status !== "all"

  return (
    <div>
      <PageHeader
        title="Squads"
        description="Design squad structure: leads, members, and status."
      />

      <div className="space-y-6">
      <ContentSection bodyClassName={!hasAnySquads ? undefined : "space-y-4"}>
        {!hasAnySquads ? (
          <EmptyState
            icon={Users}
            title="No squads yet"
            description="Squads are managed in Master Data."
          />
        ) : (
          <>
            <TeamsFilterBar
              viewSwitcher={<TeamsViewSwitcher value={view} onChange={changeView} />}
              filters={filters}
              onFiltersChange={patchFilters}
              onClearAll={clearFilters}
              hasFiltersApplied={hasFiltersApplied}
            />

            {!hasResults ? (
              <EmptyState
                icon={SearchX}
                title="No squads match these filters"
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : view === "squad" ? (
              <SquadBoard squads={visibleBoardSquads} designers={designers} searchQuery={trimmedQuery} />
            ) : (
              <Table
                data={visibleSquads}
                columns={columns}
                getRowId={(squad) => squad.id}
                onRowClick={(squad) => router.push(`/teams/${squad.id}`)}
                defaultSort={{ key: "name", direction: "asc" }}
                height={tableHeight}
              />
            )}
          </>
        )}
      </ContentSection>

      {assignTarget ? (
        <AddSquadMembersDialog
          open
          onOpenChange={(next) => {
            if (!next) setAssignTarget(null)
          }}
          squad={assignTarget}
          designers={designers}
          squads={squads}
          onAdded={refreshDesigners}
        />
      ) : null}
      </div>
    </div>
  )
}
