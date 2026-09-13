// Derived data for Squad (docs/PRD.MD §8.2, §16): membership is never stored
// redundantly — it's always computed from Designer.home_squad_id.

import * as designerRepository from "@/lib/repositories/designerRepository";
import * as squadRepository from "@/lib/repositories/squadRepository";
import * as projectRepository from "@/lib/repositories/projectRepository";
import type { Designer } from "@/lib/domain/types";

/** Every Designer whose home_squad_id is this squad — never stored, always derived. */
export function getSquadMembers(squadId: string): Designer[] {
  return designerRepository
    .getAll()
    .filter((designer) => designer.home_squad_id === squadId);
}

/** The Designer referenced by Squad.lead_designer_id, or undefined if none is set yet. */
export function getSquadLead(squadId: string): Designer | undefined {
  const squad = squadRepository.getById(squadId);
  if (!squad?.lead_designer_id) return undefined;
  return designerRepository.getById(squad.lead_designer_id);
}

/**
 * What still references this Squad — the guard behind Delete (Master Data,
 * docs/DECISIONS.md). Counts every Designer/Project regardless of their own
 * status/archive state, since even a fully archived historical project still
 * needs its owner squad's name to render.
 */
export function getSquadUsage(squadId: string): { designerCount: number; projectCount: number } {
  return {
    designerCount: designerRepository
      .getAll()
      .filter((designer) => designer.home_squad_id === squadId).length,
    projectCount: projectRepository
      .getAll()
      .filter((project) => project.owner_squad_id === squadId).length,
  };
}
