// Small controlled search box shared by every Master Data list page (and,
// later, Projects/People search): a shadcn Input with a leading search icon
// and a trailing clear button that only appears once there's something to
// clear. Kept fully controlled and generic — no debouncing, filtering, or
// entity-specific logic lives here, that stays with each page's own state.

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function SearchInput({ value, onChange, placeholder = "Search…", className }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn("pl-8", value && "pr-8")}
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
