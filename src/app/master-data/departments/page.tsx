"use client"

// Departments Master Data (PRD §14.9 / §15). Department Head references a
// Stakeholder row (stakeholder_type = "Department Head") rather than free
// text, and is snapshotted onto Project at creation time — see
// docs/DECISIONS.md "Department Head lives on Department Master Data,
// snapshotted onto Project". Status is Active/Inactive only, never deleted.

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Building2, MoreHorizontal, Plus, SearchX } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"
import { activeOrSelected } from "@/lib/domain/optionHelpers"
import type { Department, Stakeholder } from "@/lib/domain/types"

const NO_HEAD_VALUE = "__none__"

interface DepartmentFormState {
  name: string
  description: string
  headId: string
}

const EMPTY_FORM: DepartmentFormState = {
  name: "",
  description: "",
  headId: NO_HEAD_VALUE,
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[] | null>(null)
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [search, setSearch] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DepartmentFormState>(EMPTY_FORM)
  const [nameError, setNameError] = useState(false)

  function refresh() {
    setDepartments(departmentRepository.getAll())
    setStakeholders(stakeholderRepository.getAll())
  }

  useEffect(() => {
    // One-time bootstrap read of a synchronous, browser-only data source
    // (localStorage via the repository layer), not a subscription — the
    // external-store alternatives to this rule don't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [])

  const stakeholderById = useMemo(() => {
    const map = new Map<string, Stakeholder>()
    for (const stakeholder of stakeholders) map.set(stakeholder.id, stakeholder)
    return map
  }, [stakeholders])

  const departmentHeadStakeholders = useMemo(
    () => stakeholders.filter((s) => s.stakeholder_type === "Department Head"),
    [stakeholders]
  )

  // Active Department Head stakeholders, plus the currently-assigned head of
  // the department being edited even if that stakeholder is now Inactive —
  // otherwise editing any other field would silently clear a still-valid
  // historical assignment.
  const headOptions = useMemo(() => {
    const editingDepartment = departments?.find((d) => d.id === editingId)
    const currentHeadId = editingDepartment?.department_head_id
    return activeOrSelected(departmentHeadStakeholders, currentHeadId ? [currentHeadId] : [])
  }, [departmentHeadStakeholders, departments, editingId])

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!departments) return []
    if (!query) return departments
    return departments.filter((department) =>
      department.name.toLowerCase().includes(query)
    )
  }, [departments, search])

  function openCreateDialog() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setNameError(false)
    setDialogOpen(true)
  }

  function openEditDialog(department: Department) {
    setEditingId(department.id)
    setForm({
      name: department.name,
      description: department.description,
      headId: department.department_head_id ?? NO_HEAD_VALUE,
    })
    setNameError(false)
    setDialogOpen(true)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setNameError(true)
      return
    }

    const departmentHeadId =
      form.headId === NO_HEAD_VALUE ? null : form.headId

    if (editingId) {
      departmentRepository.update(editingId, {
        name,
        description: form.description.trim(),
        department_head_id: departmentHeadId,
      })
    } else {
      departmentRepository.create({
        name,
        description: form.description.trim(),
        department_head_id: departmentHeadId,
        status: "Active",
      })
    }

    setDialogOpen(false)
    refresh()
  }

  function toggleStatus(department: Department) {
    departmentRepository.setStatus(
      department.id,
      department.status === "Active" ? "Inactive" : "Active"
    )
    refresh()
  }

  const isLoading = departments === null
  const hasAnyDepartments = (departments?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Business departments used to group epics and attribute project ownership."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus />
            Add Department
          </Button>
        }
      />

      <ContentSection
        title={
          hasAnyDepartments
            ? `${filteredDepartments.length} of ${departments?.length ?? 0} departments`
            : undefined
        }
        bodyClassName="space-y-4"
      >
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading departments…
          </p>
        ) : !hasAnyDepartments ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Add your first department to start grouping epics and attributing project ownership."
            action={
              <Button onClick={openCreateDialog}>
                <Plus />
                Add Department
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search departments…"
                className="w-full sm:w-64"
              />
            </div>

            {filteredDepartments.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No departments match your search"
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
                    <TableHead>Department Name</TableHead>
                    <TableHead>Department Head</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((department) => {
                    const head = department.department_head_id
                      ? stakeholderById.get(department.department_head_id)
                      : undefined
                    return (
                      <TableRow key={department.id} className="hover:bg-transparent">
                        <TableCell className="font-medium text-foreground">
                          {department.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {head ? head.name : "–"}
                        </TableCell>
                        <TableCell>
                          <EntityStatusBadge status={department.status} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon-sm" />}
                            >
                              <MoreHorizontal />
                              <span className="sr-only">Actions for {department.name}</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(department)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus(department)}>
                                {department.status === "Active" ? "Deactivate" : "Activate"}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Department" : "Add Department"}
              </DialogTitle>
              <DialogDescription>
                Departments group epics and stakeholders, and are referenced by
                Projects.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="department-name">Department Name *</Label>
              <Input
                id="department-name"
                value={form.name}
                onChange={(event) => {
                  setForm((f) => ({ ...f, name: event.target.value }))
                  if (nameError) setNameError(false)
                }}
                placeholder="e.g. Wholesale Banking"
                aria-invalid={nameError || undefined}
              />
              {nameError ? (
                <p className="text-xs text-destructive">
                  Department name is required.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department-head">Department Head</Label>
              <Select
                value={form.headId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, headId: value ?? NO_HEAD_VALUE }))
                }
              >
                <SelectTrigger id="department-head" className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_HEAD_VALUE}>Unassigned</SelectItem>
                  {headOptions.map((stakeholder) => (
                    <SelectItem key={stakeholder.id} value={stakeholder.id}>
                      {stakeholder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-fills new Projects&apos; Department Head going forward.
                Projects already created keep their own snapshot and are
                unaffected by later changes here.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department-description">Description</Label>
              <Textarea
                id="department-description"
                value={form.description}
                onChange={(event) =>
                  setForm((f) => ({ ...f, description: event.target.value }))
                }
                placeholder="What this department covers"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Save Changes" : "Add Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
