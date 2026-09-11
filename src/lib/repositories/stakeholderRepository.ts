// Stakeholder repository (master data). Never hard-deleted — use setStatus
// to mark a Stakeholder Inactive instead (docs/DECISIONS.md).

import { createRepository } from "./createRepository";
import { seedStakeholders } from "@/lib/seed/seedData";
import type { Stakeholder } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRepository<Stakeholder>("stakeholders", seedStakeholders);

export const { getAll, getById, create, update } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire a Stakeholder. */
export function setStatus(
  id: string,
  status: EntityStatus,
): Stakeholder | undefined {
  return repo.update(id, { status });
}
