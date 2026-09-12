// Compact multi-select filter control: a trigger button ("Status" / "Status
// · 2") that reveals a checkbox list. `variant="floating"` (default) opens
// the list in a Popover — for a top-level toolbar button. `variant="inline"`
// expands the list in normal document flow instead — for use *inside*
// another Popover (e.g. the Advanced Filters panel), since nesting a second
// floating/portaled overlay inside a Popover risks the outer one treating a
// click into the nested portal as an outside click and dismissing itself.

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "cn"

interface FilterMultiSelectOption {
  value: string
  label: string
}

interface FilterMultiSelectProps {
  label: string
  options: FilterMultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  variant?: "floating" | "inline"
  className?: string
}

function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  variant = "floating",
  className,
}: FilterMultiSelectProps) {
  const [inlineExpanded, setInlineExpanded] = useState(false)
  const hasSelection = selected.length > 0

  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value))
  }

  const triggerLabel = (
    <>
      <span>{label}</span>
      {hasSelection ? <span className="text-foreground">· {selected.length}</span> : null}
    </>
  )

  const list = (
    <div className="max-h-56 overflow-y-auto">
      {options.map((option) => {
        const checked = selected.includes(option.value)
        const inputId = `${label}-${option.value}`
        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Checkbox id={inputId} checked={checked} onCheckedChange={(next) => toggle(option.value, next)} />
            <span className="flex-1">{option.label}</span>
          </label>
        )
      })}
      {hasSelection ? (
        <>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        </>
      ) : null}
    </div>
  )

  if (variant === "inline") {
    return (
      <div className={className}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-full justify-between px-2", hasSelection ? "text-foreground" : "text-muted-foreground")}
          onClick={() => setInlineExpanded((value) => !value)}
        >
          {triggerLabel}
          <ChevronDown className={cn("text-muted-foreground transition-transform", inlineExpanded && "rotate-180")} />
        </Button>
        {inlineExpanded ? <div className="mt-1 rounded-md border border-border">{list}</div> : null}
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(hasSelection ? "text-foreground" : "text-muted-foreground", className)}
          />
        }
      >
        {triggerLabel}
        <ChevronDown className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {list}
      </PopoverContent>
    </Popover>
  )
}

export { FilterMultiSelect }
export type { FilterMultiSelectOption, FilterMultiSelectProps }
