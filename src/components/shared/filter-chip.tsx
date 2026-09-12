// Small removable token for the active-filter row: a neutral label plus a
// trailing "x" that clears just that one filter. Deliberately restrained
// (no color-coding per filter type) — see docs/DECISIONS.md.

import { X } from "lucide-react"
import { cn } from "cn"

interface FilterChipProps {
  label: string
  onRemove: () => void
  className?: string
}

function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md border border-border bg-muted/50 pl-2 pr-1 text-xs font-medium text-foreground",
        className
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
        <span className="sr-only">Remove {label} filter</span>
      </button>
    </span>
  )
}

export { FilterChip }
export type { FilterChipProps }
