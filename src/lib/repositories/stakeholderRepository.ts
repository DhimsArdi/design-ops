// Stakeholder repository (master data). setStatus retires a Stakeholder
// without deleting it; remove() hard-deletes one, guarded by a usage check
// at the call site before it's ever invoked (docs/DECISIONS.md).

import { createRemovableRepository } from "./createRepository";
import * as store from "@/lib/store/dataStore";
import * as departmentRepository from "./departmentRepository";
import * as projectRepository from "./projectRepository";
import type { Project } from "@/lib/domain/types";
import type { Stakeholder } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRemovableRepository<Stakeholder>("stakeholders");

export const { getAll, getById, create, update, remove } = repo;

/** Strips this stakeholder out of a project, or returns the project untouched. */
function withoutStakeholder(project: Project, id: string): Project {
  const isHead = project.department_head_id === id;
  const isOwner = project.product_owner_ids.includes(id);
  const isAdmin = project.project_admin_ids.includes(id);
  if (!isHead && !isOwner && !isAdmin) return project;
  return {
    ...project,
    department_head_id: isHead ? null : project.department_head_id,
    product_owner_ids: project.product_owner_ids.filter((x) => x !== id),
    project_admin_ids: project.project_admin_ids.filter((x) => x !== id),
  };
}

/**
 * Deletes a Stakeholder even though records still point at them — the "Delete
 * anyway" path (PRD §25). Any Department they headed is left without a head,
 * and they are removed from every project's Product Owner / Project Admin list
 * and from its department-head snapshot.
 *
 * Only the Department side is a real foreign key, which the database nulls
 * itself. The three project references are not — two are `uuid[]` columns and
 * one is a deliberate non-FK snapshot (supabase/schema.sql) — so those projects
 * are updated here. Clearing the snapshot rather than leaving it is the honest
 * outcome: an id pointing at a row that no longer exists is a dangling pointer,
 * not a historical record, and resolves to nothing on screen either way.
 */
export function removeCascade(id: string): Stakeholder | undefined {
  const removed = repo.getById(id);
  if (!removed) return undefined;

  store.setLocal(
    "departments",
    departmentRepository
      .getAll()
      .map((department) =>
        department.department_head_id === id
          ? { ...department, department_head_id: null }
          : department,
      ),
  );

  // One ordinary update per affected project rather than a bulk upsert: this is
  // the same write path every other edit in the app uses, a stakeholder appears
  // on a handful of projects at most, and each update sends only the three
  // fields that actually change instead of a whole row.
  for (const project of projectRepository.getAll()) {
    const next = withoutStakeholder(project, id);
    if (next === project) continue;
    projectRepository.update(project.id, {
      department_head_id: next.department_head_id,
      product_owner_ids: next.product_owner_ids,
      project_admin_ids: next.project_admin_ids,
    });
  }

  store.write(
    "stakeholders",
    repo.getAll().filter((stakeholder) => stakeholder.id !== id),
    (from) => from.delete().eq("id", id),
    ["departments", "projects"],
  );

  return removed;
}

/** Master data is never hard-deleted; this is the only supported way to retire a Stakeholder. */
export function setStatus(
  id: string,
  status: EntityStatus,
): Stakeholder | undefined {
  return repo.update(id, { status });
}
