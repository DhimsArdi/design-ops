// ProjectAssignment repository. A "Lead" row for a project IS its Project
// Design Lead (docs/DECISIONS.md) — there is no separate field for it.
// Filtering by project/designer/role is a derived-data concern and lives in
// the selectors layer (see selectors/projectSelectors.ts), not here.

import { createRemovableRepository } from "./createRepository";
import type { ProjectAssignment } from "@/lib/domain/types";
import type { ProjectRole } from "@/lib/domain/enums";

const repo = createRemovableRepository<ProjectAssignment>("project_assignments");

export const { getAll, getById, create, update } = repo;

/**
 * Removes this assignment row (e.g. unassigning a support designer, or
 * clearing a project's Lead). Unlike master data, assignment rows have no
 * historical-identity requirement, so hard removal is correct here (PRD §25).
 */
export function remove(id: string): ProjectAssignment | undefined {
  return repo.remove(id);
}

/**
 * Sets a project's whole Lead+Support roster to exactly `desired` — removes
 * whatever rows are no longer wanted, creates whatever's missing, and leaves
 * an already-matching row untouched. `desired` is expected to already be a
 * valid roster (zero-or-one Lead, no designer repeated) — that reconciliation
 * (e.g. "promoting" a Support designer to Lead drops their Support row) is
 * the caller's job, since it depends on which single field the caller is
 * editing (docs/PRD.MD §8.7).
 *
 * The one place this reconciliation is implemented: the Add/Edit Project
 * wizard's submit, `AssignLeadControl`'s inline Lead edit, and the Board's
 * `AssignTeamDialog` all call this instead of each diffing rows themselves.
 */
export function reconcile(
  projectId: string,
  desired: { designerId: string; role: ProjectRole }[],
): void {
  const current = getAll().filter((assignment) => assignment.project_id === projectId);

  for (const assignment of current) {
    const stillWanted = desired.some(
      (want) => want.designerId === assignment.designer_id && want.role === assignment.project_role,
    );
    if (!stillWanted) remove(assignment.id);
  }

  for (const want of desired) {
    const alreadyExists = current.some(
      (assignment) => assignment.designer_id === want.designerId && assignment.project_role === want.role,
    );
    if (!alreadyExists) {
      create({ project_id: projectId, designer_id: want.designerId, project_role: want.role });
    }
  }
}
