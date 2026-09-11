// Fixed code constants for the Design Portfolio Planner domain.
// These are NOT master data — there is no admin UI to add/edit/remove values.
// See docs/PRD.MD §9-12 and §8.1/§8.4/§8.7/§8.8 for the source definitions.

export const PRIORITIES = ["P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROJECT_STATUSES = [
  "Proposed",
  "Planning",
  "In Progress",
  "On Hold",
  "Done",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

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
