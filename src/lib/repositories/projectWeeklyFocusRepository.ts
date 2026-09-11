// ProjectWeeklyFocus repository. Zero or many rows per (project_id,
// week_start_date); free-text `title`/`description` (docs/PRD.MD §8.9).

import { createRemovableRepository } from "./createRepository";
import { seedProjectWeeklyFocus } from "@/lib/seed/seedData";
import type { ProjectWeeklyFocus } from "@/lib/domain/types";

const repo = createRemovableRepository<ProjectWeeklyFocus>(
  "projectWeeklyFocus",
  seedProjectWeeklyFocus,
);

export const { getAll, getById, create, update } = repo;

/**
 * Removes this weekly focus row (e.g. dropped while reconciling Edit
 * Project's Weekly sub-view against what was originally loaded). Like
 * ProjectMonthlyTarget, this has no historical-identity requirement, so hard
 * removal is correct here (docs/DECISIONS.md).
 */
export function remove(id: string): ProjectWeeklyFocus | undefined {
  return repo.remove(id);
}
