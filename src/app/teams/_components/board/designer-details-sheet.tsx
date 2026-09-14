"use client"

// Designer Details — right-side Sheet opened from a designer row in Squad
// View (docs/PRD.MD §13.1, §14.6). A Sheet rather than a Modal so the squad
// board stays visible behind it. Read-heavy (Overview/Squads/Projects/About);
// the one mutation it offers is "+ Add to another squad", which only ever
// adds a shared membership — never touches home_squad_id.

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { StatusBadge } from "@/components/shared/status-badge"

import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"
import * as squadDesignerMembershipRepository from "@/lib/repositories/squadDesignerMembershipRepository"
import { getDesignerSquadMemberships } from "@/lib/selectors/squadSelectors"
import { getDesignerProjects } from "@/lib/selectors/projectSelectors"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import { byName } from "@/lib/domain/optionHelpers"

interface DesignerDetailsSheetProps {
  designerId: string | null
  onOpenChange: (open: boolean) => void
}

function DesignerDetailsSheet({ designerId, onOpenChange }: DesignerDetailsSheetProps) {
  const designer = designerId ? designerRepository.getById(designerId) : undefined

  return (
    <Sheet open={designer !== undefined} onOpenChange={onOpenChange}>
      <SheetContent className="data-[side=right]:sm:max-w-md">
        {designer ? <DesignerDetailsContent designerId={designer.id} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function DesignerDetailsContent({ designerId }: { designerId: string }) {
  const currentDesignerId = useCurrentDesignerId()
  const designer = designerRepository.getById(designerId)
  const [addSquadId, setAddSquadId] = useState("")

  const memberships = useMemo(() => getDesignerSquadMemberships(designerId), [designerId])
  const projects = useMemo(() => getDesignerProjects(designerId), [designerId])
  const squadsById = useMemo(
    () => new Map(squadRepository.getAll().map((squad) => [squad.id, squad])),
    [],
  )
  const assignments = useMemo(
    () => projectAssignmentRepository.getAll().filter((row) => row.designer_id === designerId),
    [designerId],
  )

  if (!designer) return null

  const memberSquadIds = new Set(memberships.map((row) => row.squad.id))
  const joinableSquads = squadRepository
    .getAll()
    .filter((squad) => squad.status === "Active" && !memberSquadIds.has(squad.id))
    .sort(byName)

  function handleAddToSquad() {
    if (!addSquadId) return
    const squad = squadsById.get(addSquadId)
    squadDesignerMembershipRepository.addMembership(designerId, addSquadId)
    toast.success(`${designer!.name} shared with ${squad?.name ?? "another squad"}`)
    setAddSquadId("")
  }

  const activeProjectCount = projects.filter(
    (project) => project.status === "Planning" || project.status === "In Progress",
  ).length
  const leadCount = assignments.filter((row) => row.project_role === "Lead").length
  const supportCount = assignments.filter((row) => row.project_role === "Support").length

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">Designer Details</SheetTitle>
        <SheetDescription className="sr-only">
          {designer.name}&apos;s squad memberships and current projects.
        </SheetDescription>
        <div className="flex items-center gap-3">
          <PersonAvatar person={designer} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {personDisplayName(designer, currentDesignerId)}
            </p>
            <p className="truncate text-sm text-muted-foreground">{designer.job_title}</p>
          </div>
        </div>
        <div>
          <EntityStatusBadge status={designer.status} />
        </div>
      </SheetHeader>

      <Tabs defaultValue="overview" className="flex-1 overflow-hidden px-4">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="squads">Squads</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 overflow-y-auto pt-3 pb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Primary Squad</p>
            <p className="text-sm text-foreground">
              {squadsById.get(designer.home_squad_id ?? "")?.name ?? "Unassigned"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-lg font-semibold text-foreground">{activeProjectCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-lg font-semibold text-foreground">{leadCount}</p>
              <p className="text-xs text-muted-foreground">Lead</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-lg font-semibold text-foreground">{supportCount}</p>
              <p className="text-xs text-muted-foreground">Support</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="squads" className="space-y-3 overflow-y-auto pt-3 pb-4">
          {memberships.length > 1 ? (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              This designer is shared across multiple squads. They can contribute to multiple squads
              while keeping their primary squad.
            </p>
          ) : null}

          <ul className="space-y-2">
            {memberships.map(({ squad, type }) => (
              <li
                key={squad.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <Link href={`/teams/${squad.id}`} className="truncate text-sm font-medium text-foreground hover:underline">
                    {squad.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{designer.job_title}</p>
                </div>
                <Badge variant={type === "primary" ? "secondary" : "outline"} className="shrink-0">
                  {type === "primary" ? "Primary" : "Shared"}
                </Badge>
              </li>
            ))}
          </ul>

          {joinableSquads.length > 0 ? (
            <div className="flex items-center gap-2 pt-1">
              <Select value={addSquadId} onValueChange={(value) => setAddSquadId(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add to another squad…">
                    {(value: string) => joinableSquads.find((squad) => squad.id === value)?.name ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {joinableSquads.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" disabled={!addSquadId} onClick={handleAddToSquad}>
                Add
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="projects" className="space-y-2 overflow-y-auto pt-3 pb-4">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No current projects.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => (
                <li key={project.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="truncate text-sm font-medium text-foreground hover:underline"
                    >
                      {project.name}
                    </Link>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Owner Squad: {squadsById.get(project.owner_squad_id)?.name ?? "Not set"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="about" className="space-y-3 overflow-y-auto pt-3 pb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Seniority</p>
            <p className="text-sm text-foreground">{designer.seniority}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Job Title</p>
            <p className="text-sm text-foreground">{designer.job_title}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <EntityStatusBadge status={designer.status} />
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}

export { DesignerDetailsSheet }
export type { DesignerDetailsSheetProps }
