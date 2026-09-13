// Squad repository (master data). setStatus retires a Squad without
// deleting it; remove() hard-deletes one, guarded by a usage check at the
// call site before it's ever invoked (docs/DECISIONS.md).
//
// Squad members are NOT stored or repository-managed here: they are always
// derived from Designer.home_squad_id (see selectors/squadSelectors.ts).

import { createRemovableRepository } from "./createRepository";
import type { Squad } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRemovableRepository<Squad>("squads");

export const { getAll, getById, create, update, remove } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire a Squad. */
export function setStatus(id: string, status: EntityStatus): Squad | undefined {
  return repo.update(id, { status });
}
