"use client"

// Subscribes a component to a repository's getAll() list as a React external
// store (docs/DECISIONS.md "Supabase behind a synchronous in-memory cache").
//
// The subscription is to the shared cache in dataStore, so a component
// re-renders on any change to the data it reads — whether that change came from
// this browser or, via realtime, from someone else's. The returned `refresh()`
// is kept because callers still hold it from when repository writes were inert
// localStorage calls that notified nobody; it now costs nothing and needs no
// call site to change.
//
// Built on useSyncExternalStore (not `useEffect` + `setState` on mount) for two
// reasons: it keeps the very first client render's data identical to the
// server-rendered HTML (both start from `getServerSnapshot`'s stable empty
// array, since the cache is browser-only), avoiding a hydration mismatch; and
// it satisfies the react-hooks "set-state-in-effect" rule, which flags calling
// setState synchronously inside a useEffect body.

import { useCallback, useSyncExternalStore } from "react"
import { subscribe } from "@/lib/store/dataStore"

const EMPTY_SNAPSHOT: unknown[] = []

interface ListRepository<T> {
  getAll(): T[]
}

export function useRepositoryList<T>(repository: ListRepository<T>) {
  // Safe as the store snapshot only because dataStore hands back the same array
  // reference until that table actually changes — a fresh array here would
  // re-render forever.
  const getSnapshot = useCallback(() => repository.getAll(), [repository])
  const getServerSnapshot = useCallback(() => EMPTY_SNAPSHOT as T[], [])

  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  /** No-op kept for call-site compatibility — the store notifies on its own now. */
  const refresh = useCallback(() => {}, [])

  return [data, refresh] as const
}
