# Product & Architecture Decisions

This file records important product or architecture decisions and their rationale.

## Project Design Lead is derived from Project Assignment, not a separate field

**Decision:** "Project Design Lead" has no dedicated field on Project. It is always the Project Assignment row where `project_role = "Lead"`. A project may have zero or one Lead and zero or many Support designers; a missing Lead is a valid, unblocked state ("Unassigned").

**Why:** The PRD's create-project flow originally required a Design Lead at creation, while its own seed data and the Unassigned Projects feature described leadless projects as normal — requiring it would have made the PRD's own example project impossible to create. Deriving Design Lead from Project Assignment also avoids storing the same relationship twice.

## Department Head lives on Department Master Data, snapshotted onto Project

**Decision:** Department gets a `department_head_id` field (references Stakeholder Master Data). Project's `department_head_id` is auto-filled from the Department at creation / Department-change time and stored as a point-in-time snapshot, not a live reference.

**Why:** A Department Head is conceptually an attribute of the Department, not of each individual project — leaving it as an independent per-project pick risked two projects in the same department silently disagreeing on who the head is. Snapshotting (rather than a live join) keeps historical project context stable even if a department's head changes later.

## "Active Projects" is defined as Planning + In Progress

**Decision:** For Overview metrics, Active = {Planning, In Progress}. Proposed is reported separately as "Upcoming / Proposed"; On Hold and Done are excluded from the Active count.

**Why:** This number is the headline figure a Design Lead presents to stakeholders (PRD §40); left undefined, two implementations could produce different counts from the same data.

## Done projects hidden by default; Archive introduced as a concept separate from Status

**Decision:** Done projects no longer appear on Overview or Timeline by default (still reachable via filter on the Projects page). Projects also gained an independent `is_archived` flag, distinct from lifecycle Status — archiving removes a project from operational views without changing its Status, Health, or assignments, and without deleting it.

**Why:** An unfiltered Timeline/Overview would accumulate every completed project indefinitely, contradicting the product's "avoid clutter" principle. Splitting Archive from Status avoids overloading Status with an operational-visibility meaning it wasn't designed for.

## MVP persistence: localStorage, single-admin assumption, no backend

**Decision:** MVP uses `localStorage` behind the existing service/repository layer; UI components never touch storage directly. This assumes a single Admin on a single browser/device, used for live stakeholder demos — no concurrent multi-admin editing.

**Why:** This is the simplest persistence that satisfies CRUD + refresh + realistic demo data, and matches the "Admin only" access model already in the PRD. Confirmed explicitly rather than assumed, since it would be expensive to change after the fact if multiple admins turn out to need concurrent access.

## No hard delete anywhere; Active/Inactive uniformly, Archive for Projects specifically

**Decision:** Designers, Squads, Departments, Epics, and Stakeholders all use Active/Inactive and are never hard-deleted, regardless of whether they're referenced by historical projects. Projects use Archive (see above) instead of deactivation, and are also never hard-deleted.

**Why:** A uniform rule removes the need for reference-counting logic before allowing any delete anywhere in the app, and guarantees historical Project context (owner squad, epic, department, stakeholders, designers) never breaks due to a deleted master-data row.

## ProjectAssignment and ProjectMonthlyTarget support real removal, distinct from the no-hard-delete rule above

**Decision:** `createRemovableRepository` (a thin wrapper adding `remove(id)` on top of the plain `createRepository`) is used only for the `ProjectAssignment` and `ProjectMonthlyTarget` repositories. Every Master Data repository and the Project repository use plain `createRepository` and never get `remove`.

**Why:** Assignment rows and monthly-target rows are child relationship data with no historical-identity requirement of their own — unassigning a Support designer, clearing a Lead, or dropping a month from a shrunk timeline is not "deleting a project" and does not need an Inactive/Archived trail. Giving them a real `remove()` is what lets Edit Project reconcile the desired set of assignments/targets against what was originally loaded (see the next entry) instead of accumulating orphaned rows or needing a soft-delete flag nothing else respects.

