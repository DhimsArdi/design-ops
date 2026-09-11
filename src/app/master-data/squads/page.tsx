"use client"

// Master Data — Squads (PRD §16). Squad membership is never edited here: it
// is always derived from Designer.home_squad_id (see squadSelectors.ts), so
// this page only manages a squad's own fields (name, lead, description,
// status) and offers a read-only view of derived membership.

import { useCallback, useEffect, useState } from "react"
import { MoreHorizontal, Plus, SearchX, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import { getSquadLead, getSquadMembers } from "@/lib/selectors/squadSelectors"
import type { Designer, Squad } from "@/lib/domain/types"

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[] | null>(null)
  const [designers, setDesigners] = useState<Designer[] | null>(null)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null)
  const [viewingSquad, setViewingSquad] = useState<Squad | null>(null)

  const refresh = useCallback(() => {
    setSquads(squadRepository.getAll())
    setDesigners(designerRepository.getAll())
  }, [])

  useEffect(() => {
    // One-time bootstrap read of a synchronous, browser-only data source
    // (localStorage via the repository layer), not a subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  function openCreateDialog() {
    setEditingSquad(null)
    setFormOpen(true)
  }

  function openEditDialog(squad: Squad) {
    setEditingSquad(squad)
    setFormOpen(true)
  }

  function handleToggleStatus(squad: Squad) {
    squadRepository.setStatus(squad.id, squad.status === "Active" ? "Inactive" : "Active")
    refresh()
  }

  const activeDesigners = (designers ?? []).filter((designer) => designer.status === "Active")

  const trimmedSearch = search.trim().toLowerCase()
  const filteredSquads = (squads ?? []).filter((squad) =>
    squad.name.toLowerCase().includes(trimmedSearch)
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Squads"
        description="Design squads and their leads. Membership is derived from each designer's Home Squad."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus />
            Add Squad
          </Button>
        }
      />

      <ContentSection
        title={squads && squads.length > 0 ? `${filteredSquads.length} of ${squads.length} squads` : undefined}
        bodyClassName="space-y-4"
      >
        {squads === null ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading squads…</p>
        ) : squads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No squads yet"
            description="Add a squad to start mapping your design team structure."
            action={
              <Button onClick={openCreateDialog}>
                <Plus />
                Add Squad
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search squads…"
                className="w-full sm:w-64"
              />
            </div>

            {filteredSquads.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No squads match your search"
                description={`Nothing matches "${search}". Try a different name.`}
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Squad Name</TableHead>
                    <TableHead>Squad Lead</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSquads.map((squad) => {
                    const lead = getSquadLead(squad.id)
                    const memberCount = getSquadMembers(squad.id).length
                    return (
                      <TableRow key={squad.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setViewingSquad(squad)}
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                          >
                            {squad.name}
                          </button>
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                              <MoreHorizontal />
                              <span className="sr-only">Squad actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(squad)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewingSquad(squad)}>
                                View members
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(squad)}>
                                {squad.status === "Active" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <SquadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        squad={editingSquad}
        activeDesigners={activeDesigners}
        onSaved={refresh}
      />

      <SquadMembersDialog
        squad={viewingSquad}
        onOpenChange={(open) => {
          if (!open) setViewingSquad(null)
        }}
      />
    </div>
  )
}

interface SquadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  squad: Squad | null
  activeDesigners: Designer[]
  onSaved: () => void
}

/** Create/Edit form for a Squad's own fields. Status is never set here — the
 * only lifecycle action is the row-level Activate/Deactivate menu item. */
function SquadFormDialog({
  open,
  onOpenChange,
  squad,
  activeDesigners,
  onSaved,
}: SquadFormDialogProps) {
  const isEdit = squad !== null
  const [name, setName] = useState("")
  const [leadDesignerId, setLeadDesignerId] = useState<string | null>(null)
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!open) return
    // Reset (or prefill, in edit mode) whenever the dialog is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(squad?.name ?? "")
    setLeadDesignerId(squad?.lead_designer_id ?? null)
    setDescription(squad?.description ?? "")
  }, [open, squad])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0

  function handleSave() {
    if (!canSave) return
    if (squad) {
      squadRepository.update(squad.id, {
        name: trimmedName,
        lead_designer_id: leadDesignerId,
        description: description.trim(),
      })
    } else {
      squadRepository.create({
        name: trimmedName,
        lead_designer_id: leadDesignerId,
        description: description.trim(),
        status: "Active",
      })
    }
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Squad" : "Add Squad"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this squad's name, lead, or description."
              : "Members aren't added here: a designer joins a squad by setting it as their Home Squad."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="squad-name">Squad Name *</Label>
            <Input
              id="squad-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Squad A"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="squad-lead">Squad Lead</Label>
            <Select value={leadDesignerId} onValueChange={(value) => setLeadDesignerId(value)}>
              <SelectTrigger id="squad-lead" className="w-full">
                <SelectValue placeholder="Unassigned">
                  {(value: string | null) =>
                    value ? (activeDesigners.find((d) => d.id === value)?.name ?? "Unassigned") : "Unassigned"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Unassigned</SelectItem>
                {activeDesigners.map((designer) => (
                  <SelectItem key={designer.id} value={designer.id}>
                    {designer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="squad-description">Description</Label>
            <Textarea
              id="squad-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this squad owns or focuses on"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEdit ? "Save Changes" : "Create Squad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SquadMembersDialogProps {
  squad: Squad | null
  onOpenChange: (open: boolean) => void
}

/** Read-only membership view — derived live from Designer.home_squad_id.
 * There is intentionally no add/remove control here. */
function SquadMembersDialog({ squad, onOpenChange }: SquadMembersDialogProps) {
  const members = squad ? getSquadMembers(squad.id) : []
  const lead = squad ? getSquadLead(squad.id) : undefined

  return (
    <Dialog open={squad !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{squad?.name}</DialogTitle>
          <DialogDescription>
            Squad Lead: {lead ? lead.name : "Unassigned"}
          </DialogDescription>
        </DialogHeader>

        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No designers currently have this as their Home Squad.
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                <PersonAvatar person={member} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.job_title}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Membership is set from each designer&apos;s Home Squad. It can&apos;t be edited here.
        </p>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
