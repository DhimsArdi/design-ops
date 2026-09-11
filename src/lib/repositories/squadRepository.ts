// Squad repository (master data). Never hard-deleted — use setStatus to
// mark a Squad Inactive instead (docs/DECISIONS.md).
//
// Squad members are NOT stored or repository-managed here: they are always
// derived from Designer.home_squad_id (see selectors/squadSelectors.ts).

import { createRepository } from "./createRepository";
import { seedSquads } from "@/lib/seed/seedData";
import type { Squad } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRepository<Squad>("squads", seedSquads);

export const { getAll, getById, create, update } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire a Squad. */
export function setStatus(id: string, status: EntityStatus): Squad | undefined {
  return repo.update(id, { status });
}