## Edit Project reuses the Add Project wizard and reconciles by diffing, not clear-and-rewrite

**Decision:** `/projects/new` and `/projects/[id]/edit` are both thin route wrappers around one shared `ProjectFormWizard` component (`mode: "create" | "edit"`), not two separate forms. On save, edit mode diffs the form's desired Lead/Support designers and desired per-month rows against the assignments/targets that were loaded when the page opened — it removes only the rows no longer wanted, creates only the new ones, and updates existing rows in place; it never deletes-and-recreates the full set.

**Why:** A single component guarantees Add and Edit can never silently drift apart (PRD §25: "use same structure as Add Project"). Diffing rather than clear-and-rewrite avoids gratuitous churn of `ProjectAssignment`/`ProjectMonthlyTarget` row ids on every save and is the reason those two repositories needed the `remove()` capability above in the first place.

## People and Teams are read-only directories; all entity CRUD lives in Master Data

**Decision:** People, Person Detail, Teams, and Squad Detail never create, edit, or deactivate a Designer or Squad themselves — they only display derived data and link out to the relevant Master Data page. Squad Detail in particular has no "add/remove member" control; Squad membership is not an editable list anywhere.

**Why:** Squad membership is derived from `Designer.home_squad_id` (§16), not stored as its own list, so there is nothing on a Squad to edit independently of the Designer record. Keeping every entity's only edit surface in Master Data means there is exactly one place each field can be changed, and one place to check when auditing what a change affects.

## Per-designer Active/Lead/Support counts on People are ProjectAssignment-derived and exclude archived projects

**Decision:** On the People list, per designer: **Active Projects** counts that designer's `ProjectAssignment` rows whose project `status` is Planning or In Progress (the same predicate as Overview's "Active Projects", §14.1) and whose project is not archived; **Lead Projects** and **Support Projects** count that designer's assignment rows by `project_role`, also excluding archived projects, regardless of the project's status. Person Detail's Current Projects and Person Timeline are built from that same non-archived, `ProjectAssignment`-derived source — no separate/cached count anywhere.

**Why:** PRD §14.5 names these three columns but doesn't pin down which project statuses count as "Active" for a person or whether archived projects should be excluded; left ambiguous, People's numbers could silently disagree with Overview's. Anchoring "Active" to the same predicate as Overview, and excluding archived everywhere, keeps every screen's counts mutually consistent by construction.

## Timeline Week View is a read-mostly planning view, not a second task system

**Decision:** Project Weekly Focus (`ProjectWeeklyFocus`: `id, project_id, week_start_date, title, description?`) is a new, narrowly-scoped entity that only records short "what is this project focused on this week" notes. It has no status, assignee, ordering, or completion field, and it does not carry a Designer reference — "who" is still 100% derived from Project Assignment (§8.7), exactly like Design Lead. `week_start_date` is always the Monday that starts the ISO week; this project has no other established week-start convention, so Monday was chosen as the plain, unambiguous default rather than inventing a configurable one. Like `ProjectAssignment`/`ProjectMonthlyTarget`, `ProjectWeeklyFocus` uses `createRemovableRepository` (real `remove()`), for the same reason: Edit Project must be able to diff a desired set of weekly items against what was loaded and remove the ones no longer wanted, not just soft-hide them.

**Why:** The user's request was explicit and detailed about the anti-scope list (no task status/assignee/subtasks/checklist/story points/sprint planning/Kanban/comments/per-item priority/workload/completion) — this is a direct, current-task PRD amendment (§8.9, §38), not a judgment call, so the entity is modeled to make those things structurally impossible to add later by accident (there's no field to hang them on) rather than merely discouraged in prose.

## Timeline Week View lives only on the portfolio Timeline; Person Timeline stays Month-only

**Decision:** The Month/Week toggle (§14.2) applies only to the main Timeline page. Person Timeline (§14.6) — and the shared `MonthRangeTrack` component it uses — keeps Month-only granularity; it does not gain a Week View.

