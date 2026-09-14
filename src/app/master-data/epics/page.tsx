"use client"

// Epics master data (PRD §18/§8.5): the initiative-level context a project
// belongs to, scoped to exactly one Department. Active/Inactive is the
// reversible lifecycle action; Delete is guarded by getEpicUsage so an epic
// still referenced by a project can't be deleted (docs/DECISIONS.md).

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Layers, MoreHorizontal, Plus, SearchX } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table } from "@/components/motion/table"
import type { TableColumn } from "@/components/motion/table"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { subscribe } from "@/lib/store/dataStore"
import * as epicRepository from "@/lib/repositories/epicRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import { activeOrSelected } from "@/lib/domain/optionHelpers"
import { getEpicUsage } from "@/lib/selectors/epicSelectors"
import type { Department, Epic } from "@/lib/domain/types"

interface EpicFormState {
  name: string
  department_id: string
  description: string
}

interface EpicFormErrors {
  name?: string
  department_id?: string
}

const EMPTY_FORM: EpicFormState = { name: "", department_id: "", description: "" }

export default function EpicsPage() {
  const [epics, setEpics] = useState<Epic[] | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 250)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null)
  const [form, setForm] = useState<EpicFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<EpicFormErrors>({})
  const [deletingEpic, setDeletingEpic] = useState<Epic | null>(null)

  useEffect(() => {
    function read() {
      setDepartments(departmentRepository.getAll())
      setEpics(epicRepository.getAll())
    }
    // Reads both tables now and again on every change to the shared cache, so
    // this page follows edits made elsewhere (docs/DECISIONS.md). Subscribes to
    // the store rather than to one repository's list because it needs two.
    read()
    return subscribe(read)
  }, [])

  function reloadEpics() {
    setEpics(epicRepository.getAll())
  }

  const departmentById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  )

  const departmentOptions = useMemo(() => {
    const currentId = editingEpic?.department_id
    return activeOrSelected(departments, currentId ? [currentId] : [])
  }, [departments, editingEpic])

  const filteredEpics = useMemo(() => {
    if (!epics) return []
    const query = debouncedSearch.trim().toLowerCase()
    if (!query) return epics
    return epics.filter((epic) => {
      const departmentName = departmentById.get(epic.department_id)?.name ?? ""
      return (
        epic.name.toLowerCase().includes(query) ||
        departmentName.toLowerCase().includes(query)
      )
    })
  }, [epics, debouncedSearch, departmentById])

  function openCreateDialog() {
    setEditingEpic(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEditDialog(epic: Epic) {
    setEditingEpic(epic)
    setForm({
      name: epic.name,
      department_id: epic.department_id,
      description: epic.description,
    })
    setErrors({})
    setDialogOpen(true)
  }

  function toggleStatus(epic: Epic) {
    epicRepository.setStatus(epic.id, epic.status === "Active" ? "Inactive" : "Active")
    reloadEpics()
  }

  function handleDeleteConfirm() {
    if (!deletingEpic) return
    epicRepository.remove(deletingEpic.id)
    toast.success(`${deletingEpic.name} deleted`)
    reloadEpics()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = form.name.trim()
    const nextErrors: EpicFormErrors = {}
    if (!name) nextErrors.name = "Epic name is required."
    if (!form.department_id) nextErrors.department_id = "Department is required."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (editingEpic) {
      epicRepository.update(editingEpic.id, {
        name,
        department_id: form.department_id,
        description: form.description.trim(),
      })
    } else {
      epicRepository.create({
        name,
        department_id: form.department_id,
        description: form.description.trim(),
        status: "Active",
      })
    }

    toast.success(`${name} ${editingEpic ? "updated" : "added"}`)
    setDialogOpen(false)
    reloadEpics()
  }

  const hasEpics = (epics?.length ?? 0) > 0
  const hasResults = filteredEpics.length > 0

  const columns = useMemo<TableColumn<Epic>[]>(
    () => [
      {
        key: "name",
        header: "Epic Name",
        sortable: true,
        cell: (epic) => <span className="font-medium text-foreground">{epic.name}</span>,
      },
      {
        key: "department",
        header: "Department",
        cell: (epic) => (
          <span className="text-muted-foreground">
            {departmentById.get(epic.department_id)?.name ?? "–"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (epic) => <EntityStatusBadge status={epic.status} />,
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: "56px",
        align: "right",
        cell: (epic) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal />
              <span className="sr-only">Actions for {epic.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(epic)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleStatus(epic)}>
                {epic.status === "Active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeletingEpic(epic)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [departmentById, toggleStatus]
  )

  const tableHeight = Math.min(560, (filteredEpics.length + 1) * 48)

  return (
    <div>
      <PageHeader
        title="Epics"
        description="The initiative-level context every project belongs to, scoped to one department."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus />
            Add Epic
          </Button>
        }
      />

      <div className="space-y-6">
      <ContentSection
        bodyClassName="space-y-4"
      >
        {epics === null ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading epics…</p>
        ) : !hasEpics ? (
          <EmptyState
            icon={Layers}
            title="No epics yet"
            description="Add an epic to group projects under a business initiative and department."
            action={
              <Button onClick={openCreateDialog}>
                <Plus />
                Add Epic
              </Button>
            }
          />
        ) : (
          <>
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: "Search epics or departments…" }}
              hasFiltersApplied={search.trim() !== ""}
              onClear={() => setSearch("")}
            />

            {!hasResults ? (
              <EmptyState
                icon={SearchX}
                title="No epics match these filters"
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <Table
                data={filteredEpics}
                columns={columns}
                getRowId={(epic) => epic.id}
                defaultSort={{ key: "name", direction: "asc" }}
                height={tableHeight}
              />
            )}
          </>
        )}
      </ContentSection>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEpic ? "Edit Epic" : "Add Epic"}</DialogTitle>
            <DialogDescription>
              {editingEpic
                ? "Update this epic's name, department, or description."
                : "Epics group related projects under one business initiative and department."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="epic-name">Epic Name *</Label>
              <Input
                id="epic-name"
                value={form.name}
                onChange={(event) => {
                  const value = event.target.value
                  setForm((current) => ({ ...current, name: value }))
                  setErrors((current) => ({ ...current, name: undefined }))
                }}
                placeholder="e.g. Trade Finance"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "epic-name-error" : undefined}
              />
              {errors.name ? (
                <p id="epic-name-error" className="text-xs text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="epic-department">Department *</Label>
              <Select
                value={form.department_id}
                onValueChange={(value) => {
                  setForm((current) => ({ ...current, department_id: value ?? "" }))
                  setErrors((current) => ({ ...current, department_id: undefined }))
                }}
              >
                <SelectTrigger
                  id="epic-department"
                  className="w-full"
                  aria-invalid={Boolean(errors.department_id)}
                  aria-describedby={errors.department_id ? "epic-department-error" : undefined}
                >
                  <SelectValue placeholder="Select a department">
                    {(departmentId: string) =>
                      departmentOptions.find((d) => d.id === departmentId)?.name ?? ""
                    }
                  </SelectValue>
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
              {errors.department_id ? (
                <p id="epic-department-error" className="text-xs text-destructive">
                  {errors.department_id}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="epic-description">Description</Label>
              <Textarea
                id="epic-description"
                value={form.description}
                onChange={(event) => {
                  const value = event.target.value
                  setForm((current) => ({ ...current, description: value }))
                }}
                placeholder="Optional context for this epic"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingEpic ? "Save Changes" : "Add Epic"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {deletingEpic ? (
        <DeleteEntityDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeletingEpic(null)
          }}
          entityLabel="epic"
          entityName={deletingEpic.name}
          blockers={[{ label: "project", count: getEpicUsage(deletingEpic.id).projectCount }]}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
      </div>
    </div>
  )
}
