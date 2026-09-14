// Fixed code constants for the DesignOps domain.
// These are NOT master data — there is no admin UI to add/edit/remove values.
// See docs/PRD.MD §9-12 and §8.1/§8.4/§8.7/§8.8 for the source definitions.

export const PRIORITIES = ["P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

// Planning -> In Progress -> Completed is the typical path; On Hold and
// Cancelled are the alternate branches (docs/PRD.MD §10). "Proposed" existed
// before this lifecycle and was retired with it — every project starts in
// Planning now (docs/DECISIONS.md). Archived is NOT a status: it is the
// separate is_archived flag on Project (see docs/DECISIONS.md).
export const PROJECT_STATUSES = [
  "Planning",
  "In Progress",
  "On Hold",
  "Completed",
  "Cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// Display-only relabeling for the Projects Board/List/Table revamp
// (docs/DECISIONS.md): the stored enum above is unchanged (no migration) —
// every screen that renders a status renders this label instead of the raw
// value. "Planning" reads as "To Do" and "Completed" reads as "Done"; the
// other three keep their own name as their label.
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  Planning: "To Do",
  "In Progress": "In Progress",
  "On Hold": "On Hold",
  Completed: "Done",
  Cancelled: "Cancelled",
};

export const PROJECT_HEALTHS = ["On Track", "At Risk", "Blocked"] as const;
export type ProjectHealth = (typeof PROJECT_HEALTHS)[number];

export const TIMELINE_CONFIDENCES = ["Committed", "Tentative"] as const;
export type TimelineConfidence = (typeof TIMELINE_CONFIDENCES)[number];

// "Lead" is what the PRD calls "Project Design Lead" — there is no separate
// field for it anywhere; it is this value on a ProjectAssignment row.
export const PROJECT_ROLES = ["Lead", "Support"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_PHASES = [
  "Discovery",
  "Research",
  "Exploration",
  "Design",
  "Testing",
  "Handover",
  "BAU",
  "Other",
] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

// Small, free-form-friendly set (PRD §8.1) rather than a strict enterprise
// taxonomy — Product Designer title/seniority combinations vary in practice.
export const SENIORITIES = ["Junior", "Mid", "Senior"] as const;
export type Seniority = (typeof SENIORITIES)[number];

// Designer.job_title — this person's day-to-day discipline/title, shown
// across every planning screen (Projects, Teams, People pickers). A closed
// list rather than free text, so titles stay consistent across the roster.
// Superset of DESIGN_ROLES minus "Department Head" (a Designer can never be a
// Department Head — that makes the account a Stakeholder instead, see
// DESIGN_ROLES below and use-profile-identity-form.ts) plus "Designer" and
// "UX Writer" for titles already in use that aren't a Profile design_role.
export const DESIGNER_JOB_TITLES = [
  "Product Designer",
  "Designer",
  "UX Designer",
  "UI Designer",
  "UX Researcher",
  "UX Writer",
  "Design Lead",
  "Design Manager",
  "Design Ops",
  "Other",
] as const;
export type DesignerJobTitle = (typeof DESIGNER_JOB_TITLES)[number];

export const STAKEHOLDER_TYPES = [
  "Department Head",
  "Product Owner",
  "Project Admin / PIC",
] as const;
export type StakeholderType = (typeof STAKEHOLDER_TYPES)[number];

// Shared Active/Inactive status for master data entities (Designer, Squad,
// Department, Epic, Stakeholder). Project does NOT use this — Project uses
// ProjectStatus plus a separate is_archived flag instead (docs/DECISIONS.md).
export const ENTITY_STATUSES = ["Active", "Inactive"] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

// ---------------------------------------------------------------------------
// Account (docs/PRD.MD §6.1, §14.10)
// ---------------------------------------------------------------------------

// What a person does. Editable by the person themselves in Settings → Profile.
// Deliberately NOT the same axis as Designer.seniority (Junior/Mid/Senior),
// which grades the same job rather than naming a different one, and deliberately
// NOT the same axis as SystemRole below.
//
// "Department Head" is the odd one out here: every other value makes this
// account a Designer (Team profile links to a Designer row), but this one
// makes it a Stakeholder instead (stakeholder_type = "Department Head") —
// see docs/DECISIONS.md. The two are mutually exclusive by construction.
export const DESIGN_ROLES = [
  "Product Designer",
  "UX Designer",
  "UI Designer",
  "UX Researcher",
  "Design Lead",
  "Design Manager",
  "Design Ops",
  "Department Head",
  "Other",
] as const;
export type DesignRole = (typeof DESIGN_ROLES)[number];

// What an account may do. Only "Admin" is used — every signed-in user is an
// Admin (docs/PRD.MD §6) — but the values Editor/Viewer will need are named
// here so their arrival is a policy change, not a type change. Never editable
// by the user it belongs to: the column-level GRANT in supabase/schema.sql is
// what enforces that (docs/DECISIONS.md).
export const SYSTEM_ROLES = ["Admin", "Member", "Viewer"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

// English is the only runtime language. Bahasa Indonesia appears in the picker
// as "Coming Soon" and is not selectable — it is not in this union because
// nothing in the app could render it (docs/PRD.MD §14.10).
export const LANGUAGES = ["en"] as const;
export type Language = (typeof LANGUAGES)[number];

// A short, internally-relevant list rather than the full IANA database: this is
// a single-country design team, and 400 zones would make the field harder to
// use, not more capable. Adding one is a line here plus nothing else — the
// column has no CHECK constraint (supabase/schema.sql).
export const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Europe/London",
  "UTC",
] as const;
export type Timezone = (typeof TIMEZONES)[number];

export const WEEK_START_DAYS = ["monday", "sunday"] as const;
export type WeekStartDay = (typeof WEEK_START_DAYS)[number];

// Where the app opens. Values are route segments, not labels.
export const LANDING_PAGES = ["overview", "projects", "timeline"] as const;
export type LandingPage = (typeof LANDING_PAGES)[number];

// The Timeline's own four scales (see TIMELINE_SCALES in
// src/app/timeline/_components/portfolio-gantt.tsx). `year` is included because
// it is the portfolio view the product ships with — a preference that could not
// express it would be a preference that cannot describe the current default.
export const TIMELINE_VIEWS = ["week", "month", "quarter", "year"] as const;
export type TimelineView = (typeof TIMELINE_VIEWS)[number];

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
