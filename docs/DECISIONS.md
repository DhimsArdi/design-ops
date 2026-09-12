# Product & Architecture Decisions

This file records important product or architecture decisions and their rationale.

## Projects "Timeline" filter is a simple current-month bucket, not a date-range picker or quarter system

**Decision:** The Advanced Filters panel's Timeline field buckets a project against the current month using plain "YYYY-MM" string comparison of `start_month`/`end_month`: `Active now` (current month falls inside the range), `Upcoming` (starts later), `Past` (already ended). No quarter concept, no date-range/calendar picker, no new date library.

**Why:** Before this redesign there was no date-range or quarter concept anywhere in the codebase (confirmed by search) and nothing in the PRD proposed one — a full range picker would have been new product surface invented mid-UI-restructure. Given an explicit choice between (a) simple preset buckets, (b) a real From/To month-range picker, or (c) skipping the field, the user picked (a): it needs no new UI primitives, matches the existing "no date library, plain string/Date arithmetic" convention (`weekUtils.ts`), and is enough to answer "is this project live right now."

## Advanced Filters panel is staged (Reset/Apply); toolbar quick filters are always live

**Decision:** On the Projects page, Search/Status/Priority/Department (toolbar) apply on every change. Epic/Owner Squad/Design Lead/Timeline/Health/Show Archived (the "Filters" popover) are held in local draft state and only committed on "Apply"; "Reset" clears them immediately. Status/Priority/Department are *also* rendered, live (not staged), at the top of that same popover, so they stay reachable once their toolbar button is responsively hidden — see the next entry.

**Why:** This is not a compromise so much as two different jobs: the toolbar is for fast, single-click scanning (Status/Priority/Department), while the Advanced panel groups several rarely-changed fields a user typically wants to set together before seeing the table jump around. Duplicating Status/Priority/Department into the panel (rather than switching the whole panel to a single "everything live" or "everything staged" model) keeps the toolbar's own semantics unchanged regardless of viewport width.

## Every control that renders inside the Advanced Filters popover is a non-portaled inline disclosure, not a nested Popover

**Decision:** `FilterSelect`/`FilterMultiSelect` (`src/components/shared/`) support `variant="inline"`: instead of opening in a floating, portaled `Popover`, the option list expands directly in normal document flow below the trigger. The toolbar's own Status/Priority/Department/Epic-style buttons use the default `variant="floating"` (a real Popover); every one of those same fields, when it also appears *inside* the Advanced Filters popover, uses `variant="inline"`.

**Why:** Nesting a second floating/portaled overlay (a `Popover`, `Select`, or `Combobox`) inside an already-open `Popover` risks the outer popover's outside-click detection treating a click into the inner overlay's portal (rendered elsewhere in `document.body`) as an outside click, dismissing the whole panel the moment a user tries to open, say, "Owner Squad" from within "Filters." Verified via a manual Playwright pass that the inline variant does not trigger this: expanding "Owner Squad" inside "Filters" and picking a value keeps the outer panel open. This project has no existing nested-overlay precedent to follow, so this pattern is now the one to reuse for any future filter field added inside an already-open popover/dialog.

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

## Geist is the single font family everywhere; the Inter/Geist split introduced by the shadcn preset was reverted

**Decision:** `src/app/layout.tsx` now loads Geist exactly once (plus Geist Mono for tabular/monospace data only) and applies it as both `--font-sans` and `--font-heading` in `globals.css`. The preset-introduced second `Geist({variable:'--font-heading'})` call and the `Inter({variable:'--font-sans'})` call are both removed — there is no heading/body font pairing, and no Inter dependency loaded.

**Why:** Explicit user instruction, directly reversing what `shadcn init --preset b3YQijUO6K` did to the font setup in the previous turn: "Use Geist as the primary font family across the entire product... Do not revert body text to Inter... Remove unnecessary mixed-font usage unless there is a specific functional reason." Loading Geist twice under two different variable names had no functional reason (same typeface, same weights available) — collapsing to one load also removes a redundant font-loading cost.

## Shared semantic status-color tokens replace hardcoded status colors in every badge

**Decision:** Added two new theme tokens to `src/app/globals.css` — `--status-warning` (amber) and `--status-success` (green), each with its own light/dark value, exposed as Tailwind utilities (`bg-status-warning`, `text-status-success`, etc.) the same way `--destructive` already was. `StatusBadge` (Project Status), `HealthBadge` (Project Health), and `EntityStatusBadge` (Master Data Active/Inactive) — plus the two ad hoc warning-colored spots on Overview ("Design Lead not assigned", the Unassigned stat) and the Timeline & Planning range-shrink warning banner — now all read from these tokens (or `--primary`/`--destructive`) instead of hardcoding a Tailwind color scale (`amber-50`, `emerald-700`, `red-200`, etc.) per component. Mapping: Proposed = neutral outline (unchanged); Planning = soft/light `--primary` tint (`bg-primary/10 text-primary`); In Progress = solid `--primary` (unchanged, already was); On Hold / At Risk / the range-shrink warning = `--status-warning`; Done / On Track / Active = `--status-success`; Blocked = `--destructive` (already existed, now reused instead of a separate hardcoded red). Planning and In Progress deliberately share the same `--primary` hue (soft vs. solid) so they read as one "active/in-motion" family while staying visually distinguishable by weight, not hue.

