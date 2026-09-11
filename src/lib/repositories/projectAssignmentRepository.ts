// ProjectAssignment repository. A "Lead" row for a project IS its Project
// Design Lead (docs/DECISIONS.md) — there is no separate field for it.
// Filtering by project/designer/role is a derived-data concern and lives in
// the selectors layer (see selectors/projectSelectors.ts), not here.

import { createRemovableRepository } from "./createRepository";
import { seedProjectAssignments } from "@/lib/seed/seedData";
import type { ProjectAssignment } from "@/lib/domain/types";

const repo = createRemovableRepository<ProjectAssignment>(
  "projectAssignments",
  seedProjectAssignments,
);

export const { getAll, getById, create, update } = repo;

/**
 * Removes this assignment row (e.g. unassigning a support designer, or
 * clearing a project's Lead). Unlike master data, assignment rows have no
 * historical-identity requirement, so hard removal is correct here (PRD §25).
 */
export function remove(id: string): ProjectAssignment | undefined {
  return repo.remove(id);
}
