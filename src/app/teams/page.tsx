"use client"

// Teams (PRD §14.7) — structural overview of every squad. Read-only: all
// squad create/edit/activate/deactivate lives on /master-data/squads (this
// page just links out for that). Both Active and Inactive squads are shown
// here (Inactive still needs to stay visible wherever historical Project
// data references it — docs/DECISIONS.md), distinguished by EntityStatusBadge.

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as squadRepository from "@/lib/repositories/squadRepository"
import { getSquadLead, getSquadMembers } from "@/lib/selectors/squadSelectors"

export default function TeamsPage() {
  const router = useRouter()
  const [squads] = useRepositoryList(squadRepository)

  const sortedSquads = [...squads].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Design squad structure: leads, members, and status."
      />

      <ContentSection bodyClassName={sortedSquads.length === 0 ? undefined : "p-0"}>
        {sortedSquads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No squads yet"
            description="Squads are managed in Master Data."
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
              {sortedSquads.map((squad) => {
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
                      {lead ? lead.name : "–"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {memberCount} {memberCount === 1 ? "designer" : "designers"}
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
      </ContentSection>
    </div>
  )
}
