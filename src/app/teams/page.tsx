"use client"

// Teams (PRD §14.7) — structural overview of every squad. Read-only: all
// squad create/edit/activate/deactivate lives on /master-data/squads (this
// page just links out for that). Both Active and Inactive squads are shown
// here (Inactive still needs to stay visible wherever historical Project
// data references it — docs/DECISIONS.md), distinguished by EntityStatusBadge.

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { SearchX, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { EmptyFieldAction } from "@/components/shared/empty-field-action"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { TeamsFilterBar, DEFAULT_TEAMS_FILTERS, type TeamsFilters } from "./_components/teams-filter-bar"
import { AssignDesignersDialog } from "./_components/assign-designers-dialog"

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import { getSquadLead, getSquadMembers } from "@/lib/selectors/squadSelectors"
import type { Squad } from "@/lib/domain/types"

export default function TeamsPage() {
  const router = useRouter()
  const [squads] = useRepositoryList(squadRepository)
  const [designers, refreshDesigners] = useRepositoryList(designerRepository)
  const squadNameById = useMemo(() => new Map(squads.map((s) => [s.id, s.name])), [squads])

  const [assignTarget, setAssignTarget] = useState<Squad | null>(null)

  const [filters, setFilters] = useState<TeamsFilters>(DEFAULT_TEAMS_FILTERS)
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  function patchFilters(patch: Partial<TeamsFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  function clearFilters() {
    setFilters(DEFAULT_TEAMS_FILTERS)
  }

  const visibleSquads = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim().toLowerCase()

    const matches = squads.filter((squad) => {
      if (filters.status !== "all" && squad.status !== filters.status) return false

      const memberCount = getSquadMembers(squad.id).length
      if (filters.staffing === "staffed" && memberCount === 0) return false
      if (filters.staffing === "unstaffed" && memberCount > 0) return false

      const lead = getSquadLead(squad.id)
      if (filters.lead === "assigned" && !lead) return false
      if (filters.lead === "unassigned" && lead) return false

      if (trimmedQuery && !squad.name.toLowerCase().includes(trimmedQuery)) return false

      return true
    })
    return matches.sort((a, b) => a.name.localeCompare(b.name))
    // `designers` isn't read directly above, but getSquadMembers/getSquadLead
    // both derive from it — it must stay a dep or reassigning a designer's
    // Home Squad wouldn't recompute member counts here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squads, designers, debouncedSearch, filters])

  const hasAnySquads = squads.length > 0
  const hasResults = visibleSquads.length > 0
  const hasFiltersApplied =
    filters.search.trim() !== "" || filters.staffing !== "all" || filters.lead !== "all" || filters.status !== "all"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Design squad structure: leads, members, and status."
      />

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
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Squad Name</TableHead>
                    <TableHead>Squad Lead</TableHead>
                    <TableHead>Designers</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSquads.map((squad) => {
                    const lead = getSquadLead(squad.id)
                    const memberCount = getSquadMembers(squad.id).length

                    return (
                      <TableRow
                        key={squad.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/teams/${squad.id}`)}
                      >
                        <TableCell className="font-medium text-foreground">
                          <Link
                            href={`/teams/${squad.id}`}
                            className="hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {squad.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead ? (
                            lead.name
                          ) : (
                            <EmptyFieldAction
                              label="No lead assigned"
                              actionLabel="Assign"
                              href="/master-data/squads"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {memberCount > 0 ? (
                            `${memberCount} ${memberCount === 1 ? "designer" : "designers"}`
                          ) : (
                            <EmptyFieldAction
                              label="No designers"
                              actionLabel="Add"
                              onClick={() => setAssignTarget(squad)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <EntityStatusBadge status={squad.status} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </ContentSection>

      {assignTarget ? (
        <AssignDesignersDialog
          open={Boolean(assignTarget)}
          onOpenChange={(next) => {
            if (!next) setAssignTarget(null)
          }}
          squad={assignTarget}
          designers={designers}
          squadNameById={squadNameById}
          onAssigned={refreshDesigners}
        />
      ) : null}
    </div>
  )
}
