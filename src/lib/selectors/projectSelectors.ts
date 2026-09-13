// Derived data for Project (docs/PRD.MD §8.6-8.7, §14.1, §26, §32).
//
// No allocation/utilization/capacity/workload calculations here or anywhere
// else in the app (docs/PRD.MD) — these are structural/status selectors only.

import * as designerRepository from "@/lib/repositories/designerRepository";
import * as projectAssignmentRepository from "@/lib/repositories/projectAssignmentRepository";
import * as projectRepository from "@/lib/repositories/projectRepository";
import * as projectWeeklyFocusRepository from "@/lib/repositories/projectWeeklyFocusRepository";
import type { Designer, Project, ProjectAssignment, ProjectWeeklyFocus } from "@/lib/domain/types";
import type { ProjectStatus } from "@/lib/domain/enums";

/** All ProjectAssignment rows (Lead + Support) for one project. */
export function getProjectAssignments(projectId: string): ProjectAssignment[] {
  return projectAssignmentRepository
    .getAll()
    .filter((assignment) => assignment.project_id === projectId);
}

/**
 * The Designer on the "Lead" ProjectAssignment row for this project — i.e.
 * the Project Design Lead. undefined means "Unassigned", a normal, valid
 * state (docs/DECISIONS.md, docs/PRD.MD §26), not an error.
 */
export function getProjectLead(projectId: string): Designer | undefined {
  const lead = getProjectAssignments(projectId).find(
    (assignment) => assignment.project_role === "Lead",
  );
  return lead ? designerRepository.getById(lead.designer_id) : undefined;
}

/** The Designers on every "Support" ProjectAssignment row for this project (zero or many). */
export function getProjectSupportDesigners(projectId: string): Designer[] {
  return getProjectAssignments(projectId)
    .filter((assignment) => assignment.project_role === "Support")
    .map((assignment) => designerRepository.getById(assignment.designer_id))
    .filter((designer): designer is Designer => designer !== undefined);
}

/**
 * True when a designer's home squad differs from the project's owner squad
 * (docs/PRD.MD §32). Always derived at read time — never stored, never a
 * manually editable flag.
 */
export function isCrossSquadAssignment(
  project: Project,
  designer: Designer,
): boolean {
  return designer.home_squad_id !== project.owner_squad_id;
}

/**
 * "Active Projects" (docs/DECISIONS.md, docs/PRD.MD §14.1): Status ∈
 * {Planning, In Progress} only — On Hold/Completed/Cancelled are excluded.
 *
 * `is_archived` is an independent flag and is intentionally NOT filtered
 * here; a screen that also needs to hide archived projects composes that
 * itself (e.g. `getActiveProjects().filter((p) => !p.is_archived)`).
 */
export function getActiveProjects(): Project[] {
  return projectRepository
    .getAll()
    .filter(
      (project) => project.status === "Planning" || project.status === "In Progress",
    );
}

/**
 * A Completed or Cancelled project no longer needs day-to-day tracking —
 * the shared definition of "terminal" (docs/PRD.MD §10, §25), replacing what
 * used to be scattered `status !== "Done"` checks across Overview, Timeline,
 * and the Projects list.
 */
export function isTerminalStatus(status: ProjectStatus): boolean {
  return status === "Completed" || status === "Cancelled";
}

/**
 * Projects with no "Lead" ProjectAssignment row — the Unassigned Projects
 * set (docs/PRD.MD §26). Visibility only; not a validation error.
 */
export function getUnassignedProjects(): Project[] {
  return projectRepository
    .getAll()
    .filter((project) => getProjectLead(project.id) === undefined);
}

/**
 * Sentinel value for "Design Lead" filter UIs (Projects page) and drill-down
 * links (Overview's "Unassigned Projects" stat) — a Project's Design Lead is
 * derived from ProjectAssignment (§8.7), not a designer id, so filtering by
 * "no Lead assigned" needs a value distinct from any real designer's UUID.
 */
export const UNASSIGNED_DESIGN_LEAD = "unassigned";

/**
 * All Project Weekly Focus rows for one project (docs/PRD.MD §8.9), sorted
 * chronologically by week. A project with none returns an empty array — a
 * normal state, not an error.
 */
export function getProjectWeeklyFocus(projectId: string): ProjectWeeklyFocus[] {
  return projectWeeklyFocusRepository
    .getAll()
    .filter((item) => item.project_id === projectId)
    .sort((a, b) => a.week_start_date.localeCompare(b.week_start_date));
}

/** Just this project's Weekly Focus rows for one specific week (zero or many). */
export function getWeeklyFocusForWeek(
  projectId: string,
  weekStartDate: string,
): ProjectWeeklyFocus[] {
  return getProjectWeeklyFocus(projectId).filter(
    (item) => item.week_start_date === weekStartDate,
  );
}
