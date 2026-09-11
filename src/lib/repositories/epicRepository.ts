// Epic repository (master data). Never hard-deleted — use setStatus to
// mark an Epic Inactive instead (docs/DECISIONS.md).

import { createRepository } from "./createRepository";
import { seedEpics } from "@/lib/seed/seedData";
import type { Epic } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRepository<Epic>("epics", seedEpics);

export const { getAll, getById, create, update } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire an Epic. */
export function setStatus(id: string, status: EntityStatus): Epic | undefined {
  return repo.update(id, { status });
}
