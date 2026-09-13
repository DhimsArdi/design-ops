// Designer repository (master data). setStatus retires a Designer without
// deleting it; remove() hard-deletes one, guarded by a usage check at the
// call site before it's ever invoked (docs/DECISIONS.md).

import { createRemovableRepository } from "./createRepository";
import { supabase } from "@/lib/supabase/client";
import * as store from "@/lib/store/dataStore";
import * as projectAssignmentRepository from "./projectAssignmentRepository";
import * as squadRepository from "./squadRepository";
import type { Designer } from "@/lib/domain/types";
import type { EntityStatus } from "@/lib/domain/enums";

const repo = createRemovableRepository<Designer>("designers");

export const { getAll, getById, create, update, remove } = repo;

/**
 * Creates a Designer and waits for Supabase to confirm the insert before
 * returning — unlike `create`, which is optimistic and fire-and-forget. Needed
 * the one place a just-created Designer's id is about to be written into
 * another row's foreign key in the same action
 * (`profiles.designer_id`, Settings → Profile / Onboarding self-provisioning,
 * docs/DECISIONS.md): that write is itself awaited and checked by Postgres
 * against the real table, so the insert has to have actually landed first, or
 * it fails with a foreign-key violation on a row that (from the browser's own
 * optimistic cache) looks like it already exists.
 */
export async function createAwaited(data: Omit<Designer, "id">): Promise<Designer> {
  const record: Designer = { ...data, id: crypto.randomUUID() };
  const { error } = await supabase.from("designers").insert(record);
  if (error) throw new Error(error.message);
  store.setLocal("designers", [...getAll(), record]);
  return record;
}

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

/**
 * Moves several Designers into one Squad in a single write — the bulk form of
 * `update(id, { home_squad_id })`, used by the Add-members flow in Master Data
 * → Squads and Teams.
 *
 * One request rather than one per designer: a five-person move can't half-apply
 * because the connection dropped partway through a loop, and the cache updates
 * once instead of five times.
 */
export function setHomeSquad(ids: readonly string[], squadId: string): void {
  if (ids.length === 0) return;
  const moving = new Set(ids);
  store.write(
    "designers",
    repo
      .getAll()
      .map((designer) =>
        moving.has(designer.id)
          ? { ...designer, home_squad_id: squadId }
          : designer,
      ),
    (from) => from.update({ home_squad_id: squadId }).in("id", [...ids]),
  );
}
