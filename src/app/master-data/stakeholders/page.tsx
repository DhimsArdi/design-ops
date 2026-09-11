"use client"

import { useEffect, useState, type FormEvent } from "react"
import { MoreHorizontal, Plus, SearchX, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { STAKEHOLDER_TYPES, type StakeholderType } from "@/lib/domain/enums"
import type { Department, Stakeholder } from "@/lib/domain/types"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"

interface StakeholderFormState {
  name: string
  title: string
  departmentId: string | null
  stakeholderType: StakeholderType | null
}

interface StakeholderFormErrors {
  name?: string
  departmentId?: string
  stakeholderType?: string
}

const EMPTY_FORM: StakeholderFormState = {
  name: "",
  title: "",
  departmentId: null,
  stakeholderType: null,
}

type TypeFilter = "all" | StakeholderType

export default function StakeholdersPage() {
  const [stakeholders, setStakeholders] = useState<Stakeholder[] | null>(null)
  const [departments, setDepartments] = useState<Department[] | null>(null)

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StakeholderFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<StakeholderFormErrors>({})

  useEffect(() => {
    // One-time bootstrap read of a synchronous, browser-only data source
    // (localStorage via the repository layer), not a subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStakeholders(stakeholderRepository.getAll())
    setDepartments(departmentRepository.getAll())
  }, [])

  function refresh() {
    setStakeholders(stakeholderRepository.getAll())
    setDepartments(departmentRepository.getAll())
  }

  function openCreateDialog() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEditDialog(stakeholder: Stakeholder) {
    setEditingId(stakeholder.id)
    setForm({
      name: stakeholder.name,
      title: stakeholder.title,
      departmentId: stakeholder.department_id,
      stakeholderType: stakeholder.stakeholder_type,
    })
    setErrors({})
    setDialogOpen(true)
  }

  function handleToggleStatus(stakeholder: Stakeholder) {
    stakeholderRepository.setStatus(
      stakeholder.id,
      stakeholder.status === "Active" ? "Inactive" : "Active"
    )
    refresh()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: StakeholderFormErrors = {}
    if (!form.name.trim()) nextErrors.name = "Name is required."
    if (!form.departmentId) nextErrors.departmentId = "Department is required."
    if (!form.stakeholderType) nextErrors.stakeholderType = "Stakeholder type is required."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    if (!form.departmentId || !form.stakeholderType) return

    if (editingId) {
      stakeholderRepository.update(editingId, {
        name: form.name.trim(),
        title: form.title.trim(),
        department_id: form.departmentId,
        stakeholder_type: form.stakeholderType,
      })
    } else {
      stakeholderRepository.create({
        name: form.name.trim(),
        title: form.title.trim(),
        department_id: form.departmentId,
        stakeholder_type: form.stakeholderType,
        status: "Active",
      })
    }

    refresh()
    setDialogOpen(false)
  }

  function clearFilters() {
    setSearch("")
    setTypeFilter("all")
  }

  const isLoading = stakeholders === null || departments === null

  const departmentNameById = new Map(
    (departments ?? []).map((department) => [department.id, department.name])
  )

  // Department is required on Stakeholder, so the picker only offers Active
  // departments — plus the currently selected one when editing a stakeholder
  // whose department has since gone Inactive, so its name still resolves.
  const activeDepartments = (departments ?? [])
    .filter((department) => department.status === "Active")
    .sort((a, b) => a.name.localeCompare(b.name))
  const departmentOptions =
    form.departmentId && !activeDepartments.some((department) => department.id === form.departmentId)
      ? [
          ...activeDepartments,
          ...(departments ?? []).filter((department) => department.id === form.departmentId),
        ]
      : activeDepartments

  const filteredStakeholders = (stakeholders ?? []).filter((stakeholder) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      !query ||
      stakeholder.name.toLowerCase().includes(query) ||
      stakeholder.title.toLowerCase().includes(query)
    const matchesType = typeFilter === "all" || stakeholder.stakeholder_type === typeFilter
    return matchesSearch && matchesType
  })

  const hasAnyStakeholders = (stakeholders ?? []).length > 0
  const hasFiltersApplied = search.trim().length > 0 || typeFilter !== "all"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stakeholders"
        description="Department heads, product owners, and project admins referenced from Project forms."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus />
            Add Stakeholder
          </Button>
        }
      />

      <ContentSection
        title={
          hasAnyStakeholders
            ? `${filteredStakeholders.length} of ${stakeholders?.length ?? 0} stakeholders`
            : undefined
        }
        bodyClassName="space-y-4"
      >
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading stakeholders…
          </p>
        ) : !hasAnyStakeholders ? (
          <EmptyState
            icon={Users}
            title="No stakeholders yet"
            description="Add stakeholders to reference them as Department Heads, Product Owners, and Project Admins on your projects."
            action={
              <Button onClick={openCreateDialog}>
                <Plus />
                Add Stakeholder
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by name or title…"
                className="w-full sm:w-64"
              />
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? "all")}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Filter by stakeholder type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {STAKEHOLDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredStakeholders.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No stakeholders match"
                description="Try a different search term, or clear the type filter."
                action={
                  hasFiltersApplied ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStakeholders.map((stakeholder) => (
                    <TableRow key={stakeholder.id} className="hover:bg-transparent">
                      <TableCell className="font-medium text-foreground">
                        {stakeholder.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {stakeholder.title || "–"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {departmentNameById.get(stakeholder.department_id) ?? "–"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stakeholder.stakeholder_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <EntityStatusBadge status={stakeholder.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <MoreHorizontal />
                            <span className="sr-only">Actions for {stakeholder.name}</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(stakeholder)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(stakeholder)}>
                              {stakeholder.status === "Active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </ContentSection>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Stakeholder" : "Add Stakeholder"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update this stakeholder's details."
                : "Stakeholders are referenced from Project forms as Department Head, Product Owner, or Project Admin / PIC, never typed as free text."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="stakeholder-name">Name *</Label>
              <Input
                id="stakeholder-name"
                value={form.name}
                onChange={(event) => {
                  const value = event.target.value
                  setForm((f) => ({ ...f, name: value }))
                  setErrors((current) => ({ ...current, name: undefined }))
                }}
                placeholder="e.g. Budi Santoso"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "stakeholder-name-error" : undefined}
              />
              {errors.name ? (
                <p id="stakeholder-name-error" className="text-xs text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stakeholder-title">Title</Label>
              <Input
                id="stakeholder-title"
                value={form.title}
                onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
                placeholder="e.g. Head of Wholesale Banking"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stakeholder-department">Department *</Label>
              <Select
                value={form.departmentId}
                onValueChange={(value) => {
                  setForm((f) => ({ ...f, departmentId: value }))
                  setErrors((current) => ({ ...current, departmentId: undefined }))
                }}
              >
                <SelectTrigger
                  id="stakeholder-department"
                  className="w-full"
                  aria-invalid={Boolean(errors.departmentId)}
                  aria-describedby={errors.departmentId ? "stakeholder-department-error" : undefined}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                      {department.status === "Inactive" ? " (Inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId ? (
                <p id="stakeholder-department-error" className="text-xs text-destructive">
                  {errors.departmentId}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stakeholder-type">Stakeholder Type *</Label>
              <Select
                value={form.stakeholderType}
                onValueChange={(value) => {
                  setForm((f) => ({ ...f, stakeholderType: value }))
                  setErrors((current) => ({ ...current, stakeholderType: undefined }))
                }}
              >
                <SelectTrigger
                  id="stakeholder-type"
                  className="w-full"
                  aria-invalid={Boolean(errors.stakeholderType)}
                  aria-describedby={errors.stakeholderType ? "stakeholder-type-error" : undefined}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.stakeholderType ? (
                <p id="stakeholder-type-error" className="text-xs text-destructive">
                  {errors.stakeholderType}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Save Changes" : "Add Stakeholder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
