// Epic repository (master data). setStatus retires an Epic without
// deleting it; remove() hard-deletes one, guarded by a usage check at the
// call site before it's ever invoked (docs/DECISIONS.md).

import { createRemovableRepository } from "./createRepository";
import type { Epic } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRemovableRepository<Epic>("epics");

export const { getAll, getById, create, update, remove } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire an Epic. */
export function setStatus(id: string, status: EntityStatus): Epic | undefined {
  return repo.update(id, { status });
}
