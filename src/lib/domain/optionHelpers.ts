// Shared helpers for building master-data picker options (Select dropdowns
// across the app). Not domain logic itself — just the "don't hide a
// currently-selected value that's since gone Inactive" rule every such
// picker needs, plus the name-sort every such list uses.

import type { EntityStatus } from "@/lib/domain/enums"

/** Active rows, plus any row in `selectedIds` that has since gone Inactive —
 * so editing a record never silently hides a value it already has (e.g. a
 * Home Squad picker, a Department Head picker, a Project's Design Lead). */
export function activeOrSelected<T extends { id: string; status: EntityStatus }>(
  all: T[],
  selectedIds: readonly string[],
): T[] {
  const active = all.filter((item) => item.status === "Active")
  const activeIds = new Set(active.map((item) => item.id))
  const extras = all.filter((item) => selectedIds.includes(item.id) && !activeIds.has(item.id))
  return [...active, ...extras]
}

export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name)
}
