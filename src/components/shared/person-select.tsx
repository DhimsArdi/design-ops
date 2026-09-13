"use client"

// Picking one person, anywhere the app asks for one: Squad Lead (Master Data →
// Squads) and Project Design Lead (Add/Edit Project, Step 3). Replaces the
// plain `<Select>` both used to be (docs/PRD.MD §14.11).
//
// Three things a bare name list couldn't do, and the reason this exists:
//
//   search       a name list is fine at six designers and unusable at sixty
//   who is who   two "Design Lead"s are told apart by their job title, not by
//                staring at the name
//   "(Me)"       the signed-in user has to be findable as themselves, and
//                labelled so — while the value stored is still their real
//                designer id, never a sentinel (src/lib/identity/person-display.ts)
//
// Shape is deliberately the one FilterSelect and AssignLeadControl already use
// — trigger button, search box, checkmark list — so this reads as the same
// control the app uses everywhere else, not a new kind of dropdown.

import { useMemo, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { isCurrentPerson } from "@/lib/identity/person-display"
import type { Designer } from "@/lib/domain/types"
import { cn } from "cn"

interface PersonSelectProps {
  id?: string
  /** Selected designer id, or null for none. */
  value: string | null
  onChange: (next: string | null) => void
  /** Candidates, in the order they should appear. The caller decides who is eligible. */
  people: Designer[]
  /** `Profile.designer_id` — the one row that renders as "(Me)". Null when the account has no person record. */
  currentDesignerId: string | null
  /** Wording for the no-selection row and the empty trigger. Omit `emptyOption` to make the field required. */
  emptyOption?: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

function PersonSelect({
  id,
  value,
  onChange,
  people,
  currentDesignerId,
  emptyOption = "Unassigned",
  disabled,
  className,
  "aria-label": ariaLabel,
}: PersonSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = people.find((person) => person.id === value)

  // Job title is searched as well as name: "researcher" is how you find the
  // researcher when you can't remember which of them it was.
  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return people
    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(trimmed) ||
        person.job_title.toLowerCase().includes(trimmed),
    )
  }, [people, query])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function select(next: string | null) {
    onChange(next)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "h-9 w-full justify-between px-2.5 font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <PersonAvatar person={selected} size="sm" />
            <span className="truncate text-foreground">
              {selected.name}
              {isCurrentPerson(selected.id, currentDesignerId) ? " (Me)" : ""}
            </span>
          </span>
        ) : (
          <span className="truncate">{emptyOption}</span>
        )}
        <ChevronDown className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      {/* Matches the field it drops from rather than the primitive's fixed
          w-72, so the list lines up under a full-width form field. Inline
          because `--anchor-width` is set by the positioner at runtime. */}
      <PopoverContent
        align="start"
        className="min-w-64 p-1"
        style={{ width: "var(--anchor-width)" }}
      >
        <div className="relative px-1 pt-1 pb-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people…"
            aria-label="Search people"
            className="h-8 pl-7 text-sm"
          />
        </div>

        <div className="max-h-64 overflow-y-auto">
          {emptyOption ? (
            <button
              type="button"
              onClick={() => select(null)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <Check className={cn("size-3.5 shrink-0", value !== null && "invisible")} />
              <span className="truncate text-muted-foreground">{emptyOption}</span>
            </button>
          ) : null}

          {matches.map((person) => {
            const active = person.id === value
            const isMe = isCurrentPerson(person.id, currentDesignerId)
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => select(person.id)}
                aria-current={active ? "true" : undefined}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Check className={cn("size-3.5 shrink-0", !active && "invisible")} />
                <PersonAvatar person={person} size="sm" />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-foreground",
                      active && "font-medium",
                    )}
                  >
                    {person.name}
                    {isMe ? <span className="text-muted-foreground"> (Me)</span> : null}
                  </span>
                  {/* One secondary line, not a row of metadata: the title is
                      what tells two designers apart (PRD §14.11). Inactive is
                      appended here rather than given a badge — it only shows
                      for someone already selected who has since been retired. */}
                  {person.job_title || person.status === "Inactive" ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {[person.job_title, person.status === "Inactive" ? "Inactive" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}

          {matches.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No matching people.
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { PersonSelect }
export type { PersonSelectProps }
