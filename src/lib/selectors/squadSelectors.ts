// Derived data for Squad (docs/PRD.MD §8.2, §16): membership is never stored
// redundantly — it's always computed from Designer.home_squad_id.

import * as designerRepository from "@/lib/repositories/designerRepository";
import * as squadRepository from "@/lib/repositories/squadRepository";
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
