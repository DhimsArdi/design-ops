# Product Changelog

This file records meaningful product requirement changes.

Do not use this file for minor visual polish, refactoring, or implementation-only changes.

## 2026-09-12 — Projects filter toolbar redesigned; Design Lead and Timeline filters added

- Replaced the Projects page's two-row bank of equal-weight filter `<Select>`s with a compact, single-row toolbar (Search, Status, Priority, Department, "Filters") plus a removable active-filter chip row that only appears when a filter is active. §14.3 updated.
- Status and Priority are now **multi-select** (previously single-value "all" | one choice).
- Two new filter fields: **Design Lead** (derived from each project's Lead assignment, same source as the table column) and **Timeline** (Active now / Upcoming / Past, bucketed against the current month — new, simple logic; no date-range picker or quarter concept was introduced, see `docs/DECISIONS.md`).
- Epic, Owner Squad, Design Lead, Timeline, Health, and Show Archived moved into an "Advanced Filters" popover; Owner Squad and Design Lead are searchable there. Show Archived is no longer a permanent toolbar switch.
- Search now also matches Epic, Department, Owner Squad, and Design Lead (previously project name only), and is debounced ~250ms.

## 2026-09-12 — Geist-only typography; shared semantic status-color tokens

- Reverted the shadcn preset's Inter/Geist font split: Geist is again the single font family everywhere (headings, body, labels, tables, buttons, forms, navigation), loaded once. §29 updated.
- Introduced `--status-warning` / `--status-success` theme tokens (alongside the existing `--primary`/`--destructive`) as the single source of truth for status/health color. Migrated `StatusBadge`, `HealthBadge`, `EntityStatusBadge`, Overview's "Design Lead not assigned"/Unassigned-count emphasis, and the Timeline & Planning range-shrink warning banner off hardcoded Tailwind color literals onto these tokens. Planning and In Progress now share one "active" hue (soft vs. solid) instead of Planning keeping the old brand-blue tokens.
- Removed the now-fully-unreferenced Ink Navy/Signal Blue brand-primitive CSS variables from `globals.css`.

## 2026-09-12 — Theme now generated from shadcn preset `b3YQijUO6K` (style `base-vega`)

- Ran `shadcn init --preset b3YQijUO6K --template next --force --reinstall` at explicit user request; superseded the prior Ink Navy/Signal Blue palette's semantic tokens with this preset's teal/zinc theme, switched shadcn's internal icon library to Hugeicons (app code still uses lucide-react directly), and repointed the font pairing to Inter (body) + Geist (headings). Every shadcn UI component already in use was resynced against the preset. §29 updated; see `docs/DECISIONS.md` for the full list of what changed and a known Planning/In-Progress badge color inconsistency left for the user to weigh in on.

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