**Why:** The user's request scoped Week View to "the more detailed operational planning view" for "what each Project is focusing on," which is a portfolio/project-level question. Person Timeline's job is a different question — visualizing one designer's overlap across multiple projects — which reads better at month scale and wasn't part of the request. Extending it would have been scope invention beyond what was asked.

## Weekly Focus editing reuses the existing Add/Edit Project wizard step, not a new page

**Decision:** Project Weekly Focus is created and edited inside the shared `ProjectFormWizard`'s Timeline step (renamed "Timeline & Planning," §22), behind a Monthly/Weekly sub-toggle — the same component used for both Add and Edit (per the existing "Edit Project reuses the Add Project wizard" decision above). Project Detail's "Weekly Plan" section (§14.4) is read-only.

**Why:** The user explicitly said "do not create a standalone Tasks page" and asked for Weekly Focus editing to live in "the Project editing experience." Since Add and Edit already share one wizard component, adding Weekly Focus anywhere other than that shared step would have created a second, inconsistent editing surface for the same data — contrary to the existing "People and Teams are read-only directories; all entity CRUD lives in [one place]" pattern already established for this codebase.

## Visual palette: Ink Navy / Signal Blue brand system replaces pure grayscale, sourced from docs/DESIGN.md

**Decision:** The shadcn theme tokens in `src/app/globals.css` (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--ring`, `--sidebar-*`, `--chart-1..5`) were remapped from pure grayscale OKLCH values to a brand palette sourced from `docs/DESIGN.md` (a Calendly-style reference the user provided and asked to apply): Ink Navy (`#0b3558`) for text/icons, Signal Blue (`#006bff`) as the single primary action/focus/selection color, Slate Gray (`#476788`) for secondary text, Cloud/Paper/Pebble for page/card/muted surfaces, Hairline for borders. Brand primitives are defined once in `:root` and exposed as Tailwind utilities via `@theme inline` (`bg-ink-navy`, `text-deep-cobalt`, etc.); semantic tokens reference the primitives so component code keeps using semantic classes (`bg-primary`, `text-muted-foreground`) rather than hardcoded hues. `status-badge.tsx`'s Planning/In Progress states were moved off ad hoc Tailwind `blue-*` utilities onto the same brand tokens so the app has exactly one blue. Per DESIGN.md's own Do/Don't list, Coral Magenta and Sky Cyan are kept as decorative/data-category primitives only (used in `--chart-1..5` for future data visualization) and are deliberately not used as functional badge/button fills.

**Why:** The user explicitly asked for the UI to be "more colorful" after opening `docs/DESIGN.md`, which is a real instruction-precedence override of PRD §29's grayscale-leaning "calm/minimal" direction (explicit user instruction ranks above the PRD per `CLAUDE.md`'s precedence list). PRD §29 was amended accordingly (see `docs/CHANGELOG.md`) rather than silently diverging from it. The palette stays disciplined — one brand hue for actions plus a navy/slate neutral scale — so it satisfies "more colorful" without violating PRD §29's still-standing bans on gradients, neon status colors, and decorative color.

## MonthRangeTrack is one shared, presentation-only component for both Timeline and Person Timeline

**Decision:** `src/components/timeline/month-range-track.tsx` renders the month header, per-row bar (solid/Committed vs. dashed/Tentative), and phase-segment overlay for both the Timeline page and Person Detail's Person Timeline. It knows nothing about filtering, data fetching, or the sticky project-name/label column — callers supply plain `{ rows, monthRange }` and render their own label column alongside it, sized to match via the component's exported `ROW_HEIGHT_PX`/`HEADER_HEIGHT_PX` constants.

**Why:** Timeline (§14.2) and Person Timeline (§14.6) are the same visualization pattern applied to two different row sets (all projects vs. one designer's assignments) and must stay visually identical (committed/tentative treatment, current-month highlight, phase labels) without hand-syncing two implementations. A future third timeline-shaped view (e.g. a Squad Timeline) should reuse this component rather than reimplement the month grid.
