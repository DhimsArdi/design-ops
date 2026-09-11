# Product Changelog

This file records meaningful product requirement changes.

Do not use this file for minor visual polish, refactoring, or implementation-only changes.

## 2026-09-12 — Timeline gains a Week View; new Project Weekly Focus entity

- Timeline (§14.2) now supports two view modes via a segmented control — Month (default, portfolio/stakeholder view, unchanged behavior) and Week (new, operational planning view for Design Leads: phase + short Weekly Focus preview per week, grouped under month/year headers). Day-level granularity remains out of scope.
- New entity: Project Weekly Focus (§8.9) — `id, project_id, week_start_date (ISO, Monday-start), title, description?`. Zero-or-many per week. Explicitly not a task: no status, assignee, subtasks, checklist, story points, sprint planning, Kanban, comments, per-item priority/workload, or completion percentage.
- Add/Edit Project's "Timeline & Targets" step (§22) renamed "Timeline & Planning" and gained a Monthly/Weekly sub-view; Weekly Focus is edited there, not on a standalone page.
- Project Detail (§14.4) gained an optional, secondary "Weekly Plan" section, shown only when a project has Weekly Focus data.
- §38 "Explicitly Out of Scope": replaced the blanket "Weekly/day timeline" ban with "Day-level timeline view" (Week View is now in scope) and an explicit ban on task-management behavior specifically inside Weekly Focus.
- §30 and §37 updated to reflect the Month/Week toggle and Weekly Focus acceptance criteria. Person Timeline (§14.6) stays Month-only by design — see `docs/DECISIONS.md`.

## 2026-09-12 — Visual direction: navy/blue brand palette replaces grayscale theme

- §29 "UI / Visual Direction" amended: the app's color system moved from a pure grayscale neutral theme to a defined navy/blue brand palette (Ink Navy text, Signal Blue as the sole primary action/focus color, Slate Gray secondary text, Cloud/Paper/Pebble surfaces), per explicit user request for a more colorful UI. Enterprise/calm/minimal/professional/light-mode-first direction, and the existing "avoid gradients, neon status colors, decoration" bans, are unchanged.

## 2026-09-11 — MVP modeling decisions confirmed after pre-development audit

- Project Design Lead is optional at every Status; it is derived from Project Assignment (`project_role = "Lead"`), not a separate field on Project. Empty state is "Unassigned," never a validation error blocking save.
- Department Head moved from an independent per-project selection to Department Master Data. Projects now auto-fill Department Head from the selected Department and store it as a snapshot (does not retroactively change if the Department's head changes later).
- Defined "Active Projects" for Overview metrics as Status ∈ {Planning, In Progress}. Proposed is reported separately as "Upcoming / Proposed"; On Hold and Done are excluded.
- Done projects are now explicitly hidden by default from Overview and Timeline (filterable back in on the Projects page). They are never deleted.
- Confirmed MVP persistence: `localStorage` behind the service/repository layer, single-admin/single-browser assumption, no backend/Supabase/auth for MVP.
- Introduced Project Archive as a concept separate from Status — archiving hides a project from operational views without deleting it or changing its lifecycle Status.
- Confirmed all Master Data entities (Designers, Squads, Departments, Epics, Stakeholders) use Active/Inactive with no hard delete, even when unreferenced; Projects use Archive instead of deactivation, with no hard delete either.
