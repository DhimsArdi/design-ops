// Actionable Project Design Lead cell (PRD §8.7/§26): an unassigned project
// used to render a passive "Unassigned" label with no way to resolve it from
// the same spot. This renders "Unassigned · Assign" — a lightweight inline
// action, not a new primary button — and opens a compact searchable Popover
// list (the same trigger-button + search + checkmark-list shape as
// FilterSelect, PRD-consistent component reuse) to pick a Designer as Lead
// right there. Once assigned, it shows the same avatar/name pattern already
// used everywhere else a Designer appears (PersonAvatar).
//
// Used anywhere a Project's Design Lead is shown as editable: Overview,
// Projects table, Project Detail. Squad Lead (a different entity/relationship
// — Squad.lead_designer_id, edited only in Master Data per docs/DECISIONS.md)
// intentionally does NOT use this control — see EmptyFieldAction instead.

import { useMemo, useState } from "react"
import type { MouseEvent } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { useCurrentDesignerId } from "@/lib/identity/current-user"
import { personDisplayName } from "@/lib/identity/person-display"
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository"
import { getProjectAssignments } from "@/lib/selectors/projectSelectors"
import type { Designer } from "@/lib/domain/types"
import { cn } from "cn"

/**
 * Sets this project's Lead assignment to `designerId`, reconciling the same
 * "zero-or-one Lead" / "no duplicate designer across Lead+Support" rules
 * (PRD §8.7) the Add/Edit Project wizard applies on full save — just scoped
 * to a single inline field edit instead of a whole-form diff. Promoting an
 * existing Support designer to Lead drops their Support row (no duplicate
 * across roles); everyone else's Support row is left untouched.
 */
function assignProjectLead(projectId: string, designerId: string): void {
  const assignments = getProjectAssignments(projectId)
  const currentLead = assignments.find((assignment) => assignment.project_role === "Lead")
  if (currentLead?.designer_id === designerId) return

  const support = assignments.filter(
    (assignment) => assignment.project_role === "Support" && assignment.designer_id !== designerId
  )
  projectAssignmentRepository.reconcile(projectId, [
    ...support.map((assignment) => ({ designerId: assignment.designer_id, role: "Support" as const })),
    { designerId, role: "Lead" as const },
  ])
}

interface AssignLeadControlProps {
  projectId: string
  lead: Designer | undefined
  /** Candidate designers to choose from — filtered to Active and sorted by name internally. */
  designers: Designer[]
  /** Called after the Lead assignment is written, so the caller can reload its own view of the data. */
  onAssigned: (designer: Designer) => void
  className?: string
}

function AssignLeadControl({ projectId, lead, designers, onAssigned, className }: AssignLeadControlProps) {
  const currentDesignerId = useCurrentDesignerId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const options = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const sorted = designers
      .filter((designer) => designer.status === "Active")
      .sort((a, b) => a.name.localeCompare(b.name))
    if (!trimmed) return sorted
    return sorted.filter((designer) => designer.name.toLowerCase().includes(trimmed))
  }, [designers, query])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function handleSelect(designer: Designer) {
    assignProjectLead(projectId, designer.id)
    toast.success(`${designer.name} assigned as Design Lead`)
    onAssigned(designer)
    setOpen(false)
    setQuery("")
  }

  function stop(event: MouseEvent) {
    event.stopPropagation()
  }

  if (lead) {
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
        <PersonAvatar person={lead} size="sm" />
        <span className="truncate text-sm text-foreground">
          {personDisplayName(lead, currentDesignerId)}
        </span>
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label="Assign a Project Design Lead"
            onClick={stop}
            className={cn(
              "h-auto gap-1 px-0 py-0 font-normal hover:bg-transparent",
              className
            )}
          />
        }
      >
        <span className="font-medium text-status-warning">Unassigned</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium text-primary underline underline-offset-2">Assign</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1" onClick={stop}>
        <div className="relative px-1 pt-1 pb-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search designers…"
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matching designers.</p>
          ) : (
            options.map((designer) => (
              <button
                key={designer.id}
                type="button"
                onClick={() => handleSelect(designer)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <PersonAvatar person={designer} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  {personDisplayName(designer, currentDesignerId)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { AssignLeadControl }
export type { AssignLeadControlProps }
