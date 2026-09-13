// "Mark as complete" — the one lifecycle action that collects input (a
// completion date, and a choice about the project's own end_date), so it
// stays a bespoke Dialog rather than the generic ConfirmDialog (matching the
// precedent already set by Timeline's week-detail Dialog).
//
// ProjectAssignment has no date-range field of its own (docs/domain/types.ts
// — an assignment spans the whole project); there is nothing to write a
// per-designer "allocation end date" to. So the "designers still have
// allocations after this date" warning is implemented by comparing the
// chosen completion date against the project's own end_date, and "End
// allocations on completion date" only ever truncates that end_date — it
// never touches ProjectAssignment (docs/DECISIONS.md).
//
// Both sides of that comparison are now day-level, so the button label ("on
// completion date") finally matches what it does; it used to truncate to the
// completion MONTH while saying "date".

"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/shared/date-picker"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import * as projectRepository from "@/lib/repositories/projectRepository"
import { getProjectAssignments } from "@/lib/selectors/projectSelectors"
import type { Project } from "@/lib/domain/types"

type AllocationChoice = "keep" | "end"

function todayDateString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })

/** date is "YYYY-MM-DD" — parsed as local calendar parts, matching this file's other date handling. */
function formatDateDisplay(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  return DATE_FORMATTER.format(new Date(year, month - 1, day))
}

interface MarkCompleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  onCompleted: (updated: Project) => void
}

function MarkCompleteDialog({ open, onOpenChange, project, onCompleted }: MarkCompleteDialogProps) {
  const [completionDate, setCompletionDate] = useState(todayDateString)
  const [allocationChoice, setAllocationChoice] = useState<AllocationChoice>("keep")

  useEffect(() => {
    if (!open) return
    // Reset to today whenever the dialog is (re)opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletionDate(todayDateString())
    setAllocationChoice("keep")
  }, [open])

  const assignmentCount = getProjectAssignments(project.id).length
  // Compared to the day, not the month: a project ending Dec 18 that completes
  // on Dec 3 now offers to shorten, where the old month comparison saw both as
  // "2026-12" and stayed silent.
  const showAllocationWarning = assignmentCount > 0 && project.end_date > completionDate

  function handleConfirm() {
    const updated = projectRepository.update(project.id, {
      status: "Completed",
      completed_at: completionDate,
      end_date:
        showAllocationWarning && allocationChoice === "end" ? completionDate : project.end_date,
    })
    if (updated) {
      onCompleted(updated)
      toast.success(`${project.name} marked complete`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Complete project?</DialogTitle>
          <DialogDescription>{project.name} will be marked as completed.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="completion-date">Completion date</Label>
            <DatePicker
              id="completion-date"
              value={completionDate}
              onChange={setCompletionDate}
              className="w-full sm:w-48"
            />
          </div>

          {showAllocationWarning ? (
            <div className="space-y-3 rounded-md border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-status-warning">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  {assignmentCount} designer{assignmentCount === 1 ? "" : "s"} still{" "}
                  {assignmentCount === 1 ? "has" : "have"} allocations after{" "}
                  {formatDateDisplay(completionDate)}.
                </p>
              </div>
              <RadioGroup
                value={allocationChoice}
                onValueChange={(value) => setAllocationChoice(value as AllocationChoice)}
                className="text-foreground"
              >
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="keep" />
                  Keep allocations as historical records
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="end" />
                  End allocations on completion date
                </Label>
              </RadioGroup>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Complete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { MarkCompleteDialog }
export type { MarkCompleteDialogProps }
