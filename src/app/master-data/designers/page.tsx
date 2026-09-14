"use client"

// Master Data — Designers (PRD §15). Create/Edit via Dialog; Active/Inactive
// is the reversible lifecycle action, Delete is the permanent one — guarded
// by getDesignerUsage so a designer still referenced by an assignment or a
// squad lead can't be deleted out from under historical data
// (docs/DECISIONS.md).

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { MoreHorizontal, Plus, SearchX, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { FilterBar } from "@/components/shared/filter-bar"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { VerifiedBadge } from "@/components/shared/verified-badge"
import { DeleteEntityDialog } from "@/components/shared/delete-entity-dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table } from "@/components/motion/table"
import type { TableColumn } from "@/components/motion/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import * as designerRepository from "@/lib/repositories/designerRepository"
import * as profileRepository from "@/lib/repositories/profileRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import { getDesignerUsage, isDesignerVerified } from "@/lib/selectors/designerSelectors"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import { activeOrSelected, byName } from "@/lib/domain/optionHelpers"
import { SENIORITIES, type Seniority } from "@/lib/domain/enums"
import type { Designer } from "@/lib/domain/types"

// Sentinel for "Unassigned" in the Home Squad select — Base UI Select can't
// hold a real empty-string item value, same reason profile-identity-fields.tsx
// uses NO_DEPARTMENT. Maps to home_squad_id: null on save (docs/DECISIONS.md):
// a designer can be left without a squad rather than always belonging to one.
const NO_SQUAD_SELECTED = "__none__"

interface DesignerFormState {
  name: string
  jobTitle: string
  seniority: Seniority
  homeSquadId: string
  avatar: string
}

interface DesignerFormErrors {
  name?: string
  jobTitle?: string
}

const EMPTY_FORM: DesignerFormState = {
  name: "",
  jobTitle: "",
  seniority: SENIORITIES[0],
  homeSquadId: NO_SQUAD_SELECTED,
  avatar: "",
}

export default function DesignersPage() {
  const [designers, refreshDesigners] = useRepositoryList(designerRepository)
  const [squads, refreshSquads] = useRepositoryList(squadRepository)
  // Subscribed only so the Verified badge updates live when someone finishes
  // onboarding and claims a row while this page is open.
  useRepositoryList(profileRepository)
  const currentDesignerId = useCurrentDesignerId()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 250)

  const [isDialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DesignerFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<DesignerFormErrors>({})
  const [deletingDesigner, setDeletingDesigner] = useState<Designer | null>(null)

  const refresh = useCallback(() => {
    refreshDesigners()
    refreshSquads()
  }, [refreshDesigners, refreshSquads])

  const squadsById = useMemo(
    () => new Map(squads.map((squad) => [squad.id, squad])),
    [squads]
  )

  const visibleDesigners = useMemo(() => {
    const trimmedQuery = debouncedQuery.trim().toLowerCase()
    return trimmedQuery
      ? designers.filter((designer) => designer.name.toLowerCase().includes(trimmedQuery))
      : designers
  }, [designers, debouncedQuery])

  // Active squads, plus the designer's current squad even if it has since gone
  // Inactive (so editing an existing designer never hides their real value).
  const squadOptions = useMemo(() => {
    const editingDesigner = editingId
      ? designers.find((designer) => designer.id === editingId)
      : undefined
    const currentSquadId = editingDesigner?.home_squad_id
    return activeOrSelected(squads, currentSquadId ? [currentSquadId] : []).sort(byName)
  }, [squads, editingId, designers])

  function openCreateDialog() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEditDialog(designer: Designer) {
    setEditingId(designer.id)
    setForm({
      name: designer.name,
      jobTitle: designer.job_title,
      seniority: designer.seniority,
      homeSquadId: designer.home_squad_id ?? NO_SQUAD_SELECTED,
      avatar: designer.avatar,
    })
    setErrors({})
    setDialogOpen(true)
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingId(null)
      setForm(EMPTY_FORM)
      setErrors({})
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: DesignerFormErrors = {}
    if (!form.name.trim()) nextErrors.name = "Name is required."
    if (!form.jobTitle.trim()) nextErrors.jobTitle = "Job title is required."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      name: form.name.trim(),
      job_title: form.jobTitle.trim(),
      seniority: form.seniority,
      home_squad_id: form.homeSquadId === NO_SQUAD_SELECTED ? null : form.homeSquadId,
      avatar: form.avatar.trim(),
    }

    if (editingId) {
      designerRepository.update(editingId, payload)
    } else {
      designerRepository.create({ ...payload, status: "Active" })
    }

    toast.success(`${payload.name} ${editingId ? "updated" : "added"}`)
    refresh()
    handleDialogOpenChange(false)
  }

  function handleToggleStatus(designer: Designer) {
    const nextStatus = designer.status === "Active" ? "Inactive" : "Active"
    designerRepository.setStatus(designer.id, nextStatus)
    toast.success(`${designer.name} set to ${nextStatus}`)
    refresh()
  }

  function handleForceDeleteConfirm() {
    if (!deletingDesigner) return
    designerRepository.removeCascade(deletingDesigner.id)
    toast.success(`${deletingDesigner.name} deleted`, {
      description: "Removed from their projects; any squad they led now has no lead.",
    })
  }

  function handleDeleteConfirm() {
    if (!deletingDesigner) return
    designerRepository.remove(deletingDesigner.id)
    toast.success(`${deletingDesigner.name} deleted`)
    refresh()
  }

  const columns: TableColumn<Designer>[] = [
    {
      key: "avatar",
      header: <span className="sr-only">Avatar</span>,
      width: "56px",
      cell: (designer) => <PersonAvatar person={designer} size="sm" />,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (designer) => personDisplayName(designer, currentDesignerId).toLowerCase(),
      cell: (designer) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium text-foreground">
            {personDisplayName(designer, currentDesignerId)}
          </span>
          {isDesignerVerified(designer.id) ? <VerifiedBadge /> : null}
        </span>
      ),
    },
    {
      key: "job_title",
      header: "Job Title",
      cell: (designer) => <span className="text-muted-foreground">{designer.job_title}</span>,
    },
    {
      key: "seniority",
      header: "Seniority",
      cell: (designer) => <span className="text-muted-foreground">{designer.seniority}</span>,
    },
    {
      key: "home_squad",
      header: "Home Squad",
      cell: (designer) => (
        <span className="text-muted-foreground">
          {squadsById.get(designer.home_squad_id ?? "")?.name ?? "Unassigned"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (designer) => <EntityStatusBadge status={designer.status} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "56px",
      align: "right",
      cell: (designer) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontal />
            <span className="sr-only">Actions for {designer.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(designer)}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleToggleStatus(designer)}>
              {designer.status === "Active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={designer.id === currentDesignerId}
              title={
                designer.id === currentDesignerId
                  ? "You can't delete your own designer record."
                  : undefined
              }
              onClick={() => setDeletingDesigner(designer)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Shrink-wraps to the roster's own row count (up to a scroll cap) instead of
  // reserving the table's default fixed viewport, so a short roster doesn't
  // sit inside a mostly-empty scroll area.
  const tableHeight = Math.min(560, (visibleDesigners.length + 1) * 48)

  const hasAnyDesigners = designers.length > 0
  const hasResults = visibleDesigners.length > 0

  return (
    <div>
      <PageHeader
        title="Designers"
        description="The design team roster: home squad, seniority, and status for every designer."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus />
            Add Designer
          </Button>
        }
      />

      <div className="space-y-6">
      <ContentSection bodyClassName="space-y-4">
        {!hasAnyDesigners ? (
          <EmptyState
            icon={Users}
            title="No designers yet"
            description="Add your first designer to start mapping the design team."
            action={
              <Button onClick={openCreateDialog}>
                <Plus />
                Add Designer
              </Button>
            }
          />
        ) : (
          <>
            <FilterBar
              search={{ value: query, onChange: setQuery, placeholder: "Search designers…" }}
              hasFiltersApplied={query.trim() !== ""}
              onClear={() => setQuery("")}
            />

            {!hasResults ? (
              <EmptyState
                icon={SearchX}
                title="No designers match these filters"
                action={
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <Table
                data={visibleDesigners}
                columns={columns}
                getRowId={(designer) => designer.id}
                defaultSort={{ key: "name", direction: "asc" }}
                height={tableHeight}
              />
            )}
          </>
        )}
      </ContentSection>

      {deletingDesigner ? (
        <DeleteEntityDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeletingDesigner(null)
          }}
          entityLabel="designer"
          entityName={deletingDesigner.name}
          blockers={(() => {
            const usage = getDesignerUsage(deletingDesigner.id)
            return [
              { label: "project assignment", count: usage.assignmentCount },
              { label: "squad lead role", count: usage.squadLeadCount },
            ]
          })()}
          onConfirm={handleDeleteConfirm}
          force={{
            consequence:
              "Deleting anyway removes them from those projects and leaves any squad they led without a lead.",
            onConfirm: handleForceDeleteConfirm,
          }}
        />
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Designer" : "Add Designer"}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update this designer's details."
                  : "Add a new designer to the team roster."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="designer-name">Name *</Label>
                <Input
                  id="designer-name"
                  value={form.name}
                  onChange={(event) => {
                    const value = event.target.value
                    setForm((current) => ({ ...current, name: value }))
                    setErrors((current) => ({ ...current, name: undefined }))
                  }}
                  placeholder="e.g. Sarah"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "designer-name-error" : undefined}
                />
                {errors.name ? (
                  <p id="designer-name-error" className="text-xs text-destructive">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designer-job-title">Job Title *</Label>
                <Input
                  id="designer-job-title"
                  value={form.jobTitle}
                  onChange={(event) => {
                    const value = event.target.value
                    setForm((current) => ({ ...current, jobTitle: value }))
                    setErrors((current) => ({ ...current, jobTitle: undefined }))
                  }}
                  placeholder="e.g. Product Designer"
                  aria-invalid={Boolean(errors.jobTitle)}
                  aria-describedby={errors.jobTitle ? "designer-job-title-error" : undefined}
                />
                {errors.jobTitle ? (
                  <p id="designer-job-title-error" className="text-xs text-destructive">
                    {errors.jobTitle}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designer-seniority">Seniority</Label>
                <Select
                  value={form.seniority}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, seniority: value as Seniority }))
                  }
                >
                  <SelectTrigger id="designer-seniority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENIORITIES.map((seniority) => (
                      <SelectItem key={seniority} value={seniority}>
                        {seniority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designer-home-squad">
                  Home Squad <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Select
                  value={form.homeSquadId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, homeSquadId: value ?? NO_SQUAD_SELECTED }))
                  }
                >
                  <SelectTrigger id="designer-home-squad" className="w-full">
                    <SelectValue placeholder="Unassigned">
                      {(squadId: string) =>
                        squadId === NO_SQUAD_SELECTED
                          ? "Unassigned"
                          : (squadOptions.find((s) => s.id === squadId)?.name ?? "Unassigned")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SQUAD_SELECTED}>
                      <span className="text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    {squadOptions.map((squad) => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name}
                        {squad.status === "Inactive" ? " (Inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designer-avatar">Avatar</Label>
                <Input
                  id="designer-avatar"
                  value={form.avatar}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, avatar: event.target.value }))
                  }
                  placeholder="Image URL (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to show initials instead.
                </p>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">
                {editingId ? "Save Changes" : "Add Designer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
