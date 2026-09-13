// Teams' "No designers · Add" dialog — reverses the earlier "Teams is a
// read-only directory" decision on purpose (docs/DECISIONS.md, updated
// 2026-09-12) so an empty squad can be staffed without leaving the page.
//
// Squad membership has no join table: it is derived entirely from
// Designer.home_squad_id (a required, single field — every designer already
// belongs to exactly one squad). So "adding" a designer here always means
// reassigning their Home Squad, moving them out of wherever they currently
// are — the dialog surfaces that via each option's description line rather
// than hiding it.

"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { MultiSelectChecklist } from "@/components/shared/multi-select-checklist"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import * as designerRepository from "@/lib/repositories/designerRepository"
import type { Designer, Squad } from "@/lib/domain/types"

interface AssignDesignersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  squad: Squad
  designers: Designer[]
  squadNameById: Map<string, string>
  onAssigned: () => void
}

function AssignDesignersDialog({
  open,
  onOpenChange,
  squad,
  designers,
  squadNameById,
  onAssigned,
}: AssignDesignersDialogProps) {
  const currentDesignerId = useCurrentDesignerId()
  const [query, setQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery("")
    setSelectedIds([])
  }, [open])

  const options = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    return designers
      .filter((designer) => designer.status === "Active" && designer.home_squad_id !== squad.id)
      .filter((designer) => !trimmed || designer.name.toLowerCase().includes(trimmed))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((designer) => ({
        id: designer.id,
        label: (
          <span className="flex items-center gap-2">
            <PersonAvatar person={designer} size="sm" />
            {personDisplayName(designer, currentDesignerId)}
          </span>
        ),
        description: `Currently in ${squadNameById.get(designer.home_squad_id) ?? "another squad"}`,
      }))
  }, [designers, query, squad.id, squadNameById, currentDesignerId])

  function handleConfirm() {
    selectedIds.forEach((designerId) => {
      designerRepository.update(designerId, { home_squad_id: squad.id })
    })
    toast.success(
      `${selectedIds.length} ${selectedIds.length === 1 ? "designer" : "designers"} moved to ${squad.name}`
    )
    onAssigned()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add designers to {squad.name}</DialogTitle>
          <DialogDescription>
            A designer can only belong to one squad. Selecting one here moves them out of their
            current squad and into {squad.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search designers…"
              className="pl-8"
            />
          </div>

          <MultiSelectChecklist
            idPrefix="assign-designer"
            options={options}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            emptyMessage="No matching designers."
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={selectedIds.length === 0}>
            {selectedIds.length > 0
              ? `Add ${selectedIds.length} designer${selectedIds.length === 1 ? "" : "s"}`
              : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { AssignDesignersDialog }
export type { AssignDesignersDialogProps }
