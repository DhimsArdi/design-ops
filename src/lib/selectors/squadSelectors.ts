// Derived data for Squad (docs/PRD.MD §8.2, §16): membership is never stored
// redundantly — it's always computed from Designer.home_squad_id.

import * as designerRepository from "@/lib/repositories/designerRepository";
import * as squadRepository from "@/lib/repositories/squadRepository";
import * as projectRepository from "@/lib/repositories/projectRepository";
import * as squadDesignerMembershipRepository from "@/lib/repositories/squadDesignerMembershipRepository";
import type { Designer, Project, Squad } from "@/lib/domain/types";

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
 * Members to list/count wherever the Squad Lead is already shown as its own
 * field (Squad View card, Squad Detail, Master Data table, Overview) — the
 * lead is automatically part of the squad and shouldn't also be listed or
 * counted as a separate designer there. Full headcount (staffing filters,
 * delete-usage guard, cross-squad support) keeps using getSquadMembers.
 */
export function getSquadDesignerRoster(squadId: string): Designer[] {
  const squad = squadRepository.getById(squadId);
  return getSquadMembers(squadId).filter((designer) => designer.id !== squad?.lead_designer_id);
}

/**
 * Designers shared into this squad beyond their home squad (Teams → Squad
 * View, docs/PRD.MD §13.1) — an explicit, stored membership, distinct from
 * project-based cross-squad support (isCrossSquadAssignment), which stays
 * fully derived and untouched by this table.
 */
export function getSquadSharedMembers(squadId: string): Designer[] {
  const designerIds = new Set(
    squadDesignerMembershipRepository
      .getAll()
      .filter((row) => row.squad_id === squadId)
      .map((row) => row.designer_id),
  );
  return designerRepository.getAll().filter((designer) => designerIds.has(designer.id));
}

/**
 * Every squad this designer belongs to — their home (Primary) squad first,
 * then every squad they've been shared into (docs/PRD.MD §13.1).
 */
export function getDesignerSquadMemberships(
  designerId: string,
): { squad: Squad; type: "primary" | "shared" }[] {
  const designer = designerRepository.getById(designerId);
  if (!designer) return [];

  const memberships: { squad: Squad; type: "primary" | "shared" }[] = [];
  const home = designer.home_squad_id ? squadRepository.getById(designer.home_squad_id) : undefined;
  if (home) memberships.push({ squad: home, type: "primary" });

  for (const row of squadDesignerMembershipRepository.getAll()) {
    if (row.designer_id !== designerId) continue;
    const squad = squadRepository.getById(row.squad_id);
    if (squad) memberships.push({ squad, type: "shared" });
  }
  return memberships;
}

/** Non-archived projects this squad currently owns (Squad View's Projects section). */
export function getSquadOwnedProjects(squadId: string): Project[] {
  return projectRepository
    .getAll()
    .filter((project) => project.owner_squad_id === squadId && !project.is_archived);
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
