// Project repository. Project does not use the master data Active/Inactive
// status — it has its own lifecycle `status` (Planning/In Progress/On
// Hold/Completed/Cancelled, updated via plain `update`) plus a separate
// `is_archived` flag, toggled independently via archive/unarchive
// (docs/DECISIONS.md).
//
// remove() hard-deletes a Project — guarded by a confirmation dialog at the
// call site, never a bare click (docs/DECISIONS.md). Unlike the 5 master
// data entities, nothing else in this schema references a Project by id, so
// there's no "still in use" usage check to run first; removeCascade() below
// is the only supported way to delete one.

import { createRemovableRepository } from "./createRepository";
import * as store from "@/lib/store/dataStore";
import type { TableName } from "@/lib/store/dataStore";
import type { Project } from "@/lib/domain/types";
import * as projectAssignmentRepository from "./projectAssignmentRepository";
import * as projectMonthlyTargetRepository from "./projectMonthlyTargetRepository";
import * as projectWeeklyFocusRepository from "./projectWeeklyFocusRepository";

const repo = createRemovableRepository<Project>("projects");

export const { getAll, getById, create, update, remove } = repo;

/** Removes a Project from operational views (Overview/Timeline) without changing its status. */
export function archive(id: string): Project | undefined {
  return repo.update(id, { is_archived: true });
}

/** Reverses archive(); status and assignments are unaffected either way. */
export function unarchive(id: string): Project | undefined {
  return repo.update(id, { is_archived: false });
}

/** The three tables whose rows exist only in relation to a Project. */
const CHILD_TABLES: readonly TableName[] = [
  "project_assignments",
  "project_monthly_targets",
  "project_weekly_focus",
];

/**
 * Hard-deletes a Project and every child row that exists only in relation to
 * it (assignments, monthly targets, weekly focus) — those rows have no
 * historical-identity requirement of their own once their Project is gone
 * (docs/DECISIONS.md). Returns the removed Project, or undefined if no
 * project had this id.
 *
 * The database does the real cascading (ON DELETE CASCADE in
 * supabase/schema.sql), so this sends one DELETE and just drops the children
 * from the cache to match. If that DELETE fails, dataStore refetches all four
 * tables, so the children come back rather than vanishing from a project that
 * still exists.
 */
export function removeCascade(id: string): Project | undefined {
  const removed = repo.getById(id);
  if (!removed) return undefined;

  store.setLocal(
    "project_assignments",
    projectAssignmentRepository.getAll().filter((row) => row.project_id !== id),
  );
  store.setLocal(
    "project_monthly_targets",
    projectMonthlyTargetRepository.getAll().filter((row) => row.project_id !== id),
  );
  store.setLocal(
    "project_weekly_focus",
    projectWeeklyFocusRepository.getAll().filter((row) => row.project_id !== id),
  );

  store.write(
    "projects",
    repo.getAll().filter((project) => project.id !== id),
    (from) => from.delete().eq("id", id),
    CHILD_TABLES,
  );

  return removed;
}
