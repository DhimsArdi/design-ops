"use client"

// Multi-select for a long list of records: a trigger that opens a searchable
// checklist, with the current selection listed beneath it as removable rows.
//
// MultiSelectChecklist (the always-open bordered list) is still the right
// control inside a dialog, where the list *is* the content. On a form page it
// is not: Product Owner, Project Admin / PIC and Supporting Designers each put
// every stakeholder or designer on screen permanently, so one section of the
// Add Project wizard scrolled like a directory (docs/PRD.MD §21, §23). Here the
// roster sits behind the trigger and only the chosen people stay visible.
//
// Shape is deliberately PersonSelect's — trigger button, search box, checkmark
// list — so this reads as the same control the app uses everywhere else. The
// difference is that it keeps the popover open while you tick, because picking
// three people should not mean opening the same list three times.

import { useMemo, useState, type ReactNode } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "cn"

interface SearchableMultiSelectOption {
  id: string
  /** Plain text: the row's first line, what search matches, and what a selected row reads as. */
  label: string
  /** Second line — job title, squad, whatever tells two similar rows apart. */
  description?: string
  /** Leading visual, used in both the list row and the selected row (an avatar). */
  visual?: ReactNode
  /** Trailing marker on the list row only — e.g. a Cross-squad badge. */
  badge?: ReactNode
}

interface SearchableMultiSelectProps {
  id?: string
  /** Candidates, in the order they should appear. The caller decides who is eligible. */
  options: SearchableMultiSelectOption[]
  selectedIds: string[]
  onChange: (next: string[]) => void
  /** Trigger wording while nothing is selected — "Search or select product owner…". */
  placeholder: string
  searchPlaceholder?: string
  /** Replaces the trigger entirely when there is nothing to choose from. */
  emptyMessage?: string
  /** Heading above the selected rows. Omit for none. */
  selectionLabel?: string
  noMatchMessage?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
}

function SearchableMultiSelect({
  id,
  options,
  selectedIds,
  onChange,
  placeholder,
  searchPlaceholder = "Search…",
  emptyMessage = "No options available.",
  selectionLabel,
  noMatchMessage = "No matches.",
  invalid,
  disabled,
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  // Both lines are searched: "researcher" is how you find the researcher when
  // you cannot remember which of them it was.
  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(trimmed) ||
        (option.description ?? "").toLowerCase().includes(trimmed),
    )
  }, [options, query])

  // Option order, not click order, so the list below does not reshuffle as
  // people are added and removed.
  const selected = useMemo(
    () => options.filter((option) => selectedIds.includes(option.id)),
    [options, selectedIds],
  )

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function toggle(optionId: string) {
    onChange(
      selectedIds.includes(optionId)
        ? selectedIds.filter((existing) => existing !== optionId)
        : [...selectedIds, optionId],
    )
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-invalid={invalid || undefined}
              className={cn(
                "h-9 w-full justify-between px-2.5 font-normal",
                selected.length === 0 && "text-muted-foreground",
              )}
            />
          }
        >
          <span className="truncate">
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
          </span>
          <ChevronDown className="shrink-0 text-muted-foreground" />
        </PopoverTrigger>

        {/* Matches the field it drops from rather than the primitive's fixed
            w-72; --anchor-width is set by the positioner at runtime. */}
        <PopoverContent align="start" className="min-w-64 p-1" style={{ width: "var(--anchor-width)" }}>
          <div className="relative px-1 pt-1 pb-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 pl-7 text-sm"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {matches.map((option) => {
              const checked = selectedIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(option.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Check className={cn("size-3.5 shrink-0", !checked && "invisible")} />
                  {option.visual}
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-foreground", checked && "font-medium")}>
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {option.badge}
                </button>
              )
            })}

            {matches.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">{noMatchMessage}</p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
        <div className="space-y-1.5">
          {selectionLabel ? (
            <p className="text-xs font-medium text-muted-foreground">{selectionLabel}</p>
          ) : null}
          <ul className="divide-y divide-border rounded-md border border-border">
            {selected.map((option) => (
              <li key={option.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {option.visual}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{option.label}</span>
                  {option.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${option.label}`}
                  onClick={() => toggle(option.id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export { SearchableMultiSelect }
export type { SearchableMultiSelectOption, SearchableMultiSelectProps }
