// Domain interfaces for DesignOps.
// Field lists match docs/PRD.MD §8 (8.1-8.8) exactly. See docs/DECISIONS.md
// for the rationale behind the two non-obvious fields on Project.

import type {
  DesignRole,
  EntityStatus,
  LandingPage,
  Language,
  Priority,
  ProjectHealth,
  ProjectPhase,
  ProjectRole,
  ProjectStatus,
  Seniority,
  StakeholderType,
  SystemRole,
  Theme,
  TimelineConfidence,
  TimelineView,
  WeekStartDay,
} from "./enums";

/**
 * One signed-in account: who they are, what they may do, and how they like the
 * app set up (docs/PRD.MD §6.1, §14.10). `id` is the Supabase Auth user id —
 * the profile IS the auth user, not a record pointing at one.
 *
 * This is the app's only account model. It does not duplicate Designer: a
 * Designer is the *person* the planning data refers to (home squad, project
 * assignments, squad leadership), and `designer_id` is the link between the
 * two. Both directions are optional — not every designer has a login, and not
 * every login is a designer (docs/DECISIONS.md).
 *
 * Email is deliberately absent: Supabase Auth owns it, and mirroring it here
 * would create a second copy that can go stale (docs/DECISIONS.md).
 */
export interface Profile {
  id: string;
  full_name: string;
  // Image URL. Null until an avatar is uploaded — initials are derived from
  // full_name for display, exactly as Designer.avatar already works (§8.1).
  avatar_url: string | null;

  // What this person does. Null until they choose one. "Department Head" is
  // the one value that does not make this account a Designer — it makes it a
  // Stakeholder instead (see stakeholder_id below, docs/DECISIONS.md).
  design_role: DesignRole | null;
  // What this account may do. Never writable by its own user — that is
  // enforced by column privileges in supabase/schema.sql, not by the UI.
  system_role: SystemRole;

  // True when an admin force-deleted this account's linked Designer/
  // Stakeholder row (design_role was reset to null alongside it) — what
  // OnboardingView reads to explain WHY the gate reappeared, rather than
  // showing the same first-time "Welcome" copy. Cleared by the database the
  // moment design_role is set again. Never writable by its own user, same as
  // system_role.
  force_reonboarded: boolean;

  // This account's own department, chosen in Settings → Profile. Feeds the
  // Stakeholder record created for a "Department Head" design_role, and is
  // otherwise just a personal detail — replaces the old free-text job_title
  // field, which the app no longer collects (docs/DECISIONS.md).
  department_id: string | null;

  // The Designer row this account is, when design_role is a designer-type
  // role. Null for an account with no person record, which is a complete
  // working account — it just doesn't appear in the people pickers (Squad
  // Lead, Supporting Designers).
  designer_id: string | null;
  // The Stakeholder row this account is, when design_role is "Department
  // Head". Mutually exclusive with designer_id in practice: an account is
  // either the person behind a Designer row or behind a Department Head
  // Stakeholder row, never both (docs/DECISIONS.md).
  stakeholder_id: string | null;

  language: Language;
  // IANA zone name.
  timezone: string;
  week_starts_on: WeekStartDay;

  default_landing_page: LandingPage;
  default_timeline_view: TimelineView;
  theme: Theme;

  // ISO 8601 timestamps. Both written by the database.
  created_at: string;
  updated_at: string;
}

export interface Designer {
  id: string;
  name: string;
  job_title: string;
  seniority: Seniority;
  // Nullable — a designer can be removed from their squad (Teams → Squad
  // View, or Master Data → Squads) without immediately being reassigned,
  // leaving them "Unassigned" until someone gives them a new Home Squad
  // (docs/DECISIONS.md).
  home_squad_id: string | null;
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

  // Set when status becomes "Completed" (Mark as complete), cleared again on
  // Reopen. "YYYY-MM-DD". Independent of end_date — see docs/DECISIONS.md
  // for why there's no per-ProjectAssignment allocation-end-date field.
  completed_at: string | null;

  // "YYYY-MM-DD" day-level dates, both ends INCLUSIVE. The month span these
  // imply (ProjectMonthlyTarget rows, Person Timeline) is derived with
  // monthOf() from dateUtils.ts — never stored twice, so a Timeline drag can't
  // leave a month field disagreeing with the dates (docs/DECISIONS.md).
  start_date: string;
  end_date: string;

  description: string;

  // ISO 8601 timestamps.
  created_at: string;
  updated_at: string;

  // No project-design-lead field here on purpose: it is always derived from
  // ProjectAssignment rows where project_role = "Lead" (see docs/DECISIONS.md).
}

/**
 * A designer's SHARED (non-home) squad membership — Teams § Squad View
 * (docs/PRD.MD §13.1). A designer's Primary Squad is still exactly
 * `Designer.home_squad_id`; this row only ever records an *additional* squad
 * they've been shared into. Deliberately independent of ProjectAssignment —
 * sharing a designer into a squad's roster does not require a project, and a
 * cross-squad project assignment does not, by itself, create one of these.
 */
export interface SquadDesignerMembership {
  id: string;
  designer_id: string;
  squad_id: string;
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
