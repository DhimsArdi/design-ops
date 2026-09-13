// Derived data for Designer (docs/PRD.MD §8.1).

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
