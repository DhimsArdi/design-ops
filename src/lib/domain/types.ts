// Domain interfaces for the Design Portfolio Planner.
// Field lists match docs/PRD.MD §8 (8.1-8.8) exactly. See docs/DECISIONS.md
// for the rationale behind the two non-obvious fields on Project.

import type {
  EntityStatus,
  Priority,
  ProjectHealth,
  ProjectPhase,
  ProjectRole,
  ProjectStatus,
  Seniority,
  StakeholderType,
  TimelineConfidence,
} from "./enums";

// Role-ready per PRD §6: only "admin" exists/is used in MVP (no login UI,
// no Editor/Viewer). Kept as its own type so future roles are additive.
export type UserRole = "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Designer {
  id: string;
  name: string;
  job_title: string;
  seniority: Seniority;
  home_squad_id: string;
  // Initials or image URL — no upload flow in MVP, just a display value.
  avatar: string;
  status: EntityStatus;
}

export interface Squad {
  id: string;
  name: string;
  // Nullable — a squad can exist with no lead assigned yet.
  lead_designer_id: string | null;
  description: string;
  status: EntityStatus;
  // Squad members are NOT stored here — they are derived at read time from
  // every Designer whose home_squad_id equals this squad's id.
}

export interface Department {
  id: string;
  name: string;
  description: string;
  // References Stakeholder.id where stakeholder_type = "Department Head".
  // Nullable — a department can exist before a head is assigned (and a
  // Stakeholder row itself needs a department_id to be created against).
  department_head_id: string | null;
  status: EntityStatus;
}

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  department_id: string;
  stakeholder_type: StakeholderType;
  status: EntityStatus;
}

export interface Epic {
  id: string;
  name: string;
  department_id: string;
  description: string;
  status: EntityStatus;
}

export interface Project {
  id: string;
  name: string;

  epic_id: string;
  department_id: string;

  // Snapshot of Department.department_head_id at the time this Project was
  // created, or last had its department_id changed. NOT a live reference —
  // it does not update if the Department's head changes later (see
  // docs/DECISIONS.md). Null when the Department had no head at snapshot time.
  department_head_id: string | null;
  // Stakeholder ids (stakeholder_type = "Product Owner").
  product_owner_ids: string[];
  // Stakeholder ids (stakeholder_type = "Project Admin / PIC").
  project_admin_ids: string[];

  owner_squad_id: string;

  priority: Priority;
  status: ProjectStatus;
  health: ProjectHealth;
  timeline_confidence: TimelineConfidence;
  // Independent of status — removes a project from Overview/Timeline without
  // changing its lifecycle status or deleting it (see docs/DECISIONS.md).
  is_archived: boolean;

  // "YYYY-MM" month strings (inclusive range).
  start_month: string;
  end_month: string;

  description: string;

  // ISO 8601 timestamps.
  created_at: string;
  updated_at: string;

  // No project-design-lead field here on purpose: it is always derived from
  // ProjectAssignment rows where project_role = "Lead" (see docs/DECISIONS.md).
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  designer_id: string;
  // "Lead" row for a project IS its Project Design Lead. Zero-or-one Lead and
  // zero-or-many Support rows per project; a (project_id, designer_id) pair
  // must be unique.
  project_role: ProjectRole;
}

export interface ProjectMonthlyTarget {
  id: string;
  project_id: string;
  // "YYYY-MM"; one row per (project_id, month).
  month: string;
  phase: ProjectPhase;
  // Free text, intentionally not a task list.
  target: string;
}

export interface ProjectWeeklyFocus {
  id: string;
  project_id: string;
  // "YYYY-MM-DD" — always a Monday (see src/lib/domain/weekUtils.ts). Zero or
  // many rows per (project_id, week_start_date); no uniqueness constraint,
  // unlike ProjectMonthlyTarget's one-row-per-month.
  week_start_date: string;
  title: string;
  description?: string;
  // No designer_id on purpose: who is working on a project is always derived
  // from ProjectAssignment, never duplicated here (docs/PRD.MD §8.9).
}
