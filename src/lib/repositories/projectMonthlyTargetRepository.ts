// ProjectMonthlyTarget repository. One row per (project_id, month); free
// text `target` field (docs/PRD.MD §8.8).

import { createRemovableRepository } from "./createRepository";
import { seedProjectMonthlyTargets } from "@/lib/seed/seedData";
import type { ProjectMonthlyTarget } from "@/lib/domain/types";

const repo = createRemovableRepository<ProjectMonthlyTarget>(
  "projectMonthlyTargets",
  seedProjectMonthlyTargets,
);

export const { getAll, getById, create, update } = repo;

/**
 * Removes this monthly target row (e.g. a month dropped from a shrunk
 * project timeline). Unlike master data, target rows have no
 * historical-identity requirement, so hard removal is correct here (PRD §25).
 */
export function remove(id: string): ProjectMonthlyTarget | undefined {
  return repo.remove(id);
}
