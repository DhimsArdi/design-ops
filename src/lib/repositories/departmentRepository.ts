// Department repository (master data). setStatus retires a Department
// without deleting it; remove() hard-deletes one, guarded by a usage check
// at the call site before it's ever invoked (docs/DECISIONS.md).

import { createRemovableRepository } from "./createRepository";
import type { Department } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRemovableRepository<Department>("departments");

export const { getAll, getById, create, update, remove } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire a Department. */
export function setStatus(
  id: string,
  status: EntityStatus,
): Department | undefined {
  return repo.update(id, { status });
}
