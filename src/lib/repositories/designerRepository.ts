// Designer repository (master data). setStatus retires a Designer without
// deleting it; remove() hard-deletes one, guarded by a usage check at the
// call site before it's ever invoked (docs/DECISIONS.md).

import { createRemovableRepository } from "./createRepository";
import * as store from "@/lib/store/dataStore";
import * as projectAssignmentRepository from "./projectAssignmentRepository";
import * as squadRepository from "./squadRepository";
import type { Designer } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRemovableRepository<Designer>("designers");

export const { getAll, getById, create, update, remove } = repo;

/**
 * Deletes a Designer even though records still point at them — the "Delete
 * anyway" path (PRD §25). Their Project Assignment rows go with them, and any
 * Squad they led is left without a lead.
 *
 * Both of those are the database's doing: `project_assignments.designer_id`
 * cascades and `squads.lead_designer_id` is ON DELETE SET NULL
 * (supabase/schema.sql). This only mirrors the result into the cache, so one
 * DELETE goes to the server rather than several that could arrive out of order.
 * A failed delete refetches all three tables (see dataStore).
 *
 * Callers are expected to have confirmed with the user first — this discards
 * the record of who designed those projects, permanently.
 */
export function removeCascade(id: string): Designer | undefined {
  const removed = repo.getById(id);
  if (!removed) return undefined;

  store.setLocal(
    "project_assignments",
    projectAssignmentRepository.getAll().filter((row) => row.designer_id !== id),
  );
  store.setLocal(
    "squads",
    squadRepository
      .getAll()
      .map((squad) =>
        squad.lead_designer_id === id ? { ...squad, lead_designer_id: null } : squad,
      ),
  );

  store.write(
    "designers",
    repo.getAll().filter((designer) => designer.id !== id),
    (from) => from.delete().eq("id", id),
    ["project_assignments", "squads"],
  );

  return removed;
}

/** Master data is never hard-deleted; this is the only supported way to retire a Designer. */
export function setStatus(
  id: string,
  status: EntityStatus,
): Designer | undefined {
  return repo.update(id, { status });
}
