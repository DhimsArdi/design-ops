"use client"

// Subscribes a component to a localStorage-backed repository's getAll() list
// as a React external store (docs/DECISIONS.md "MVP persistence:
// localStorage"). These repositories are plain synchronous reads/writes, not
// reactive on their own, so after a create/update/setStatus call the caller
// must invoke the returned `refresh()` for subscribed components to re-render
// with the latest data.
//
// Built on useSyncExternalStore (not `useEffect` + `setState` on mount) for
// two reasons: it keeps the very first client render's data identical to the
// server-rendered HTML (both start from `getServerSnapshot`'s stable empty
// array, since localStorage doesn't exist on the server), avoiding a
// hydration mismatch; and it satisfies the react-hooks "set-state-in-effect"
// rule, which flags calling setState synchronously inside a useEffect body.

import { useCallback, useRef, useSyncExternalStore } from "react"

const EMPTY_SNAPSHOT: unknown[] = []

interface ListRepository<T> {
  getAll(): T[]
}

export function useRepositoryList<T>(repository: ListRepository<T>) {
  const listenersRef = useRef<Set<() => void>>(new Set())
  const snapshotRef = useRef<T[] | null>(null)

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const getSnapshot = useCallback(() => {
    if (snapshotRef.current === null) {
      snapshotRef.current = repository.getAll()
    }
    return snapshotRef.current
  }, [repository])

  const getServerSnapshot = useCallback(() => EMPTY_SNAPSHOT as T[], [])

  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const refresh = useCallback(() => {
    snapshotRef.current = repository.getAll()
    listenersRef.current.forEach((listener) => listener())
  }, [repository])

  return [data, refresh] as const
}
