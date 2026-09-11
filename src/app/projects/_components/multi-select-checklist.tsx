// Generic multi-select checklist: a scrollable, bordered list of checkbox
// rows. Used by the Project form wizard for Product Owner / Project Admin
// (stakeholders) and Supporting Designers — anywhere PRD §21/§23 calls for
// "multi-select from Master Data" at a scale too small to need a combobox
// library (a handful to a few dozen rows).

import type { ReactNode } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "cn"

interface ChecklistOption {
  id: string
  label: ReactNode
  description?: ReactNode
}

interface MultiSelectChecklistProps {
  /** Prefixes generated element ids so two checklists on the same page never collide. */
  idPrefix: string
  options: ChecklistOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  emptyMessage?: string
  className?: string
}

function MultiSelectChecklist({
  idPrefix,
  options,
  selectedIds,
  onChange,
  emptyMessage = "No options available.",
  className,
}: MultiSelectChecklistProps) {
  function toggle(id: string, checked: boolean) {
    if (checked) {
      if (!selectedIds.includes(id)) onChange([...selectedIds, id])
    } else {
      onChange(selectedIds.filter((existing) => existing !== id))
    }
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div
      className={cn(
        "max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-input",
        className,
      )}
    >
      {options.map((option) => {
        const checked = selectedIds.includes(option.id)
        const inputId = `${idPrefix}-${option.id}`
        return (
          <label
            key={option.id}
            htmlFor={inputId}
            className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Checkbox
              id={inputId}
              checked={checked}
              onCheckedChange={(next) => toggle(option.id, next)}
              className="mt-0.5"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export { MultiSelectChecklist }
export type { ChecklistOption, MultiSelectChecklistProps }
