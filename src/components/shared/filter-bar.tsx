// The single filter toolbar used by every list screen (Projects, Timeline,
// People, Teams, and all five Master Data pages). It owns the parts that
// used to drift page by page — search box width, control spacing, and the
// wording/placement/size of the clear action — so a page only supplies its
// own filter controls as children.
//
// Pages that filter without a text query (Timeline) simply omit `search`.
// Pages that surface active filters as removable tokens (Projects) pass
// `chips`; the chip row renders only when there are chips to show, so a
// search-only state never leaves an empty strip behind.
//
// Pages with a presentation control (Board/List/Table, Table/Squad) pass it
// as `leading` so it sits in the same row as Search/Filters, pinned to the
// opposite side via `justify-between` — one cohesive toolbar rather than the
// view switcher and the filters stacked on separate rows (see
// docs/DECISIONS.md). Pages without one simply omit it, which leaves the row
// exactly as before (`justify-start`, no layout change).

"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/shared/search-input"
import { cn } from "cn"

interface FilterBarSearch {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

interface FilterBarProps {
  /** A presentation control (e.g. a Board/List/Table switcher) sharing this row. */
  leading?: ReactNode
  /** Omit entirely on screens that filter without a text query. */
  search?: FilterBarSearch
  /** The page's own filter controls — FilterSelect / FilterMultiSelect / Switch / popover. */
  children?: ReactNode
  /** Removable tokens for active filters; rendered as a second row when non-empty. */
  chips?: ReactNode
  hasFiltersApplied: boolean
  onClear: () => void
}

function FilterBar({ leading, search, children, chips, hasFiltersApplied, onClear }: FilterBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const hasSearch = Boolean(search)

  // ⌘K / Ctrl+K focuses the search box. Registered here rather than per page
  // so every searchable screen gets the same shortcut; a page only ever
  // renders one FilterBar, so there's nothing to collide with.
  useEffect(() => {
    if (!hasSearch) return
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasSearch])

  return (
    <div className="space-y-2">
      <div className={cn("flex flex-wrap items-center gap-2", leading && "justify-between")}>
        {leading}

        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <SearchInput
              ref={searchInputRef}
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
              className="min-w-32 max-w-56 flex-1"
            />
          ) : null}

          {children}

          {hasFiltersApplied ? (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onClear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {chips ? <div className="flex flex-wrap items-center gap-1.5">{chips}</div> : null}
    </div>
  )
}

export { FilterBar }
export type { FilterBarProps }