As part of this, the now-fully-unreferenced Ink Navy/Signal Blue brand primitives (`--ink-navy`, `--signal-blue`, `--slate-gray`, `--mist-gray`, `--cloud`, `--paper`, `--pebble`, `--pebble-blue`, `--hairline`, `--deep-cobalt`, `--sky-cyan`, `--coral-magenta`) were deleted from `globals.css` — an audit (`grep` across `src/`) confirmed zero remaining references anywhere in component code.

**Why:** Explicit user instruction: "Do not hardcode status colors inside individual components... Create or reuse semantic status tokens so all badges, filters, legends, tables, and timeline views consume the same source of truth," plus an explicit request to "audit the codebase for remaining legacy status-color tokens... and normalize them in this pass." This directly addresses the whiplash from the last two turns, where swapping the theme (colorize, then the shadcn preset) required editing color literals inside multiple component files each time — a single shared token layer means a future theme change only ever touches `globals.css`.

## shadcn preset `b3YQijUO6K` (style `base-vega`) is now the theme source; every existing shadcn UI component was resynced against it

**Decision:** Ran `shadcn init --preset b3YQijUO6K --template next --force --reinstall` at the user's explicit request. This: (1) rewrote `components.json` (`style: base-nova` → `base-vega`, `baseColor: neutral` → `zinc`, `iconLibrary: lucide` → `hugeicons`, `menuAccent: subtle` → `bold`); (2) rewrote the semantic theme tokens in `src/app/globals.css` (`--primary`, `--secondary`, `--accent`, `--card`, `--border`, `--ring`, `--chart-*`, `--sidebar-*`, both `:root` and `.dark`) to the preset's own teal/zinc palette — the Ink Navy/Signal Blue **primitive** variables from the previous colorize pass (`--ink-navy`, `--signal-blue`, `--pebble-blue`, `--deep-cobalt`, etc.) were left untouched by the CLI (it doesn't know about them) and are still defined, but no semantic token still points at them; (3) rewrote `src/app/layout.tsx`'s font setup to Inter for body (`--font-sans`) and Geist for headings (`--font-heading`), replacing the earlier Geist-everywhere fix; (4) added `@hugeicons/react` + `@hugeicons/core-free-icons` as dependencies and regenerated every shadcn primitive currently used in the app (`avatar, button, checkbox, dialog, dropdown-menu, input, select, switch, textarea` changed; `badge, label, scroll-area, separator, table, tooltip` were byte-identical and left alone) to use Hugeicons internally instead of lucide-react. `lucide-react` remains a dependency and every hand-written app screen keeps importing icons from it directly — this is not a full icon-library migration, only the shadcn primitives themselves switched.

Verified after the fact: `tsc --noEmit`, `eslint`, and `next build` are all clean — the regenerated components are still built on `@base-ui/react` with the same public props, so no call site in the app needed to change.

**Known follow-up, not yet reconciled:** `status-badge.tsx`'s "Planning" state still hardcodes the old brand primitives (`bg-pebble-blue text-deep-cobalt`), while "In Progress" uses the semantic `bg-primary text-primary-foreground` (now teal) — the two "in-motion" statuses no longer share one visual family the way they did right after the colorize pass. Left as-is pending the user's call on whether to bring Planning onto the new preset's accent color or keep it as a deliberate brand-blue accent.

**Why:** This was a direct, explicit user instruction ("Apply this: `pnpm dlx shadcn@latest init --preset b3YQijUO6K --template next` and use shadcn component for all used, changed existing component"), which per `CLAUDE.md`'s precedence list overrides the PRD's existing (also user-approved) palette. Nothing in the repo was committed before this session, so a safety commit was made first (with the user's explicit confirmation) so the pre-preset state stays recoverable via `git diff`/`git revert` if the result needs adjustment.

## Visual palette: Ink Navy / Signal Blue brand system replaces pure grayscale, sourced from docs/DESIGN.md

**Decision:** The shadcn theme tokens in `src/app/globals.css` (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--ring`, `--sidebar-*`, `--chart-1..5`) were remapped from pure grayscale OKLCH values to a brand palette sourced from `docs/DESIGN.md` (a Calendly-style reference the user provided and asked to apply): Ink Navy (`#0b3558`) for text/icons, Signal Blue (`#006bff`) as the single primary action/focus/selection color, Slate Gray (`#476788`) for secondary text, Cloud/Paper/Pebble for page/card/muted surfaces, Hairline for borders. Brand primitives are defined once in `:root` and exposed as Tailwind utilities via `@theme inline` (`bg-ink-navy`, `text-deep-cobalt`, etc.); semantic tokens reference the primitives so component code keeps using semantic classes (`bg-primary`, `text-muted-foreground`) rather than hardcoded hues. `status-badge.tsx`'s Planning/In Progress states were moved off ad hoc Tailwind `blue-*` utilities onto the same brand tokens so the app has exactly one blue. Per DESIGN.md's own Do/Don't list, Coral Magenta and Sky Cyan are kept as decorative/data-category primitives only (used in `--chart-1..5` for future data visualization) and are deliberately not used as functional badge/button fills.

**Why:** The user explicitly asked for the UI to be "more colorful" after opening `docs/DESIGN.md`, which is a real instruction-precedence override of PRD §29's grayscale-leaning "calm/minimal" direction (explicit user instruction ranks above the PRD per `CLAUDE.md`'s precedence list). PRD §29 was amended accordingly (see `docs/CHANGELOG.md`) rather than silently diverging from it. The palette stays disciplined — one brand hue for actions plus a navy/slate neutral scale — so it satisfies "more colorful" without violating PRD §29's still-standing bans on gradients, neon status colors, and decorative color.

## MonthRangeTrack is one shared, presentation-only component for both Timeline and Person Timeline

**Decision:** `src/components/timeline/month-range-track.tsx` renders the month header, per-row bar (solid/Committed vs. dashed/Tentative), and phase-segment overlay for both the Timeline page and Person Detail's Person Timeline. It knows nothing about filtering, data fetching, or the sticky project-name/label column — callers supply plain `{ rows, monthRange }` and render their own label column alongside it, sized to match via the component's exported `ROW_HEIGHT_PX`/`HEADER_HEIGHT_PX` constants.

**Why:** Timeline (§14.2) and Person Timeline (§14.6) are the same visualization pattern applied to two different row sets (all projects vs. one designer's assignments) and must stay visually identical (committed/tentative treatment, current-month highlight, phase labels) without hand-syncing two implementations. A future third timeline-shaped view (e.g. a Squad Timeline) should reuse this component rather than reimplement the month grid.

## Motion is tokenized on the transitions.dev scale, with three easing names deliberately left to Tailwind

**Decision:** Installed the `transitions-dev` + `transitions-polish` skills (from `github.com/Jakubantalik/transitions.dev`) into `.claude/skills/`, and applied their motion-token scale to `src/app/globals.css` as a plain `:root` block: `--duration-*` (7), `--ease-smooth-out` / `--ease-bounce` / `--ease-bounce-strong`, `--distance-*` (5), `--scale-*` (4), `--blur-*` (3). Every overlay surface now references those tokens instead of literals — Dialog, DropdownMenu, Select and Tooltip use `data-open:duration-(--duration-fast)` / `data-closed:duration-(--duration-quick)`, `ease-(--ease-smooth-out)`, and a per-surface pre-scale (`--scale-large` modal, `--scale-medium` dropdown open, `--scale-tiny` dropdown close, `--scale-small` tooltip) in place of a blanket `duration-100` + `zoom-in-95`. A global `prefers-reduced-motion: reduce` guard was added; the app previously had none. `TooltipProvider`'s `delay` default moved from `0` to `80` (`--duration-micro`) as an intent gate.

The skill's `--ease-out`, `--ease-in-out` and `--ease-linear` tokens were **deliberately not installed**. Tailwind v4 already defines those exact custom-property names in its own default theme (`node_modules/tailwindcss/theme.css:434-436`), so redefining them in `:root` would silently repoint every `ease-out` / `ease-in-out` utility app-wide. Those three usages use Tailwind's native `ease-*` utilities instead — hence `ease-out` (not a token) on the tooltip. Any future token added from this scale must be checked against Tailwind's theme namespace the same way.

**Why:** Motion values were previously ad hoc shadcn defaults with no shared vocabulary and no open/close asymmetry — a modal opened and closed in the same 100ms. The token scale gives motion one source of truth the way `--status-*` already does for color, and encodes the rule that closes should be quicker than opens (250ms open → 150ms close). Per `CLAUDE.md`'s precedence list the PRD's enterprise / calm / restrained direction still wins over the skills: no new decorative transitions were added, only existing motion was tuned onto the scale.

**Verified:** `next build` clean, and the compiled CSS confirms the `duration-(--var)` / `ease-(--var)` / `zoom-in-(--var)` utilities resolve to real declarations under both `[data-state=open]` and `[data-open]` selectors.

**Known follow-up, not applied:** `transition-all` remains on `button.tsx`, `badge.tsx` and `switch.tsx`. The skill flags it (unrelated property changes animate for free), but enumerating the exact property list on the app's most-used component risks silent hover/focus regressions, so it was left for a deliberate pass.
