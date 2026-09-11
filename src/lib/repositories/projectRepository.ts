// Project repository. Never hard-deleted. Project does not use the master
// data Active/Inactive status — it has its own lifecycle `status`
// (Proposed/Planning/In Progress/On Hold/Done, updated via plain `update`)
// plus a separate `is_archived` flag, toggled independently via
// archive/unarchive (docs/DECISIONS.md).

import { createRepository } from "./createRepository";
import { seedProjects } from "@/lib/seed/seedData";
import type { Project } from "@/lib/domain/types";

const repo = createRepository<Project>("projects", seedProjects);

export const { getAll, getById, create, update } = repo;

/** Removes a Project from operational views (Overview/Timeline) without changing its status. */
export function archive(id: string): Project | undefined {
  return repo.update(id, { is_archived: true });
}

/** Reverses archive(); status and assignments are unaffected either way. */
export function unarchive(id: string): Project | undefined {
  return repo.update(id, { is_archived: false });
}
