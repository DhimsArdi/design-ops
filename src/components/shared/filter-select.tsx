// Compact single-select filter control: a trigger button ("Epic" / chosen
// label) that reveals an "All X" reset row plus the option list, optionally
// with a search box. `variant="floating"` (default) opens in a Popover — for
// a top-level toolbar button. `variant="inline"` expands in normal document
// flow instead — for use *inside* another Popover (e.g. the Advanced
// Filters panel); see filter-multiselect.tsx for why nesting floating
// overlays is avoided there.

import { useMemo, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "cn"

interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  allLabel: string
  /** Text shown on the trigger button itself when no value is selected. Defaults to `allLabel`. */
  triggerPlaceholder?: string
  options: FilterSelectOption[]
  value: string
  onChange: (next: string) => void
  searchable?: boolean
  variant?: "floating" | "inline"
  className?: string
}

function FilterSelect({
  label,
  allLabel,
  triggerPlaceholder,
  options,
  value,
  onChange,
  searchable = false,
  variant = "floating",
  className,
}: FilterSelectProps) {
  const [inlineExpanded, setInlineExpanded] = useState(false)
  const [query, setQuery] = useState("")

  const isActive = value !== "all"
  const selectedOption = options.find((option) => option.value === value)

  const visibleOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!searchable || !trimmed) return options
    return options.filter((option) => option.label.toLowerCase().includes(trimmed))
  }, [options, query, searchable])

  function select(next: string) {
    onChange(next)
    setQuery("")
    setInlineExpanded(false)
  }

  const body = (
    <>
      {searchable ? (
        <div className="relative px-1 pt-1 pb-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={variant === "floating"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="h-8 pl-7 text-sm"
          />
        </div>
      ) : null}
      <div className="max-h-56 overflow-y-auto">
        <button
          type="button"
          onClick={() => select("all")}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
            !isActive && "font-medium text-foreground"
          )}
        >
          <Check className={cn("size-3.5 shrink-0", isActive && "invisible")} />
          <span className="truncate">{allLabel}</span>
        </button>
        {visibleOptions.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => select(option.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                active && "font-medium text-foreground"
              )}
            >
              <Check className={cn("size-3.5 shrink-0", !active && "invisible")} />
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
        {searchable && visibleOptions.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches.</p>
        ) : null}
      </div>
    </>
  )

  const triggerLabel = (
    <span className="truncate">
      {isActive ? (selectedOption?.label ?? label) : (triggerPlaceholder ?? allLabel)}
    </span>
  )

  if (variant === "inline") {
    return (
      <div className={className}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-full justify-between px-2", isActive ? "text-foreground" : "text-muted-foreground")}
          onClick={() => setInlineExpanded((open) => !open)}
        >
          {triggerLabel}
          <ChevronDown className={cn("shrink-0 text-muted-foreground transition-transform", inlineExpanded && "rotate-180")} />
        </Button>
        {inlineExpanded ? <div className="mt-1 rounded-md border border-border">{body}</div> : null}
      </div>
    )
  }

  return (
    <Popover
      onOpenChange={(next) => {
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("max-w-48 justify-between", isActive ? "text-foreground" : "text-muted-foreground", className)}
          />
        }
      >
        {triggerLabel}
        <ChevronDown className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {body}
      </PopoverContent>
    </Popover>
  )
}

export { FilterSelect }
export type { FilterSelectOption, FilterSelectProps }
