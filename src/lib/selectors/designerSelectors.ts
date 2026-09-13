// Derived data for Designer (docs/PRD.MD §8.1).

import * as profileRepository from "@/lib/repositories/profileRepository";
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository";
import * as squadRepository from "@/lib/repositories/squadRepository";

/**
 * What still references this Designer — the guard behind Delete (Master
 * Data, docs/DECISIONS.md). Counts every ProjectAssignment/Squad regardless
 * of the referencing project's/squad's own status, since even a fully
 * archived historical project still needs its assignments' designer names
 * to render.
 */
export function getDesignerUsage(designerId: string): { assignmentCount: number; squadLeadCount: number } {
  return {
    assignmentCount: projectAssignmentRepository
      .getAll()
      .filter((assignment) => assignment.designer_id === designerId).length,
    squadLeadCount: squadRepository
      .getAll()
      .filter((squad) => squad.lead_designer_id === designerId).length,
  };
}

/**
 * Whether this Designer row is claimed by a real invited account, rather than
 * created directly in Master Data (docs/PRD.MD "Hubungan Profile, Designer,
 * dan Stakeholder"). There is no field on Designer itself for this — it is
 * `profiles.designer_id` pointing back, which only happens once someone has
 * signed in through a Supabase Auth invite and completed Onboarding (which
 * requires a linked Designer before it lets a designer-role account through,
 * docs/DECISIONS.md "Onboarding requires a linked Designer record"). The
 * unique constraint on `profiles.designer_id` means at most one account can
 * ever claim a given row, so this is a plain existence check, not a count.
 */
export function isDesignerVerified(designerId: string): boolean {
  return profileRepository.getAll().some((profile) => profile.designer_id === designerId);
}
