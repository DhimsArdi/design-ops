// Small controlled search box used inside the shared filter toolbar
// (components/shared/filter-bar.tsx): a shadcn Input with a leading search
// icon and a trailing clear button that only appears once there's something
// to clear. Kept fully controlled and generic — no debouncing, filtering, or
// entity-specific logic lives here, that stays with each page's own state.
//
// Height is pinned to h-8 (32px, overriding Input's own h-9 default) to
// match the FilterSelect/FilterMultiSelect trigger buttons next to it in the
// toolbar, which render at Button size="sm" (also 32px) — the two used to be
// visibly different heights.

import type { Ref } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ref?: Ref<HTMLInputElement>
}

function SearchInput({ value, onChange, placeholder = "Search…", className, ref }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn("h-8 pl-8", value && "pr-8")}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={() => onChange("")}
        >
          <X />
          <span className="sr-only">Clear search</span>
        </Button>
      ) : null}
    </div>
  )
}

export { SearchInput }
export type { SearchInputProps }
