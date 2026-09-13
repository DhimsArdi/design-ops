"use client"

// Departments Master Data (PRD §14.9 / §15). Department Head references a
// Stakeholder row (stakeholder_type = "Department Head") rather than free
// text, and is snapshotted onto Project at creation time — see
// docs/DECISIONS.md "Department Head lives on Department Master Data,
// snapshotted onto Project". Status is Active/Inactive only, never deleted.

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Building2, MoreHorizontal, Plus, SearchX } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ContentSection } from "@/components/shared/content-section"
import { EmptyState } from "@/components/shared/empty-state"
import { EntityStatusBadge } from "@/components/shared/entity-status-badge"
import { FilterBar } from "@/components/shared/filter-bar"
import { DeleteEntityDialog } from "@/components/shared/delete-entity-dialog"
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
import { Table } from "@/components/motion/table"
import type { TableColumn } from "@/components/motion/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { subscribe } from "@/lib/store/dataStore"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"
import { activeOrSelected } from "@/lib/domain/optionHelpers"
import { getDepartmentUsage } from "@/lib/selectors/departmentSelectors"
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
  const debouncedSearch = useDebouncedValue(search, 250)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DepartmentFormState>(EMPTY_FORM)
  const [nameError, setNameError] = useState(false)
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null)

  function refresh() {
    setDepartments(departmentRepository.getAll())
    setStakeholders(stakeholderRepository.getAll())
  }

  useEffect(() => {
    // Reads both tables now and again on every change to the shared cache, so
    // this page follows edits made elsewhere (docs/DECISIONS.md). Subscribes to
    // the store rather than to one repository's list because it needs two.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    return subscribe(refresh)
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
    const query = debouncedSearch.trim().toLowerCase()
    if (!departments) return []
    if (!query) return departments
    return departments.filter((department) =>
      department.name.toLowerCase().includes(query)
    )
  }, [departments, debouncedSearch])

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

    toast.success(`${name} ${editingId ? "updated" : "added"}`)
    setDialogOpen(false)
    refresh()
  }

  function toggleStatus(department: Department) {
    const nextStatus = department.status === "Active" ? "Inactive" : "Active"
    departmentRepository.setStatus(department.id, nextStatus)
    toast.success(`${department.name} set to ${nextStatus}`)
    refresh()
  }

  function handleDeleteConfirm() {
    if (!deletingDepartment) return
    departmentRepository.remove(deletingDepartment.id)
    toast.success(`${deletingDepartment.name} deleted`)
    refresh()
  }

  const isLoading = departments === null
  const hasAnyDepartments = (departments?.length ?? 0) > 0

  const columns = useMemo<TableColumn<Department>[]>(
    () => [
      {
        key: "name",
        header: "Department Name",
        sortable: true,
        cell: (department) => (
          <span className="font-medium text-foreground">{department.name}</span>
        ),
      },
      {
        key: "head",
        header: "Department Head",
        cell: (department) => {
          const head = department.department_head_id
            ? stakeholderById.get(department.department_head_id)
            : undefined
          return <span className="text-muted-foreground">{head ? head.name : "–"}</span>
        },
      },
      {
        key: "status",
        header: "Status",
        cell: (department) => <EntityStatusBadge status={department.status} />,
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: "56px",
        align: "right",
        cell: (department) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal />
              <span className="sr-only">Actions for {department.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(department)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleStatus(department)}>
                {department.status === "Active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeletingDepartment(department)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [stakeholderById, toggleStatus]
  )

  const tableHeight = Math.min(560, (filteredDepartments.length + 1) * 48)

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
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: "Search departments…" }}
              hasFiltersApplied={search.trim() !== ""}
              onClear={() => setSearch("")}
            />

            {filteredDepartments.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No departments match these filters"
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <Table
                data={filteredDepartments}
                columns={columns}
                getRowId={(department) => department.id}
                defaultSort={{ key: "name", direction: "asc" }}
                height={tableHeight}
              />
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
                  <SelectValue placeholder="Unassigned">
                    {(headId: string) =>
                      headId === NO_HEAD_VALUE
                        ? "Unassigned"
                        : (headOptions.find((s) => s.id === headId)?.name ?? "Unassigned")
                    }
                  </SelectValue>
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

      {deletingDepartment ? (
        <DeleteEntityDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeletingDepartment(null)
          }}
          entityLabel="department"
          entityName={deletingDepartment.name}
          blockers={(() => {
            const usage = getDepartmentUsage(deletingDepartment.id)
            return [
              { label: "epic", count: usage.epicCount },
              { label: "project", count: usage.projectCount },
            ]
          })()}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  )
}
