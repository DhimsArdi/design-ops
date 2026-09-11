"use client"

// Master Data — Designers (PRD §15). Create/Edit via Dialog; Active/Inactive
// is the only lifecycle action (row menu) — no delete anywhere, per
// docs/DECISIONS.md "No hard delete anywhere".

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { ArrowDown, ArrowUp, MoreHorizontal, Plus, SearchX, Users } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import { activeOrSelected, byName } from "@/lib/domain/optionHelpers"
import { SENIORITIES, type Seniority } from "@/lib/domain/enums"
import type { Designer } from "@/lib/domain/types"

// Sentinel for "nothing chosen yet" in the Home Squad select. Designer.home_squad_id
// is a required field (not nullable) per the domain model and PRD §4.3 ("Designer
// mempunyai Home Squad sebagai struktur organisasi") — every designer belongs to a
// squad, so this is a validation gate, not a persisted "no squad" state.
const NO_SQUAD_SELECTED = ""

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
  homeSquadId?: string
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
  const [query, setQuery] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const [isDialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DesignerFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<DesignerFormErrors>({})

  const refresh = useCallback(() => {
    refreshDesigners()
    refreshSquads()
  }, [refreshDesigners, refreshSquads])

  const squadsById = useMemo(
    () => new Map(squads.map((squad) => [squad.id, squad])),
    [squads]
  )

  const visibleDesigners = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase()
    const matches = trimmedQuery
      ? designers.filter((designer) =>
          designer.name.toLowerCase().includes(trimmedQuery)
        )
      : designers
    const sorted = [...matches].sort((a, b) => a.name.localeCompare(b.name))
    if (sortDirection === "desc") sorted.reverse()
    return sorted
  }, [designers, query, sortDirection])

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
      homeSquadId: designer.home_squad_id,
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
    if (form.homeSquadId === NO_SQUAD_SELECTED) nextErrors.homeSquadId = "Home squad is required."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      name: form.name.trim(),
      job_title: form.jobTitle.trim(),
      seniority: form.seniority,
      home_squad_id: form.homeSquadId,
      avatar: form.avatar.trim(),
    }

    if (editingId) {
      designerRepository.update(editingId, payload)
    } else {
      designerRepository.create({ ...payload, status: "Active" })
    }

    refresh()
    handleDialogOpenChange(false)
  }

  function handleToggleStatus(designer: Designer) {
    designerRepository.setStatus(
      designer.id,
      designer.status === "Active" ? "Inactive" : "Active"
    )
    refresh()
  }

  function toggleSort() {
    setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
  }

  const hasAnyDesigners = designers.length > 0
  const hasResults = visibleDesigners.length > 0

  return (
    <div className="space-y-6">
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

      <ContentSection
        title={hasAnyDesigners ? `${visibleDesigners.length} of ${designers.length} designers` : undefined}
        bodyClassName="space-y-4"
      >
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
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search designers…"
                className="w-full sm:w-64"
              />
            </div>

            {!hasResults ? (
              <EmptyState
                icon={SearchX}
                title="No designers match your search"
                description={`Nothing matches "${query}". Try a different name.`}
                action={
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <span className="sr-only">Avatar</span>
                    </TableHead>
                    <TableHead aria-sort={sortDirection === "asc" ? "ascending" : "descending"}>
                      <button
                        type="button"
                        onClick={toggleSort}
                        className="flex items-center gap-1 text-foreground hover:text-foreground/80"
                      >
                        Name
                        {sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Home Squad</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDesigners.map((designer) => {
                    const squad = squadsById.get(designer.home_squad_id)
                    return (
                      <TableRow key={designer.id} className="hover:bg-transparent">
                        <TableCell>
                          <PersonAvatar person={designer} size="sm" />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {designer.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {designer.job_title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {designer.seniority}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {squad?.name ?? "–"}
                        </TableCell>
                        <TableCell>
                          <EntityStatusBadge status={designer.status} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon-sm" />}
                            >
                              <MoreHorizontal />
                              <span className="sr-only">Actions for {designer.name}</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(designer)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleStatus(designer)}>
                                {designer.status === "Active" ? "Deactivate" : "Activate"}
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
                <Label htmlFor="designer-home-squad">Home Squad *</Label>
                <Select
                  value={form.homeSquadId}
                  onValueChange={(value) => {
                    setForm((current) => ({ ...current, homeSquadId: value ?? "" }))
                    setErrors((current) => ({ ...current, homeSquadId: undefined }))
                  }}
                >
                  <SelectTrigger
                    id="designer-home-squad"
                    className="w-full"
                    aria-invalid={Boolean(errors.homeSquadId)}
                    aria-describedby={errors.homeSquadId ? "designer-home-squad-error" : undefined}
                  >
                    <SelectValue placeholder="Select a squad" />
                  </SelectTrigger>
                  <SelectContent>
                    {squadOptions.map((squad) => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name}
                        {squad.status === "Inactive" ? " (Inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.homeSquadId ? (
                  <p id="designer-home-squad-error" className="text-xs text-destructive">
                    {errors.homeSquadId}
                  </p>
                ) : null}
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
  )
}
