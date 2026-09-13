// Shared (non-home) squad membership repository (Teams → Squad View,
// docs/PRD.MD §13.1). A designer's Primary Squad is still exactly
// designers.home_squad_id — this repository only ever adds or removes
// *additional* rows on top of that, and never touches home_squad_id itself.

import { createRemovableRepository } from "./createRepository";
import * as designerRepository from "./designerRepository";
import type { SquadDesignerMembership } from "@/lib/domain/types";

const repo = createRemovableRepository<SquadDesignerMembership>("squad_designer_memberships");

export const { getAll, getById, remove } = repo;

/**
 * Shares designerId into squadId. A no-op (returns the existing row, or
 * undefined) when the membership already exists or when squadId is already
 * that designer's home squad — both are "already in this squad," not a new
 * state to record, and this is the one place that invariant is enforced so
 * every caller (drag-and-drop, the allocation dialog) gets it for free.
 */
export function addMembership(
  designerId: string,
  squadId: string,
): SquadDesignerMembership | undefined {
  const designer = designerRepository.getById(designerId);
  if (!designer || designer.home_squad_id === squadId) return undefined;

  const existing = getAll().find(
    (row) => row.designer_id === designerId && row.squad_id === squadId,
  );
  if (existing) return existing;

  return repo.create({ designer_id: designerId, squad_id: squadId });
}

/** Removes designerId's shared membership in squadId, if one exists. */
export function removeMembership(designerId: string, squadId: string): void {
  const existing = getAll().find(
    (row) => row.designer_id === designerId && row.squad_id === squadId,
  );
  if (existing) remove(existing.id);
}
