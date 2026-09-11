// Department repository (master data). Never hard-deleted — use setStatus
// to mark a Department Inactive instead (docs/DECISIONS.md).

import { createRepository } from "./createRepository";
import { seedDepartments } from "@/lib/seed/seedData";
import type { Department } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRepository<Department>("departments", seedDepartments);

export const { getAll, getById, create, update } = repo;

/** Master data is never hard-deleted; this is the only supported way to retire a Department. */
export function setStatus(
  id: string,
  status: EntityStatus,
): Department | undefined {
  return repo.update(id, { status });
}
