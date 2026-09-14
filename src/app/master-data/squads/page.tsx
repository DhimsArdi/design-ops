"use client"

// Master Data — Squads (PRD §16). Membership is still never *stored* here —
// it is always derived from Designer.home_squad_id (see squadSelectors.ts) —
// but it is now edited here: Add member and Manage members write that field on
// the designer, which is what keeps every other view (Designers, Teams, People,
// Overview) in step without a second source of truth (docs/DECISIONS.md).

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { MoreHorizontal, Plus, SearchX, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { FilterBar } from "@/components/shared/filter-bar"
import { DeleteEntityDialog } from "@/components/shared/delete-entity-dialog"
import { EmptyFieldAction } from "@/components/shared/empty-field-action"
import { PersonSelect } from "@/components/shared/person-select"
import { AddSquadMembersDialog } from "@/components/shared/add-squad-members-dialog"
import { ManageSquadMembersDialog } from "./_components/manage-squad-members-dialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table } from "@/components/motion/table"
import type { TableColumn } from "@/components/motion/table"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { subscribe } from "@/lib/store/dataStore"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import { getSquadLead, getSquadMembers, getSquadUsage } from "@/lib/selectors/squadSelectors"
import type { Designer, Squad } from "@/lib/domain/types"

export default function SquadsPage() {
  const currentDesignerId = useCurrentDesignerId()
  const [squads, setSquads] = useState<Squad[] | null>(null)
  const [designers, setDesigners] = useState<Designer[] | null>(null)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 250)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null)
  // Ids, not captured rows: both member dialogs look the squad up again on
  // every render, so a lead assigned inside Manage members shows up in the
  // same list rather than in a stale copy of it.
  const [managingSquadId, setManagingSquadId] = useState<string | null>(null)
  const [addingToSquadId, setAddingToSquadId] = useState<string | null>(null)
  const [deletingSquad, setDeletingSquad] = useState<Squad | null>(null)

  const refresh = useCallback(() => {
    setSquads(squadRepository.getAll())
    setDesigners(designerRepository.getAll())
  }, [])

  useEffect(() => {
    // Reads both tables now and again on every change to the shared cache, so
    // this page follows edits made elsewhere (docs/DECISIONS.md). Subscribes to
    // the store rather than to one repository's list because it needs two.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    return subscribe(refresh)
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
    const nextStatus = squad.status === "Active" ? "Inactive" : "Active"
    squadRepository.setStatus(squad.id, nextStatus)
    toast.success(`${squad.name} set to ${nextStatus}`)
    refresh()
  }

  function handleDeleteConfirm() {
    if (!deletingSquad) return
    squadRepository.remove(deletingSquad.id)
    toast.success(`${deletingSquad.name} deleted`)
    refresh()
  }

  const activeDesigners = (designers ?? []).filter((designer) => designer.status === "Active")
  const addingToSquad = (squads ?? []).find((squad) => squad.id === addingToSquadId)

  const trimmedSearch = debouncedSearch.trim().toLowerCase()
  const filteredSquads = (squads ?? []).filter((squad) =>
    squad.name.toLowerCase().includes(trimmedSearch)
  )

  const columns = useMemo<TableColumn<Squad>[]>(
    () => [
      {
        key: "name",
        header: "Squad Name",
        sortable: true,
        cell: (squad) => (
          <button
            type="button"
            onClick={() => setManagingSquadId(squad.id)}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {squad.name}
          </button>
        ),
      },
      {
        key: "lead",
        header: "Squad Lead",
        cell: (squad) => {
          const lead = getSquadLead(squad.id)
          return (
            <span className="text-muted-foreground">
              {lead ? personDisplayName(lead, currentDesignerId) : "–"}
            </span>
          )
        },
      },
      {
        key: "members",
        header: "Members",
        cell: (squad) => {
          const memberCount = getSquadMembers(squad.id).length
          return memberCount === 0 ? (
            <EmptyFieldAction
              label="0 designers"
              actionLabel="Add member"
              onClick={() => setAddingToSquadId(squad.id)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setManagingSquadId(squad.id)}
              className="rounded-sm text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {memberCount} {memberCount === 1 ? "designer" : "designers"}
              <span className="sr-only"> — manage members</span>
            </button>
          )
        },
      },
      {
        key: "status",
        header: "Status",
        cell: (squad) => <EntityStatusBadge status={squad.status} />,
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: "56px",
        align: "right",
        cell: (squad) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal />
              <span className="sr-only">Squad actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(squad)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddingToSquadId(squad.id)}>
                Add member
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManagingSquadId(squad.id)}>
                Manage members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleToggleStatus(squad)}>
                {squad.status === "Active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeletingSquad(squad)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [currentDesignerId, handleToggleStatus]
  )

  const tableHeight = Math.min(560, (filteredSquads.length + 1) * 48)

  return (
    <div>
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

      <div className="space-y-6">
      <ContentSection
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
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: "Search squads…" }}
              hasFiltersApplied={search.trim() !== ""}
              onClear={() => setSearch("")}
            />

            {filteredSquads.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No squads match these filters"
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <Table
                data={filteredSquads}
                columns={columns}
                getRowId={(squad) => squad.id}
                defaultSort={{ key: "name", direction: "asc" }}
                height={tableHeight}
              />
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

      <ManageSquadMembersDialog
        squadId={managingSquadId}
        onOpenChange={(open) => {
          if (!open) setManagingSquadId(null)
        }}
        squads={squads ?? []}
        designers={designers ?? []}
      />

      {addingToSquad ? (
        <AddSquadMembersDialog
          open
          onOpenChange={(open) => {
            if (!open) setAddingToSquadId(null)
          }}
          squad={addingToSquad}
          designers={designers ?? []}
          squads={squads ?? []}
        />
      ) : null}

      {deletingSquad ? (
        <DeleteEntityDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeletingSquad(null)
          }}
          entityLabel="squad"
          entityName={deletingSquad.name}
          blockers={(() => {
            const usage = getSquadUsage(deletingSquad.id)
            return [
              { label: "designer", count: usage.designerCount },
              { label: "project", count: usage.projectCount },
            ]
          })()}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
      </div>
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
  const currentDesignerId = useCurrentDesignerId()
  const sortedDesigners = [...activeDesigners].sort((a, b) => a.name.localeCompare(b.name))
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
    toast.success(`${trimmedName} ${squad ? "updated" : "added"}`)
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
            {/* Searchable, with avatars and job titles, and the signed-in user
                shown as "(Me)" when they have a designer record — the same
                control the Project Design Lead field uses (PRD §14.11). The
                signed-in user is not injected into this list: they are in it
                because they are a designer, like everyone else. */}
            <PersonSelect
              id="squad-lead"
              value={leadDesignerId}
              onChange={setLeadDesignerId}
              people={sortedDesigners}
              currentDesignerId={currentDesignerId}
              emptyOption="Unassigned"
            />
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
