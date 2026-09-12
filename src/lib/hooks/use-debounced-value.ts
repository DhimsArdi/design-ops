// Generic debounce for a fast-changing value (e.g. a search input) so
// expensive downstream work (filtering, search) doesn't re-run on every
// keystroke. Purely a timing utility — no knowledge of what it debounces.

import { useEffect, useState } from "react"

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}

export { useDebouncedValue }
