// Designer repository (master data). Never hard-deleted — use setStatus to
// mark a Designer Inactive instead (docs/DECISIONS.md).

import { createRepository } from "./createRepository";
import { seedDesigners } from "@/lib/seed/seedData";
import type { Designer } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRepository<Designer>("designers", seedDesigners);

export const { getAll, getById, create, update } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire a Designer. */
export function setStatus(
  id: string,
  status: EntityStatus,
): Designer | undefined {
  return repo.update(id, { status });
}
