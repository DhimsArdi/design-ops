# Product & Architecture Decisions

This file records important product or architecture decisions and their rationale.

## The shadcn sidebar is installed but the shell still owns its own sidebar

`pnpm dlx shadcn@latest add sidebar` added `src/components/ui/sidebar.tsx`,
`sheet.tsx`, `skeleton.tsx` and `src/hooks/use-mobile.ts`. `AppShell` uses none
of them, and that is the decision, not an oversight.

The shadcn parts are not separable. `SidebarMenuButton` calls `useSidebar()`
unconditionally, so it throws outside a `SidebarProvider` — adopting it for the
footer alone would mean wrapping the whole shell in that provider, inheriting
its cookie-backed collapse state, its `--sidebar-width` variables and its mobile
`Sheet`, and then fighting all of it to keep the rail the app already has.
That is a full sidebar migration, which is exactly what was out of scope.

What was taken is the *pattern*, not the code: the footer is now one account row
— avatar, name, email, chevron — whose menu holds the account's own
destinations, which is shadcn's `NavUser`. It is built from the `Button`,
`DropdownMenu` and `Avatar` primitives the shell already used, so the change is
a rewritten `AccountMenu` and a deleted nav row rather than a new dependency.

The four installed files are kept as the starting point if the shell is ever
migrated wholesale. They are dead code until then; deleting them costs one
command to get back.

## One `profiles` table, not a second people model

The obvious ways to give an account an identity were both wrong. Putting the
preferences on `designers` would have meant every person in the planning data
carrying a theme and a landing page, including the dozen who have no login.
Building a full `users`/`members` entity would have created a second people
model to keep in step with the first.

What exists instead is one table keyed by the Supabase Auth user id, holding
what belongs to the *account* — preferences, system role, design role — plus one
nullable, unique `designer_id` pointing at the person record. `designers` stays
exactly what it was: the app's people table, edited in Master Data, referenced
by squads and assignments.

The link is what the whole feature turns on. It is why the signed-in user can be
picked as a Squad Lead without a fake "Me" row existing anywhere, and why the
pickers needed no new data source — the user is in those lists because they are
a designer, not because they were appended to them.

## Name is written to the linked row too, and read from it first

`profiles` has to hold `full_name`: an account with no designer or stakeholder
record still has a name. The linked row has to hold it too, because that row is
what every planning screen renders. So saving Settings → Profile writes both,
and `useCurrentUser` reads the designer's copy first.

The alternative — one authoritative row chosen by whether a link exists — has no
duplication at all, and was rejected for being harder to reason about at the
call site than the staleness it avoids. The mirror is one-way (Settings →
Designer/Stakeholder) and lives in exactly one function,
`profileRepository.saveIdentity`. Renaming someone in Master Data leaves
`profiles.full_name` behind, which nothing reads while a link exists.

Job title used to be part of this mirror (`profiles.job_title` →
`designers.job_title`). It no longer is — see "Department replaces Job title;
Department Head becomes a second linkable person type" below —
`Designer.job_title` and `Stakeholder.title` are now edited only in their own
Master Data page.

## `system_role` is protected by a column GRANT, not by the UI

RLS decides which rows a user may write; it cannot decide which columns. A
policy of "you may update your own profile" therefore also permits
`system_role: 'Admin'` from the browser console, and no amount of not rendering
a control changes that.

So the blanket UPDATE grant on `profiles` is revoked and only the self-service
columns are granted back (`supabase/schema.sql`). `id`, `system_role`,
`created_at` and `updated_at` are absent deliberately. The Profile screen shows
the access level as a fact rather than as a disabled input — a greyed-out
dropdown reads as "temporarily unavailable" and invites someone to go looking
for the way to enable it.

## Settings writes are awaited; every other write in the app is not

`createRepository` is optimistic and returns nothing to wait on, which is right
for planning data edited one row at a time (see "Supabase behind a synchronous
in-memory cache"). Settings has an explicit `Save changes` button that must go
busy and then either confirm or explain itself, and that needs a promise.

`profileRepository` therefore reads from the shared cache like everything else —
so the forms render already filled in, with no skeleton and no flash of defaults
— but writes through `await`ed calls that only touch the cache once PostgREST
has accepted them. Nothing appears saved that wasn't.

## Dark mode ships as a class on `<html>` and no theme library

`next-themes` was installed and removed from this project once already. It was
not reinstalled for a three-value preference: every colour is a CSS variable,
`globals.css` already carried a complete `.dark` block, and `src/` contains no
hardcoded colour literal at all — so the entire mechanism is one class.

The preference lives on the profile, which is authoritative, and is mirrored
into `localStorage` only so a small inline script in `<body>` can apply it
before first paint. That mirror is a guess, and a wrong one exactly once: a
dark-mode user signing in on a new machine sees light for one paint. The
alternative was blocking the whole app on a network round trip.

Light stays the default and remains what the product is designed for.

## The Timeline's week columns ignore the "week starts on" preference

`project_weekly_focus.week_start_date` is constrained to Mondays in the database
(PRD §8.9), and Weekly Focus bars are drawn Monday to Monday. Sunday-start
columns would cut every focus band across two of them, and the drag handler
would still snap to Monday — the preference would produce a chart that
disagrees with itself.

The preference is applied where it is both true and useful: the first column of
every date picker, set once in the shared `DatePicker` so all of them follow.
The timezone preference gets the Timeline instead — it drives the gantt's day
boundaries and its Today marker, which previously read the browser's zone.

## Password recovery renders outside DataProvider, via a path list rather than a route group

`/forgot-password` and `/reset-password` exist for people who cannot sign in, so
they cannot sit behind the sign-in gate. The idiomatic Next answer is a route
group that owns `DataProvider` — which would have meant moving every existing
route into a sibling group to get it. Two paths in a list in `AppFrame` is a
smaller thing to understand, and to undo, than relocating thirty files.

The recovery page never touches the token in the link: supabase-js exchanges it
for a session on load, and the page asks whether a session exists. That makes
the expired case correct for free, since an expired link produces no session.

## Changing a password re-authenticates first, and finishing a reset signs you out

`supabase.auth.updateUser({ password })` will change a password on the strength
of a valid session alone, so "current password" would otherwise be decoration
and a borrowed unlocked laptop would be enough. Settings → Security signs in
with the current password before calling it. A failed attempt leaves the
existing session untouched.

At the end of `/reset-password` the session is deliberately closed rather than
carried into the app: finishing at the sign-in screen proves the new password
works, and leaves nothing open on what may be a shared machine.

## Settings is in the sidebar's utility footer, and not repeated in the account menu

PRD §7 already called Settings utility navigation. A gear between Timeline and
Projects would make five workflow destinations look like six, so it sits in the
footer strip with the account — where a collapsed sidebar still has room for it.

The account menu carries `Profile` and `Sign out` only. Two routes to the same
page a centimetre apart is a menu that has stopped meaning anything.

## `(Me)` is a suffix, and lives in one helper

The rule is one line long, which is exactly why it is not inlined: it is applied
in five pickers, and five copies is how the label ends up reading "Me" in one of
them and "(you)" in another. `personDisplayName(person, currentDesignerId)` in
`src/lib/identity/person-display.ts` is the only place that decides.

It appends rather than replaces. A squad lead recorded as "Me" is unreadable to
the next person who opens that record, and the id stored is always the real
designer id — there is no sentinel value and no Me row in any table.

## ~~Toasts come from Sonner, pinned to light~~ (partly superseded — no theme provider is still true)

`@kobra/toast` was the component originally asked for; its registry turned out
to be paid (`@kobra/toast` pulls `@kobra/alert`, which needs a token), so the
app uses shadcn's standard Sonner toast instead. Two deliberate departures from
the generated component:

The shadcn default reads the theme from `next-themes` and installs it as a
dependency. This app ships no theme provider and is light-mode-first, so
`useTheme()` would have returned nothing and Sonner's own `"system"` fallback
would have rendered dark toasts over a light UI on any OS-dark machine. The
theme was pinned to `"light"` and `next-themes` was uninstalled rather than kept
as a dependency the product doesn't use.

**Superseded on 2026-09-13, as predicted — it was the one line to change.**
Toasts render into a portal outside the styled tree, so they are the one place
that needs the resolved theme as a value rather than inheriting it through CSS.
It now comes from the document class the theme preference sets, read through
`useSyncExternalStore` (see "Dark mode ships as a class on `<html>`"). Still no
`next-themes`, and still not the OS preference — which would flip toasts dark
under a user who chose light.

The generated component also applied a `cn-toast` class that nothing in
`globals.css` defines — dropped. Colours come from the existing `--popover`,
`--popover-foreground`, `--border` and `--radius-md` tokens, so toasts inherit
the theme rather than carrying their own palette.

One `<Toaster />` is mounted in `src/app/layout.tsx`, outside `TooltipProvider`
and below `AppShell` — never per-page, which is what produces duplicate toasts.

## Write confirmations are receipts, not undo affordances

Sonner offers an `action` button and it would have been cheap to attach `Undo`
to every delete. It isn't offered, because the repositories are synchronous
writes with cascading removals (`removeCascade`), so "undo" would mean either
a restore path through every repository or a snapshot layer
neither of which the MVP needs: destructive actions are already gated by a
confirmation dialog, and the toast's job is to say *which* record the write
landed on. Failures stay inline where the user is working, for the same reason
— a toast is the wrong place for something the user has to act on.

## Timeline drops the `Day` scale; `Week` is the finest view the product offers

The vendored gantt implements five scales and Timeline shipped all five. Four
remain: Week / Month / Quarter / Year. A design project is scheduled in weeks
and months — `start_date`/`end_date` are day-level precisely so a bar can be
nudged, not so anyone plans an afternoon — and an hour axis under a four-month
bar answers no planning question anyone has. Removing it also made the scale
control a segmented control that fits on one line, which was the point: the
selected scale is part of reading the chart, so it must not hide in a dropdown.
Nothing was deleted to achieve this — the `day` scale still exists in
`src/components/reui/gantt/`, it simply isn't offered.

## Timeline's filter panel applies live; Projects' stays staged behind Apply

Projects' Advanced Filters panel is deliberately staged (Reset/Apply) because
you're changing several dimensions of a long table you can't see while the
panel is open. Timeline is the opposite case: the panel holds *every*
dimension, and the chart it filters is right there behind it. Staging would
mean the canvas sat inert until you pressed Apply, which is precisely the
feedback loop a visualization exists to give. So the Timeline popover writes
straight through, and its footer carries `Clear all` and a `Done` that only
closes. Two panels, two interaction models, each matching what its screen is.

## Timeline bars carry commitment; health is an exception marker, not a fill

Health used to colour the whole bar. In a healthy portfolio that produced a
screen of strong green bars saying nothing, while the two states a Design Lead
must react to — At Risk, Blocked — had to compete with it for attention. Bars
now carry what they are actually a picture of (duration, and Committed vs
Tentative via solid-vs-dashed fill and border), and health shows as a small dot
on the exceptions only; On Track carries no marker. Full health stays one hover
away in the bar tooltip, and on Overview/Projects, where health IS the subject,
`HealthBadge` is unchanged. The now-line moved from destructive red to the
brand accent for the same reason: on this screen red now means Blocked, and two
meanings for one colour is one too many.

## The Timeline toolbar lives inside `<Gantt>`, and the page passes its half in

Today / prev / next / the scale control / zoom all read gantt context, so they
can only render inside `<Gantt>`; search and filters own page-level state, so
they can only be built by the page. Rather than split the toolbar into two
visually competing bars, `PortfolioGantt` renders the whole toolbar and accepts
the page's controls as a `toolbarStart` node. The page still builds those from
the shared `FilterBar`, so Timeline keeps ⌘K, the chip row and the standard
`Clear filters` action without Timeline-specific copies of any of them.

## The gantt's `renderNoResources` slot is not used for Timeline's empty state

It renders inside the scrolling track and centres itself against the track's
full width, not the visible pane, so with a sticky project column the empty
state lands half-hidden behind it. Timeline instead swaps the chart body for
the empty state and keeps its toolbar mounted — which is the better outcome
anyway: the filters that emptied the view stay exactly where they were, one
click from being undone.

## The Timeline Gantt is vendored from ReUI, not written here

**Decision:** `src/components/reui/gantt/` holds ReUI's headless gantt (9 files, ~9,900 lines) installed verbatim via `npx shadcn@latest add https://reui.io/r/gantt.json`. It is MIT-licensed (`keenthemes/reui`), and the source for this repo's own `base-vega` style ships in that repo at `public/r/styles/base-vega/gantt*.json`, byte-identical to what the registry serves. Only the four pre-assembled `gantt-1`…`gantt-4` *blocks* are behind ReUI's license key; the engine is not, and we use none of the blocks. The single local edit is in `gantt-nav.tsx`, mapping the component's `navButtonSize: "default"` onto this app's `md` (40px) button tier. `src/components/reui/**` is excluded from ESLint — linting code we don't author only invites edits the next upgrade overwrites. Our own adapter, `src/app/timeline/_components/portfolio-gantt.tsx`, is linted normally and is the only file that knows both the domain and the gantt.

**Why:** The user asked for the capability set on ReUI's Gantt page specifically. Writing an equivalent — five time scales with correct DST-weighted column geometry, pointer-accurate drag/resize with snapping, lane packing, infinite scroll, a scroll-synced resizable split pane — is several thousand lines of the kind of code that is subtly wrong for months. It also happens to be built on `@base-ui/react`, the exact primitive layer this repo already uses (not Radix), and this repo's `components.json` was already on ReUI's `base-vega` style, so it dropped in with one type error. The cost is an unlinted vendored directory and two new dependencies (`date-fns`, `@date-fns/tz`); the alternative was owning a rendering engine that isn't this product's value.

Installing it overwrote four `src/components/ui/` primitives (`button`, `dropdown-menu`, `popover`, `tooltip`) — the shadcn CLI has no per-file overwrite flag — which silently discarded the 40px button scale, the transitions.dev motion tokens, and the tooltip's 80 ms intent delay. All four were restored from a pre-install copy. **Re-running the install will do this again**: back `src/components/ui/` up first, and restore everything except `calendar` and `context-menu`.

## Project stores day-level dates; every month view derives its months

**Decision:** `Project.start_date` / `end_date` are `"YYYY-MM-DD"`, both inclusive, and they **replaced** `start_month`/`end_month` rather than joining them. Anything that still works per month — `ProjectMonthlyTarget` rows, Person Timeline's `MonthRangeTrack`, the Projects list's timeline column, Overview — calls `monthOf()` from `src/lib/domain/dateUtils.ts` at the point of use.

**Why:** Storing both would mean three writers (a Timeline drag, the Add/Edit wizard, Mark as complete) keeping two fields in agreement forever, with no way to adjudicate at read time when they disagree — if a bar is dragged to Dec 3 but `end_month` still says `2026-12`, which is true? Derivation is a `.slice(0, 7)`; a stored duplicate is a permanent invariant to defend. ISO dates also sort lexicographically, so every existing `localeCompare` sort kept working verbatim.

`dateUtils.ts` is the only module allowed to construct a `Date`, and every `Date` it builds is local midnight — the gantt measures and renders with local `Date` methods, so a UTC-midnight `Date` (what `new Date("2026-09-01")` produces) would render a day early in any negative-offset zone. `weekUtils.ts` was deliberately left alone: it is UTC-anchored internally and never hands a `Date` out, so the two conventions cannot meet.

## ~~Schema changes migrate localStorage in place rather than bumping the storage key~~ (superseded)

**Superseded** by the move to Supabase: schema changes are now SQL migrations against a real database, and `createRepository`'s `migrate` argument is gone along with `migrateProjects`. Kept for the reasoning about preserving user-entered data, which still applies to any future migration.

**Decision:** `createRepository` takes an optional third `migrate(rows)` argument, run once per page load when the key already holds data, writing only when something actually changed (return the input array to signal "nothing to do"). `projectRepository` uses it to backfill `start_date`/`end_date` from the old month fields, expanding to the full span of the months the row already named. The `dpp:v1:` key prefix stays.

**Why:** The obvious alternative — bump `KEY_PREFIX` to `dpp:v2:` — is one line, and this app has accepted "existing localStorage data will not match the new shape" before (the Proposed/Done status change). But that change altered a field every project row carried; this one alters one entity. Bumping the prefix would have discarded designers, squads, departments, epics, stakeholders, assignments, monthly targets and weekly focus — none of which moved — to migrate projects, and left the v1 keys behind as dead bytes. Fifteen lines that preserve what the user typed beat one line that throws it away.

Expanding to first-of-month/last-of-month is chosen so `monthOf()` round-trips to exactly the old `start_month`/`end_month`, which guarantees no `ProjectMonthlyTarget` or `ProjectWeeklyFocus` row falls out of range during the migration. Seed data is different: it gets varied, realistic days inside the same months, so the Day scale exercises real dates instead of a wall of month boundaries.

## One shared `FilterBar` owns filter layout; the majority container convention won over Projects' full-bleed one

**Decision:** `src/components/shared/filter-bar.tsx` is now the single owner of every list screen's filter toolbar — search box and its width, control spacing, the ⌘K focus shortcut, the "Clear filters" button, and the optional active-filter chip row. Pages supply only their own filter controls as children. Every screen renders it inside `<ContentSection bodyClassName="space-y-4">`.

That container choice meant changing Projects, not the other eight. Projects had been the odd one out: a `p-0` card body with the toolbar at `px-4 py-2`, a `border-t` chip row, and the table in its own `border-t px-4 py-4` wrapper — a full-bleed, divider-separated treatment. Timeline, People, Teams, and all five Master Data screens already used the padded `space-y-4` body. Converting the eight to match Projects would have touched far more code for the same end state, so Projects lost its dividers instead. Its table wrapper was safe to drop outright because `Table` already renders its own `overflow-x-auto` container.

Two follow-on details fell out of centralizing: the chip row now renders only when chips actually exist (Projects previously showed an empty bordered strip whenever a Search query alone was active), and `FilterSelect`/`FilterMultiSelect` gained `aria-label="Filter by <dimension>"` on their triggers — without it, migrating Timeline's and Stakeholders' raw `<SelectTrigger aria-label=…>` onto the shared controls would have been an accessibility regression rather than a consolidation.

**Why:** Direct user report that filtering felt different from page to page. Three control stacks had grown up across separate PRD phases, and the divergence had reached wording as well as layout — three different reset-button labels, six empty-state title variants, and `All squads` doing duty for three unrelated dimensions. A shared component (rather than a documented convention) is what actually keeps them from drifting apart again, since a new screen gets the right toolbar by construction.

## Filter state stays local and out of the URL, deliberately

**Decision:** Unifying the filter toolbars did **not** move filter state into URL query params. Each screen keeps its own local `useState`, and filters reset when you navigate away. Projects remains the one exception, and only in one direction: it reads `designLead`, `health`, and `status` once on mount so Overview can drill into it, and never writes them back.

Timeline's eight separate `useState`s were consolidated into a single `TimelineFilters` object to match the shape Projects/People/Teams already used, but that is a code-shape change, not a persistence change.

**Why:** Explicitly scoped out by the user when this work was planned. Two-way URL sync is a real feature with real consequences — shareable filtered views, browser history entries per filter change, back/forward semantics to get right — and folding it into a consistency pass would have made a large behavioural change under cover of a visual one. The consolidated per-screen filters object is also what a later URL-sync change would build on, so nothing here blocks it.

## Overview's "Designer Capacity" and "Upcoming Work" visualizations were not built — they conflict with the PRD, not just with taste

**Decision:** Of the task's three suggested Overview visualizations, only **Project Health** (a horizontal stacked bar, `bg-status-success`/`bg-status-warning`/`bg-destructive` segments sized by `flexGrow: count`, each segment a link into `/projects?health=...`) was built. The other two were deliberately skipped:

- **Designer Capacity** (Available / Healthy / Near Capacity / Overallocated) was not built at all. This isn't a style preference — it directly contradicts explicit, repeated PRD rules: §4.2 ("No false precision... allocation percentage, utilization percentage, capacity score, workload score... jumlah project tidak otomatis menentukan seseorang overloaded"), §38's explicit out-of-scope list (allocation/utilization/capacity percentage, capacity/workload scoring), and `CLAUDE.md`'s own build guardrails ("Do not implement allocation or capacity calculations," "Do not infer that project count equals workload"). Nothing in this domain model (`Designer`, `ProjectAssignment`) carries the data such a chart would need, and inventing a scoring formula to produce one would be exactly the "false precision" the PRD calls out by name.
- **Upcoming Work mini-timeline** ("This week" / "Next 2 weeks" / "Next month") was not built because `Project` only had month-granularity `start_month`/`end_month` (`"YYYY-MM"`, no day). Bucketing into week-level windows would have required inventing a specific day within a project's start month that the data didn't actually specify — the same "false precision" problem, just applied to timing instead of workload.

  **Amended:** that blocker is gone. Project now carries real `start_date`/`end_date` entered by a user, so week-level bucketing would no longer invent anything. This does **not** reinstate the widget — whether Overview needs it is a separate product question nobody has asked — it only retires the reason recorded here. The Designer Capacity decision above is untouched and still stands: it was refused on PRD grounds (§4.2 false precision, §38 out-of-scope), not on data availability, and no amount of new date precision changes that.

**Why:** Per `CLAUDE.md`'s instruction precedence, the PRD outranks a feature ticket's own suggestions, and both skipped items were explicitly framed as optional/recommended ("Optional Visualization 3," "Possible visualization") rather than a directive — so following the PRD here isn't overriding an explicit instruction, it's resolving an internal conflict the ticket itself allowed for ("Do not add charts purely to make the dashboard look more visually interesting... every chart should support a specific planning decision"). Limiting Overview to the one visualization that has real, already-modeled data behind it also keeps it within the task's own "1–2 useful visualizations" ceiling.

## Cross-squad support is grouped per designer and rendered by one shared component, replacing the `→ Project / Squad` shorthand everywhere it appeared

**Decision:** New `SupportingProjects` (`src/components/shared/supporting-projects.tsx`) renders "Supporting: A, B" (plain project links) for one or two projects, or "Supporting N projects" with a keyboard-focusable Tooltip listing every name once a designer crosses that threshold. It replaces the `→ ProjectName / OwnerSquad` arrow notation in three places: Overview's Cross-squad Support list, and Squad Detail's Outgoing and Incoming sections. All three data sources were also regrouped from one row per (designer, project) pair to one row per designer — Overview's `CrossSquadRow` and Squad Detail's `OutgoingSupportRow`/`IncomingSupportRow` now carry a `projects: Project[]` array instead of a single `project`, so a designer supporting several cross-squad projects reads as one line instead of a repeated name.

**Why:** Direct task ask — the arrow notation "may not be immediately understandable to new or infrequent users," and multiple projects for the same person should consolidate rather than repeat the name once per project. One shared component (rather than three inline copies) keeps the "≤2 inline / >2 collapses to a tooltip" threshold consistent if it's ever tuned.

## Sidebar gained two labeled nav groups (Planning / Administration) and per-item counts, both reusing already-loaded repository data

**Decision:** `AppShell`'s flat six-item nav is now two groups — Planning (Overview, Timeline, Projects, People, Teams) and Administration (Master Data alone) — with a small uppercase label above each (skipped while the sidebar is collapsed to icons only, where there's no room for it). Projects/People/Teams additionally show a small muted count on the right of their row: active project count, active designer count, and active squad count respectively — plain numbers, no colored pill, no "N new" notification styling. The inactive-item hover background went from `bg-foreground/5` to `bg-foreground/8` (a small, deliberate bump — still clearly subordinate to the active item's solid `bg-background` treatment). Counts are read via the same `useRepositoryList` hook every page already uses. (They were originally as stale as the last full navigation; since the move to Supabase they track the shared cache and follow every edit, including other people's.)

**Why:** The nav grouping is the task's own "Operational view ≠ Configuration view" mental model applied directly in navigation, not just described in copy (paired with Master Data's new subtitle, next entry). Counts were deliberately limited to three items and to plain totals — no per-item "unassigned"/"at risk" alarm badges — matching the task's explicit "do not add counts simply because data exists" and "avoid notification-style indicators without clear meaning."

## Master Data gained a one-line subtitle instead of a duplicate page heading

**Decision:** `master-data/layout.tsx` now renders a short explanatory paragraph above the Designers/Squads/Departments/Epics/Stakeholders tab strip ("Reference data and organizational configuration used across the app. For day-to-day planning, use Overview, Projects, Timeline, People, or Teams instead..."). It is *not* wrapped in a second `<PageHeader>` — `AppShell`'s own header bar already titles the page "Master Data" (from the active nav item's label), so a second `<h1>Master Data</h1>` directly below it would have been a redundant, stacked heading.

**Why:** Direct task ask for a subtitle clarifying Master Data's role as the administrative/configuration layer, distinct from the operational People/Teams screens that read the same underlying data. Checking the existing chrome first (rather than reusing `PageHeader` by default) avoided adding visual weight the task explicitly warned against ("without becoming visually heavier").

## Overview: one stacked-bar visualization, "View all" on the two capped lists, and a spacing bump — no new dividers

**Decision:** Three small, independent changes: (1) the Project Health stacked bar described above; (2) "Priority Projects" and "Upcoming Projects" — both capped subsets (top 6 / top 5) — gained a "View all N" action in their `ContentSection` header, shown only when the full count actually exceeds what's displayed, linking to `/projects?status=...` (Projects' URL-seeding was extended to parse a comma-separated `status` list, alongside the existing `designLead`/`health` params); (3) the page's outermost vertical spacing went from `space-y-6` (24px) to `space-y-8` (32px) — no new divider lines were added between sections, since every Overview section is already a full bordered `ContentSection` card (`rounded-lg border border-border`), which is already a stronger separator than a subtle divider would be.

**Why:** Direct task ask for both the "View all" pattern and increased section-to-section spacing (32–40px), explicitly scoped to *not* solve it by adding more card containers — sections here were already cards, so the only real lever left was spacing, which is what changed. "View all" was limited to the two lists that are actually truncated (Team Snapshot and Cross-squad Support already show everything, or already have their own "+N more" affordance) — an unconditional link would either be dead weight or misleadingly imply hidden data that doesn't exist.

## Filter bars standardized across Projects/People/Teams/Timeline — same structure, page-appropriate fields; no filter popover where there's nothing to hide

**Decision:** Every primary list page now offers Search-first filtering, but the filter *set* is deliberately different per page, matching what that page's data actually supports:

- **Projects** (`_components/projects-filter-bar.tsx`) stays the reference pattern, unchanged in shape: Search + quick toolbar filters + a staged "Filters" popover for less-common fields — because it has nine filter dimensions, genuinely needing progressive disclosure.
- **People** (new `_components/people-filter-bar.tsx`): Search, Home Squad, Seniority, Status, and a new "Assignment" filter (All / Has active project / Unassigned — presence/absence of an active `ProjectAssignment` only, never a percentage or count threshold, per PRD §4.2's ban on allocation/capacity math). No "Availability/Capacity" filter, despite being suggested in the task brief — that concept doesn't exist in this product and adding it would contradict the PRD directly.
- **Teams** (new `_components/teams-filter-bar.tsx`): Search, Staffing (derived from member count: Has designers / No designers), Lead (assigned / unassigned), Status. No Department filter — `Squad` has no `department_id` in the domain model (PRD §8.2: id/name/lead_designer_id/description/status only), so a Department filter here would require adding a field the PRD doesn't define.
- **Timeline** keeps its existing seven direct `<Select>` filters with no popover — already the right call for a filter set with no dimension worth hiding, and now the precedent People/Teams follow (all filters shown directly, no popover, since they're both smaller than Projects' set). **Superseded (2026-09-12):** Timeline now collapses all seven into one `Filter` popover and adds Search. The reasoning above weighed the filter *set*; what it missed is what the filters sit next to — on a table, seven triggers are a row of controls above a list, but on a canvas they are seven controls competing with the thing you came to read. People and Teams are tables and keep their direct controls.

All four pages show a "Clear filters" action once anything is active; People/Teams/Timeline rely on each control's own trigger label to show what's active (see next entry) rather than a separate removable-chip row — only Projects' nine-dimension set is complex enough to need that extra summary.

**Why:** The task explicitly asked to standardize the *pattern*, not force identical controls ("do not force every page to have exactly the same filters... avoid adding unnecessary filters purely for visual consistency"). Building a Filters-popover for Teams' 3 fields or People's 4 would be progressive disclosure with nothing to disclose — over-engineering for its own sake. Reusing `FilterSelect`/`FilterMultiSelect`/`SearchInput` for the two new bars (rather than inventing new controls) keeps every page's filter mechanics identical even though the fields differ.

## `FilterSelect`'s floating trigger keeps its category name after a value is picked; Timeline's raw `<Select>`s get the same treatment by hand

**Decision:** `FilterSelect` (`src/components/shared/filter-select.tsx`) now renders `"{label}: {value}"` on its toolbar (floating-variant) trigger once a value is selected — e.g. `Department: Wholesale Banking`, not just `Wholesale Banking` — matching the format already used by the active-filter chip row. The `inline` variant (used inside the Projects Advanced Filters popover) is unchanged: it already sits under its own `<FilterField>` heading, so repeating the category name there would be redundant. Timeline's filters were plain shadcn `<Select>`s at the time and got the same "category: value" treatment directly via `SelectValue`'s render-prop children; they have since moved to `FilterSelect`'s `inline` variant inside Timeline's own Filter popover, where each control sits under its own heading and needs no prefix.

**Why:** The task's core complaint — several dropdowns all reading "All" with no indication of what they filter — applies just as much to an *already-selected* value as to the unselected state: "Wholesale Banking" alone doesn't say whether that's a Department, an Epic, or an Owner Squad once several filters are active together. Since `FilterSelect` is shared by Projects' toolbar (Department) and both new People/Teams bars, fixing it once in the shared component fixes every current and future caller, rather than patching each page's copy of the same problem.

## Health status is a dot + label, not a badge — one component, reused everywhere Health appears, including inside a dark Tooltip

**Decision:** `HealthBadge` (`src/components/shared/health-badge.tsx`) no longer renders a filled `Badge` pill; it renders a small semantic-colored dot plus the text label (`● On Track`), matching the task's "preferred pattern for dense enterprise tables." Same component, same call sites (Overview, Projects table, Project Detail, the Projects-wizard review step) — only the internal rendering changed, so every consumer picked up the new look for free. The Timeline Gantt bar's hover Tooltip renders the same dot+label *shape* by hand (`healthSolidClassName` dot + plain text) rather than invoking `<HealthBadge>` directly, because the Tooltip's dark popup background (`bg-foreground`/`text-background`) would collide with `HealthBadge`'s light-background-tuned semantic text colors (`text-status-success` etc. have no readable contrast on a dark chip) — reusing the *pattern* here without reusing the literal component avoids a real contrast bug.

**Why:** Explicit task ask for consistency across every Health-displaying surface, and for a compact, scannable treatment that "doesn't compete" with Priority/Status pills in the same row — this intentionally makes Health look different from Priority/Status (a status signal, not a category badge), which is the point, not an inconsistency to fix later.

## Projects table gained a row-level `...` overflow menu (Edit / Archive); People and Teams deliberately did not

**Decision:** Projects' table rows now have a trailing overflow menu (same `DropdownMenu` building block as Master Data) with "Edit" and "Archive"/"Unarchive" — both real, already-existing actions that previously required opening Project Detail first. People and Teams rows were **not** given an overflow menu: neither has a secondary action beyond "open the detail page," which the row click (and the row's own name link, independently) already covers — a menu with a single "View details" entry would be exactly the "decorative menu with one low-value option" the task explicitly said to avoid.

**Why:** The task's own rule ("do not add overflow menus to rows that have no meaningful secondary actions") is a per-page judgment call, not a blanket "add a menu everywhere for consistency" — Projects clears that bar (2 real actions), People/Teams don't.

## Overview's "Unassigned Projects" stat and At-Risk/Blocked "Project Health" rows drill into Projects with the filter pre-applied, via a one-time URL-param read (not a two-way sync)

**Decision:** Projects gained a reusable `UNASSIGNED_DESIGN_LEAD` sentinel (`src/lib/selectors/projectSelectors.ts` — shared home since both Overview and the Projects filter bar need it, avoiding an import across another route's `_components` folder) for its Design Lead filter, representing "no Lead assigned" (distinct from any real designer id). Overview's "Unassigned Projects" stat card and the "At Risk"/"Blocked" rows in its Project Health list are now links to `/projects?designLead=unassigned` / `/projects?health=At%20Risk`, etc. `ProjectsPage` reads those two query params exactly once, via a `useState` lazy initializer, to seed its filter state — the filter bar itself never writes back to the URL, so this is a one-way deep-link entry point, not a full URL-driven filter sync (which nothing in either task asked for). Both stats/rows are only clickable when their count is `> 0`; "Active Projects," "Upcoming/Proposed," and "Designers" were deliberately left as plain (non-clickable) stats — they don't represent an actionable "something needs resolving" journey the way Unassigned/At Risk/Blocked do.

**Why:** Direct task ask for the Unassigned stat, generalized only as far as the task's own examples ("At Risk Projects," "Blocked Projects") reach — "Available Designers"/"Overallocated Designers" were explicitly not built since neither concept exists in this product (PRD §4.2). A one-time query-param read was chosen over full two-way URL state because every filter bar in this app (Projects, Timeline) already keeps its filters in plain component state with no URL persistence (Timeline's own header comment even flags this as the shape to mirror "if a later phase needs deep-linking") — building a full sync just for one drill-down link would be new scope beyond what was asked.

## Inline "Assign" actions: Project Design Lead gets a popover that mutates; Squad Lead/membership stays a link to Master Data

**Decision:** Two new shared components replace passive "Unassigned"/"–"/"0 designers" text with an actionable state, but they resolve differently on purpose:

- `AssignLeadControl` (`src/components/shared/assign-lead-control.tsx`) renders "Unassigned · Assign" and opens a searchable Popover (same trigger+search+list shape as `FilterSelect`) that writes a `ProjectAssignment` "Lead" row directly — no navigation. It reconciles the same zero-or-one-Lead / no-duplicate-designer rules the Add/Edit Project wizard already enforces on full save (§8.7), scoped to a single field. Used on Overview (Priority + Upcoming), the Projects table, and Project Detail — everywhere a Project's Design Lead already appears as editable data outside Master Data.
- `EmptyFieldAction` (`src/components/shared/empty-field-action.tsx`) renders "No lead assigned · Assign" / "No designers · Add" as a plain link out to `/master-data/squads` or `/master-data/designers` — it never mutates. Used on Teams and Squad Detail for Squad Lead and Squad membership.

**Why:** Project Design Lead has always been edited from the Project's own surfaces (the Add/Edit wizard), never Master Data, so adding a faster inline editor for it there is a scoping-consistent speed-up, not a new edit surface. Squad Lead (`Squad.lead_designer_id`) and Squad membership (`Designer.home_squad_id`) are the opposite case: the existing "People and Teams are read-only directories; all entity CRUD lives in Master Data" decision (above) means Teams/Squad Detail must never gain their own mutation UI, however lightweight — so their empty-state action can only ever be a link out, matching the pre-existing "Manage in Master Data" pattern already on Squad Detail.

Two Timeline/table changes ride along with the same pass: `MonthRangeTrackRow` gained an optional `health` field so a Gantt bar's fill color reflects Project Health as a secondary signal (bar style — solid vs. dashed — still carries commitment; health is additive, and `undefined` renders the prior neutral bar), and `ProjectNameLink` (`src/components/shared/project-name-link.tsx`) clamps a project name to 2 lines with a Tooltip repeating the full name, replacing single-line truncation on Overview's Priority/Upcoming lists and the Projects table — the full name stays in the DOM for accessibility either way, the Tooltip is a convenience, not the only way to read it.

## Teams' "No designers · Add" gains an inline multi-select dialog, reversing the "Squad membership stays a link to Master Data" decision above (2026-09-12)

**Decision:** `EmptyFieldAction` (`src/components/shared/empty-field-action.tsx`) now accepts either `href` (plain link, unchanged) or `onClick` (new). Teams' "No designers · Add" action (`src/app/teams/page.tsx`) uses `onClick` to open a new `AssignDesignersDialog` (`src/app/teams/_components/assign-designers-dialog.tsx`) instead of linking to `/master-data/designers`. The dialog is a search + multi-select checklist (reusing `MultiSelectChecklist`, promoted from `src/app/projects/_components/` to `src/components/shared/` since it's now used outside Projects) listing every Active designer not already in the target squad, with each row noting which squad they currently belong to. Confirming calls `designerRepository.update(designerId, { home_squad_id })` once per selected designer — there is still no squad-membership-specific repository method; this is the same bulk field write the decision above already described as the only available mechanism. Squad Lead (`Squad.lead_designer_id`) is unaffected and still only a link out to Master Data.

**Why:** Explicit user request, given directly as an image of the desired search/avatar-list UI and the instruction that multiple designers must be selectable in one modal rather than navigating away. This knowingly reverses the "Teams/Squad Detail must never gain their own mutation UI" rule from the decision above — that rule was itself a judgment call, not a PRD requirement, and explicit current-task instruction outranks a prior architecture decision per `CLAUDE.md`'s stated precedence order. Squad Lead was deliberately left as a link-out since the user only asked about the designers/"No designer" case. Since `Designer.home_squad_id` is a required single field (no "unassigned" pool exists in this domain model), the dialog can't offer a pool of free-floating designers — every designer already belongs to some squad, so "adding" one here always means moving them, and the dialog surfaces that explicitly (description text + confirmation copy) rather than hiding it.

## Button size scale rebuilt around a 40px `md` default, reusing the existing `Button`/CVA implementation

**Decision:** `buttonVariants` in `src/components/ui/button.tsx` now defines exactly three primary size tokens — `sm` (32px, `px-3`, `gap-1.5`), `md` (40px, `px-4`, `gap-2` — the new default when no `size` prop is given), `lg` (48px, `px-6`, `gap-2`, `text-base`/`leading-6`, 20px icons via `size-5`) — plus matching icon-only squares `icon`/`icon-sm`/`icon-lg` at 40/32/48px. `sm` and `md` keep the base 14px/20px type (`text-sm`, unchanged) and 16px icons (`size-4`, unchanged); only `lg` steps up type and icon size. The pre-existing `xs` (24px) and `icon-xs` (24px) tiers were left in place — they aren't part of the 3-tier spec but are still used by dense inline controls (filter-bar "Clear all", Weekly Focus row remove) that would look wrong at 32px. No new Button component or separate size implementation was introduced; only the existing `cva` `size` variant map changed.

**Why:** The user supplied an explicit external sizing spec (height/padding/gap/icon-size/font-size/line-height per tier, `sm`=32/`md`=40/`lg`=48, `md` as the app-wide default) and asked for it to standardize control height across the product without altering existing colors, variants, or the component API. Before this change the CVA `size` map had a `default` (36px, used almost everywhere `size` was unset), `sm` (already 32px), and an `lg` (40px) that was never referenced anywhere in the app — so `sm` needed no height change, the unused old `lg` slot's height coincidentally matched the new `md` spec and was repurposed for it, and a genuinely new `lg` (48px) tier was added. `size="default"` and `size="lg"` had zero call sites (confirmed by repo-wide search) except one `size={collapsed ? "icon" : "default"}` in `AppShell.tsx`'s nav, updated to `"md"` — so this was a safe rename, not a breaking one. `sm` call sites (table row icon actions, filter bars/popovers, timeline toolbar, segmented sub-view toggles) were deliberately left on `sm` rather than bulk-converted to `md`, since those are the dense/compact contexts the sizing spec itself calls out as the intended use for `sm`.

## Projects "Timeline" filter is a simple current-month bucket, not a date-range picker or quarter system

**Decision:** The Advanced Filters panel's Timeline field buckets a project against today using plain ISO string comparison of `start_date`/`end_date`: `Active now` (today falls inside the range), `Upcoming` (starts later), `Past` (already ended). No quarter concept, no date-range/calendar picker.

**Amended (day-level dates):** the pivot was originally the current *month*, compared against `start_month`/`end_month`. Both sides are day-level now, so the buckets are too — a project that ended on the 3rd reads `Past` on the 12th instead of staying `Active now` until the month turned over. The clause "no new date library" no longer holds literally either: `date-fns` entered the tree with the vendored Timeline Gantt. It stays confined there, and domain code is still string-first.

**Why:** Before this redesign there was no date-range or quarter concept anywhere in the codebase (confirmed by search) and nothing in the PRD proposed one — a full range picker would have been new product surface invented mid-UI-restructure. Given an explicit choice between (a) simple preset buckets, (b) a real From/To month-range picker, or (c) skipping the field, the user picked (a): it needs no new UI primitives, matched the existing "plain string/Date arithmetic" convention (`weekUtils.ts`), and is enough to answer "is this project live right now."

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

## ~~MVP persistence: localStorage, single-admin assumption, no backend~~ (superseded)

**Superseded** by "Supabase behind a synchronous in-memory cache" below. Kept because the entry below only makes sense against it.

**Decision:** MVP uses `localStorage` behind the existing service/repository layer; UI components never touch storage directly. This assumes a single Admin on a single browser/device, used for live stakeholder demos — no concurrent multi-admin editing.

**Why:** This is the simplest persistence that satisfies CRUD + refresh + realistic demo data, and matches the "Admin only" access model already in the PRD. Confirmed explicitly rather than assumed, since it would be expensive to change after the fact if multiple admins turn out to need concurrent access.

## Supabase behind a synchronous in-memory cache, not async repositories

**Decision:** Persistence moved from `localStorage` to Supabase (Postgres + Auth + Realtime), and the repository layer **stayed synchronous**. `dataStore` holds all nine tables in memory; repositories read from it. Writes are optimistic — the cache updates in the calling tick and the row goes to Supabase in the background — and Supabase Realtime refetches a table whenever anyone changes it, so a second person's edit appears without a reload.

The alternatives considered were async repositories with SWR/react-query, and a full move to server components plus server actions. Both are more conventional and both were rejected for this change.

**Why:** Every page in this app is a client component that reads data synchronously during render, through six selector modules and roughly fifty components. Making the repositories async would have rewritten all of that to introduce a database — which is precisely what the repository layer in PRD §34 existed to prevent. The cache keeps that promise: the database went in, and outside the store itself almost nothing else moved.

What this trades away, deliberately:

- **Writes are optimistic.** A rejected write (RLS, a constraint the UI didn't catch, a dropped connection) toasts and refetches the table rather than blocking the UI. Acceptable because every mutation here is one person editing one row of their own team's planning data — a lost write is recoverable and visible, not dangerous.
- **The whole data set must fit in memory.** True by a wide margin at this scale — nine tables, a design department's worth of projects — and the thing to re-examine if that ever stops being true.
- **Realtime refetches the whole changed table** rather than patching the changed row. No merge logic to get wrong, and at these row counts it costs nothing.

## Every authenticated user is an Admin; the access list is Supabase's sign-up switch

**Decision:** RLS grants full read/write on all nine tables to any authenticated user (PRD §6: one application role). There is no allowlist table, no roles column, and no per-user data. Access is controlled by **disabling public sign-up in the Supabase dashboard** and inviting users manually.

**Why:** The PRD has exactly one role, so a roles table would model a distinction the product doesn't make. The only real question is who may become authenticated, and Supabase already has a switch for that — a table would have been a second, weaker copy of it. When Editor/Viewer arrive (PRD §39) they become per-command policies in `schema.sql`, which is where they belong; the app still won't need to know.

This does mean **the dashboard switch is load-bearing**. It is called out in `supabase/schema.sql` next to the policies for that reason.

## No @supabase/ssr, no proxy.ts

**Decision:** Auth uses plain `@supabase/supabase-js` with the session held by the client. There is no `src/proxy.ts` (Next 16's renamed `middleware.ts`) and no cookie-based server session.

**Why:** There is nothing on the server to protect. No page fetches data server-side, there are no server actions and no API routes; the four `[id]/page.tsx` files are pass-throughs that await `params`. A proxy could only have redirected unauthenticated users to a login screen the client already shows, while adding a cookie-sync layer to keep working. RLS is the actual access boundary, and it is enforced by Postgres regardless of what any redirect does.

## product_owner_ids and project_admin_ids stay uuid[] columns, not join tables

**Decision:** Project's two stakeholder lists are `uuid[]` columns in Postgres, not `project_product_owners` / `project_project_admins` join tables. Referential integrity for them is the app's responsibility.

**Why:** Both are always written whole from the project form and only ever read with `includes` (`stakeholderSelectors.getStakeholderUsage`). Join tables would have bought enforced foreign keys at the cost of changing the `Project` interface, the form wizard, and the selectors — for two fields nothing queries *across*. The deletion guard that matters (refusing to delete a stakeholder still referenced by a project) already lives in `getStakeholderUsage` and is unaffected.

## Business rules that lived in UI code are now database constraints as well

**Decision:** `UNIQUE (project_id, designer_id)`, at most one `Lead` per project (a partial unique index), `UNIQUE (project_id, month)` on monthly targets, and a check that a weekly-focus `week_start_date` is a Monday are all enforced in Postgres. The UI still validates first.

**Why:** These were always rules; they were just unenforceable when the store was a JSON blob. The UI keeps validating so the user gets a specific message instead of a constraint-violation toast — the database is the backstop that makes the rule true of the data, not the primary messenger.

## Active/Inactive is the reversible lifecycle action everywhere; Archive is Projects' equivalent — both distinct from Delete

**Decision:** Designers, Squads, Departments, Epics, and Stakeholders all use Active/Inactive to retire a record without losing it; Projects use Archive (see above) for the same purpose. Neither ever deletes anything — that's now a separate, explicitly guarded capability, see the next entry for why and how it was added.

**Why:** A record connected to historical Projects needs to keep rendering there even once it's no longer current — Active/Inactive and Archive both exist so retiring something day-to-day never has to mean deleting it.

## Hard delete was reversed, but only when nothing still references the record — guarded, not blanket-disallowed

**Decision:** Every Master Data entity (Designers, Squads, Departments, Epics, Stakeholders) and Project now support a real, permanent Delete — explicitly requested, reversing this file's own earlier "no hard delete anywhere" rule. The reversal is guarded rather than unconditional: each Master Data page computes live usage (e.g. `getDesignerUsage`, `getSquadUsage`, one small selector per entity) before showing the confirm dialog, and Delete is refused with a message naming what's still using it whenever any count is non-zero. Project has no equivalent guard — nothing else in this schema references a Project by id — but deleting one cascades through its own Project Assignment/Monthly Target/Weekly Focus rows first, since those exist only in relation to it (`projectRepository.removeCascade`).

Usage counts intentionally ignore the referencing record's own status/archive state — an archived, Completed project still counts against deleting its Owner Squad, since that project's detail page would otherwise break.

**Why:** The original rule's rationale — historical Project context must never break because a referenced master-data row vanished — is exactly what the guard preserves; only the "never, under any circumstance" part was reversed. A user who wants to delete a genuinely-unused Designer or a duplicate Epic created by mistake now can, without reopening the risk the original rule existed to prevent. Two new shared components carry this everywhere it's needed: `ConfirmDialog` (plain yes/no) and `DeleteEntityDialog` (the blocked-vs-confirm branching), both built on the existing `Dialog` primitives rather than a new base component — this repo had no confirm-before-destructive-action pattern anywhere before (Archive/Deactivate fired immediately), and building a near-duplicate `AlertDialog` wrapper alongside `Dialog` was rejected as exactly the kind of redundant design-system component CLAUDE.md warns against.

## `Delete anyway` exists for Designer and Stakeholder only — the other three master-data entities cannot have it

**Decision:** The usage guard described in the previous entry can now be overridden, but only for Designer and Stakeholder. Their delete dialog keeps listing what still references the record, then offers a destructive `Delete anyway` that detaches those references automatically: a designer's Project Assignment rows are deleted and any squad they led is left leaderless; a stakeholder is stripped from every project's `product_owner_ids`, `project_admin_ids` and `department_head_id` snapshot, and any department they headed is left headless.

Squad, Department and Epic keep the hard block. This is not caution — it is that the option cannot be built honestly for them. `designers.home_squad_id`, `projects.owner_squad_id`, `projects.epic_id` and `projects.department_id` are all `NOT NULL`: there is no "detached" state for a project without an epic, or a designer without a home squad. "Delete anyway" there would mean deleting the projects too, which is not what anyone means by deleting an epic. The honest version is a reassignment flow ("move these four projects to which epic?"), which is a different feature; until it exists, Inactive is the answer.

**Why:** Detaching a designer from their projects by hand — open each project, remove them, then delete — is busywork the app can do correctly and atomically, and it was the actual friction reported. The counter-argument is real and was raised before building: force-deleting a designer discards the record of who designed those projects, which is exactly what the guard existed to protect. It is offered anyway because the user asked for it with that consequence stated, and because the dialog now spells the consequence out at the moment of decision rather than burying it. `Inactive` remains the non-destructive path and is still the right one for "this person has left".

**Follow-on schema change:** `project_assignments.designer_id` moved from `RESTRICT` to `ON DELETE CASCADE` (`supabase/migrations/001_designer_assignment_cascade.sql`). Not cosmetic — the app's writes are optimistic and unordered, so a client-side "delete the assignments, then delete the designer" sequence can have the designer's DELETE overtake the others and be rejected by the foreign key. Letting Postgres own the cascade makes it one request and one transaction. The cost is that the database no longer independently refuses a designer delete that has assignments; that guard now lives only in `getDesignerUsage` and the dialog. Squad, Department and Epic keep their `RESTRICT` keys, which is what makes their hard block real rather than merely enforced by UI code.

**Also changed:** `projects.department_head_id` was documented as a snapshot that "must survive the stakeholder row being deleted". Force-deleting that stakeholder now clears it. An id pointing at a row that no longer exists is a dangling pointer, not history — it resolves to nothing on screen either way, and the name it was meant to preserve is gone with the row.

## `Delete anyway` on a Verified Designer/Stakeholder also forces the claiming account back through Onboarding — via a DB trigger, not new client code

**Decision:** Force-deleting a Designer or Stakeholder row that is Verified (§15, §19 — some `profiles` row points at it via `designer_id`/`stakeholder_id`) now also clears that profile's `design_role`. That column is the entire `needsOnboarding` check (`src/components/auth/onboarding-view.tsx`, `!profile.design_role`), so clearing it is indistinguishable from a brand-new account: the next time that session loads the app it is shown Onboarding — captcha included, since `captchaVerified` is local state on a component that simply wasn't mounted a moment ago — rather than something bespoke like a "reinstate" screen or an "account deleted" notice.

Implemented as two `before delete` triggers, one on `designers` and one on `stakeholders` (`supabase/schema.sql`, `supabase/migrations/005_reonboard_on_verified_delete.sql`), each doing one `update profiles set design_role = null where designer_id = old.id` (or `stakeholder_id`). No new column, no new route, no new client code: `profiles` is already realtime-subscribed and already in `dataStore`'s cache (`subscribeRealtime`, §above "Supabase behind a synchronous in-memory cache"), so an already-open tab picks up the cleared `design_role` and drops into Onboarding on its own — no polling, no forced sign-out, no separate "live-force" mechanism had to be built for the already-signed-in case.

Scoped to fire only on an actual row DELETE, matched by `old.id` in the trigger — never on a profile voluntarily unlinking itself. Settings/Onboarding (`useProfileIdentityForm.handleSubmit`) always writes its own `design_role` change and awaits it (`profileRepository.save`, a real round trip, not optimistic) *before* separately calling `designerRepository.remove`/`stakeholderRepository.remove` on the now-unclaimed row — so by the time that row is actually deleted, no profile's `designer_id`/`stakeholder_id` still points at it, and the trigger's `where` clause matches nothing.

**Why:** Asked for directly — a deleted Designer/Stakeholder's account should not keep looking "done" once the record it verified into is gone, whether or not that session happens to be open right now. A trigger scoped to the delete itself (rather than, say, any transition of `designer_id`/`stakeholder_id` to null on `profiles`) is what keeps this from also firing on the legitimate, everyday case of an account switching away from a designer/stakeholder role on its own — that path clears `design_role` itself, deliberately, in the same save.

## `force_reonboarded` explains WHY Onboarding reappeared — a plain boolean, not a free-text reason column

**Decision:** `profiles.force_reonboarded` (`supabase/migrations/006_force_reonboarded_flag.sql`) is set to `true` by the same two delete triggers above, alongside the `design_role` reset they already do. `OnboardingView` reads it to show one extra note above the form — "An admin removed the designer or stakeholder record linked to your account, so we need you to confirm these details again" — instead of the plain first-time "Welcome to DesignOps" copy `needsOnboarding` alone can't distinguish (a brand-new account and a force-reset one both simply have `design_role = null`).

It clears itself: a third trigger, `clear_force_reonboarded` (`before update on profiles`), sets it back to `false` the moment `design_role` is set to anything non-null — i.e. the instant Onboarding's own save succeeds. No client code clears it, and nothing can leave it stuck true.

A single boolean rather than an enum/free-text reason column, deliberately: there is exactly one thing that sets it today (a force-delete unclaiming this account), so a column built to describe several causes would be speculative. Not user-writable — absent from the column-level GRANT, same as `system_role` — since a user setting this on themselves would fabricate a message about an admin action that didn't happen.

**Why:** Asked for directly — showing the exact same "Welcome to DesignOps" first-time copy to an account that just got its verified record deleted out from under it reads as an unexplained reset ("why do I suddenly have to fill this out again?"), not a fresh start. One sentence naming the actual cause is enough; a fuller audit trail (when, by whom) was not asked for and isn't built.

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

## Weekly Focus is a note, not a second task system

**Amended (Timeline Gantt):** the heading used to read "Timeline Week View is a **read-mostly** planning view". Weekly Focus bars can now be dragged to another week on the Timeline, so "read-mostly" no longer describes it. The anti-scope list below is unaffected and **remains binding**: moving a note to a different week adds no status, assignee, ordering, or completion field, and a focus bar deliberately cannot be resized — there is no field in which to store a multi-week focus.

**Decision:** Project Weekly Focus (`ProjectWeeklyFocus`: `id, project_id, week_start_date, title, description?`) is a new, narrowly-scoped entity that only records short "what is this project focused on this week" notes. It has no status, assignee, ordering, or completion field, and it does not carry a Designer reference — "who" is still 100% derived from Project Assignment (§8.7), exactly like Design Lead. `week_start_date` is always the Monday that starts the ISO week; this project has no other established week-start convention, so Monday was chosen as the plain, unambiguous default rather than inventing a configurable one. Like `ProjectAssignment`/`ProjectMonthlyTarget`, `ProjectWeeklyFocus` uses `createRemovableRepository` (real `remove()`), for the same reason: Edit Project must be able to diff a desired set of weekly items against what was loaded and remove the ones no longer wanted, not just soft-hide them.

**Why:** The user's request was explicit and detailed about the anti-scope list (no task status/assignee/subtasks/checklist/story points/sprint planning/Kanban/comments/per-item priority/workload/completion) — this is a direct, current-task PRD amendment (§8.9, §38), not a judgment call, so the entity is modeled to make those things structurally impossible to add later by accident (there's no field to hang them on) rather than merely discouraged in prose.

## Finer timeline scales live only on the portfolio Timeline; Person Timeline stays Month-only

**Decision:** The time-scale switcher (§14.2) applies only to the main Timeline page. Person Timeline (§14.6) — and the shared `MonthRangeTrack` component it uses — keeps Month-only granularity.

**Still holds after day-level dates.** Project now stores `start_date`/`end_date`, but Person Timeline derives its months with `monthOf()` at the point of use, so `MonthRangeTrack` kept its month-string API unchanged and day-level precision never leaks into a view whose job is overlap, not scheduling. `MonthRangeTrack` survives the Gantt rewrite for exactly this reason, even though `WeekGridTrack` was deleted.

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

## Motion is tokenized on the transitions.dev scale, minus five easings — three left to Tailwind, two dropped as off-direction

**Decision:** Installed the `transitions-dev` + `transitions-polish` skills (from `github.com/Jakubantalik/transitions.dev`) into `.claude/skills/`, and applied their motion-token scale to `src/app/globals.css` as a plain `:root` block: `--duration-*` (7), `--ease-smooth-out`, `--distance-*` (5), `--scale-*` (4), `--blur-*` (3). Every overlay surface now references those tokens instead of literals — Dialog, DropdownMenu, Select and Tooltip use `data-open:duration-(--duration-fast)` / `data-closed:duration-(--duration-quick)`, `ease-(--ease-smooth-out)`, and a per-surface pre-scale (`--scale-large` modal, `--scale-medium` dropdown open, `--scale-tiny` dropdown close, `--scale-small` tooltip) in place of a blanket `duration-100` + `zoom-in-95`. A global `prefers-reduced-motion: reduce` guard was added; the app previously had none. `TooltipProvider`'s `delay` default moved from `0` to `80` (`--duration-micro`) as an intent gate.

The skill's `--ease-out`, `--ease-in-out` and `--ease-linear` tokens were **deliberately not installed**. Tailwind v4 already defines those exact custom-property names in its own default theme (`node_modules/tailwindcss/theme.css:434-436`), so redefining them in `:root` would silently repoint every `ease-out` / `ease-in-out` utility app-wide. Those three usages use Tailwind's native `ease-*` utilities instead — hence `ease-out` (not a token) on the tooltip. Any future token added from this scale must be checked against Tailwind's theme namespace the same way.

The scale's `--ease-bounce` and `--ease-bounce-strong` were later **removed**. They were installed with the rest of the scale but never referenced by anything, and overshoot easing contradicts the restrained, enterprise motion direction the PRD sets — which `CLAUDE.md` says wins over any installed skill's defaults. A token nothing uses, in a style the product has decided against, is a trap rather than a vocabulary: it invites a future change to reach for motion this app doesn't want. Impeccable's detector flags both values independently, so leaving them would have meant carrying a standing suppression for tokens with no callers. Re-adding a line is trivial if a genuine need for overshoot ever appears.

**Why:** Motion values were previously ad hoc shadcn defaults with no shared vocabulary and no open/close asymmetry — a modal opened and closed in the same 100ms. The token scale gives motion one source of truth the way `--status-*` already does for color, and encodes the rule that closes should be quicker than opens (250ms open → 150ms close). Per `CLAUDE.md`'s precedence list the PRD's enterprise / calm / restrained direction still wins over the skills: no new decorative transitions were added, only existing motion was tuned onto the scale.

**Verified:** `next build` clean, and the compiled CSS confirms the `duration-(--var)` / `ease-(--var)` / `zoom-in-(--var)` utilities resolve to real declarations under both `[data-state=open]` and `[data-open]` selectors.

**Known follow-up, not applied:** `transition-all` remains on `button.tsx`, `badge.tsx` and `switch.tsx`. The skill flags it (unrelated property changes animate for free), but enumerating the exact property list on the app's most-used component risks silent hover/focus regressions, so it was left for a deliberate pass.

## "Proposed" was retired rather than kept alongside the new Completed/Cancelled lifecycle

**Decision:** The task's requested lifecycle (`Planning → In Progress → On Hold/Completed/Cancelled`) does not mention Proposed at all, and rather than bolting it on as a 6th status, it was removed: every project now starts in Planning. This took Overview's "Upcoming / Proposed" stat tile and "Upcoming Projects" list out with it, since both existed only to report projects in that status — see `docs/CHANGELOG.md`. `getProposedProjects()` was deleted from `projectSelectors.ts` rather than left dead.

**Why:** Explicitly confirmed with the user when planning this change, over the alternative of keeping Proposed as a 6th status purely to avoid touching Overview. Carrying a status the new lifecycle spec never asked for, just to minimize the diff, would have been the kind of scope hedge that leaves two competing "what does upcoming work mean" answers in the product.

## Completion's "allocations after this date" question is answered against Project.end_date, not a new ProjectAssignment field

**Decision:** `ProjectAssignment` has exactly three fields (`project_id`, `designer_id`, `project_role`) — no date range; an assignment spans a project's entire `start_date`–`end_date`. The Mark-as-complete dialog's warning ("N designers still have allocations after this date") and its "keep as historical" vs "end allocations on completion date" choice are both implemented purely in terms of the project's own `end_date`: the warning shows when `end_date` falls after the completion date AND at least one assignment exists; "end allocations" sets `end_date` to the completion date, "keep as historical" leaves it unchanged. (Day-level dates fixed a small lie here: the button has always said "on completion date" while truncating to the completion month.) Neither choice writes to `ProjectAssignment` — there is nothing on that row to write to.

**Why:** Confirmed with the user rather than assumed, since the literal task wording ("2 designers still have allocations after Sep 12") reads as if each assignment carried its own end date. Adding one would have been a real schema change with knock-on UI everywhere an assignment is shown, and edges uncomfortably close to the allocation/capacity-percentage calculations PRD §4.2/§38/§42 explicitly ban — a single user-entered completion date compared against the project's own already-modeled `end_date` answers the same product question without inventing new precision the data was never designed to support.

## Master Data's row-level "Delete" and Project Detail's lifecycle actions reuse the existing `Dialog`, not a new `AlertDialog` primitive

**Decision:** `ConfirmDialog` and `DeleteEntityDialog` (`src/components/shared/`) are both thin compositions of the existing `components/ui/dialog.tsx` — `DialogContent showCloseButton={false}` plus a `DialogFooter` with the two buttons — not a new `alert-dialog.tsx` base primitive wrapping `@base-ui/react/alert-dialog`, even though that dependency is already installed and a shadcn-style wrapper would have been a natural-looking addition. Mark-as-complete (the one flow with real form fields — a date input plus a conditional radio choice) stays a fully bespoke `Dialog`, matching the precedent already set by Timeline's week-detail popup.

**Why:** CLAUDE.md's explicit constraint: "Do not create duplicate Button, Badge, Dialog, Dropdown, Avatar, Tooltip, or form components." An `AlertDialog` wrapper would have been visually and behaviorally near-identical to `Dialog` (same popup chrome, same footer shape), differing mainly in default close-button/backdrop behavior — exactly the kind of near-duplicate primitive the rule is aimed at. Composing the two new flows on top of `Dialog` gets the same result (a confirm-before-you-act pattern this app never had) without adding a second Dialog-shaped component to the design system.

## Day-level dates are collected through one shared `DatePicker`, not `<input type="date">`

**Decision:** `src/components/shared/date-picker.tsx` is now the single control for every day-level date the app collects — Add/Edit Project's Start Date and End Date (§22) and Mark-as-complete's Completion date. It composes the existing `ui/calendar.tsx` (react-day-picker) inside the existing `ui/popover.tsx` behind an outline-button trigger, and stays string-in/string-out on the same `"YYYY-MM-DD"` contract the native input had, so no caller's state or validation changed. `captionLayout="dropdown"` with an explicit `startMonth`/`endMonth` window (current year −3 to +6, widened to always contain the current selection) replaces the native widget's one-month-at-a-time stepping. An optional `min`/`max` bound renders out-of-range days disabled — used for End Date, which cannot precede Start Date.

No new dependency and no new primitive: `react-day-picker`, `ui/calendar.tsx` and `ui/popover.tsx` were all already installed, with Calendar previously used in exactly one place (the Gantt's "go to date" nav).

**Why:** `<input type="date">` renders a different, OS-supplied widget in every browser — it ignores the app's theme, typography, radii and motion tokens entirely, so the three date fields were the only controls in the product that didn't look like the product. The dropdown month/year navigation matters specifically here: this is a planner whose projects routinely run a year or more out, and the native control made reaching those months a long click-through. Per `CLAUDE.md`'s "prefer existing reusable components over creating duplicates", this is a composition of components already in the repo rather than a new base primitive.

**Implementation note:** the `min`/`max` bounds compile to an **array** of matchers (`[{ before }, { after }]`), never a single `{ before, after }` object — the combined form means "days *between* the two" in react-day-picker, which is the exact inverse of a min/max bound.

**Verified:** `tsc --noEmit` and `next build` clean; no `type="date"` remains in `src/`.

## Squad membership is editable from Master Data → Squads, and "remove from squad" is a move

**Decision:** Master Data → Squads gained `Add member` and `Manage members`,
replacing the read-only `View members` popup. Both write
`Designer.home_squad_id`; neither introduces a squad-membership record of any
kind. The per-member menu offers `Move to another squad`, never `Remove from
squad`, and the move step requires a destination squad.

**Why:** The request asked for a `Remove from squad` action defined as
`designer.homeSquad = null`, and that state does not exist in this product.
`designers.home_squad_id` is `not null` in `supabase/schema.sql`, non-nullable
in `src/lib/domain/types.ts`, and PRD §25 states the rule it enforces outright —
"a designer cannot exist without a home squad" — which is also why Squad has no
`Delete anyway` path while Designer does. Making it nullable would have been a
migration plus an "Unassigned" branch in every view that reads Home Squad
(Designers, People, Teams, Overview, the Projects cross-squad filter), i.e. a
data-model change to the org structure, made in passing during a UI task. The
product question the action answers — "get this person out of my squad" — is
fully served by a move, and a move is the only outcome the schema can
represent. If an unassigned bench is genuinely wanted later, it should be
decided as its own change to §4.3/§25, not inherited from a dialog.

**Squad Lead is a different case and got the opposite answer.**
`squads.lead_designer_id` *is* nullable ("a squad can exist with no lead
assigned yet", §8.2), so the requested "allow Squad Lead = Unassigned" is
honoured: moving a lead out of the squad they lead warns first, then clears that
squad's lead. Nothing in the schema requires a lead to be a member, but a lead
who has left reads as stale data rather than as a decision, so the move clears
it instead of leaving it dangling.

**Steps, not stacked modals.** Manage members is one `Dialog` with three
views — the member list, the move step, and the add step — each swapped in
place, with `Back` returning to the list. Base UI does support nested dialogs,
but a dialog on a dialog means two focus traps and two dismissals for one
decision; it also suppresses the child's backdrop, so the second surface lands
directly on the first at the same size and reads as a redraw anyway. Swapping
in place says the same thing with one focus trap and one Escape key, and it is
the pattern the move step needed regardless.

That is also where confirmation lives. The lead warning renders inline above
the destination picker, and in Add members the lead-impact callout appears as
the selection is made — so the consequence is on screen *while* the user is
choosing, not in a second dialog after they have committed. The footer button
is the confirmation.

`AddSquadMembersPanel` is therefore exported alongside `AddSquadMembersDialog`:
the panel is the whole thing minus the `Dialog` shell, so the step inside Manage
members and the standalone dialog are the same component, not two that have to
be kept in agreement.

**Why the count is a link and the row is not.** Clicking `3 designers` opens
Manage members. The row was left non-clickable on purpose — Squad Name, Squad
Lead and Status all mean something else, and a whole-row target would make the
squad name's own link ambiguous.

**Implementation notes:**

- `AssignDesignersDialog` (Teams) was promoted to
  `src/components/shared/add-squad-members-dialog.tsx` and is now used by both
  screens, rather than Squads growing a near-copy of it. Per `CLAUDE.md`'s
  "prefer existing reusable components over creating duplicates".
- Both dialogs take a squad **id** and look the row up from the live `squads`
  list on every render. A captured `Squad` object would have left the
  `Squad Lead` badge showing the previous lead immediately after
  `Make Squad Lead` — the write lands in the cache, but a snapshot taken at
  click time never hears about it.
- `designerRepository.setHomeSquad(ids, squadId)` was added so a multi-person
  add is one cache write and one `PATCH … in(id, …)`, instead of the previous
  loop of N independent optimistic updates that could half-apply.
- No spinner on submit. Repository writes are synchronous and optimistic, so a
  loading state would be theatre; `Add members` disables on click purely to stop
  a double submit landing twice before the dialog unmounts.

**Verified:** `tsc --noEmit`, `eslint src` and `next build` clean; the
`/master-data/squads` route compiles and serves 200 in dev.

## The Add/Edit Project wizard is a sectioned settings form, not one field list

Every step used to be a single stack of labelled controls inside a card, with a
`Step 1 of 4: Project Context` heading repeating what the stepper above it
already said. At thirteen fields, Step 1 read as one administration form to get
through rather than three questions to answer.

Each step is now a set of named sections: the section's purpose on the left
(220px), its controls on the right (capped at ~768px so a field never stretches
to a 1440px reading width), one hair rule between sections. `Ownership / Define
who owns the project, and which squad is responsible for it.` answers the
question a bare `Product Owner *` label leaves open, without a line of helper
text under every input.

Not a card per section, deliberately (§29): the step is already inside one
surface, and five nested boxes draw borders where the page needs rhythm. The
two columns stack below ~1024px — at the shell's 768px floor a 220px
description column leaves the controls cramped.

`WizardSection` / `WizardField` / `WizardFieldRow` live beside the steps in
`src/app/projects/_components/wizard-section.tsx` rather than in
`components/shared`: they are the wizard's layout, and Settings already has its
own `SettingsSection` for a single-column page. If a third screen wants this
pattern, that is when it moves.

## Project Health is not asked for when creating a project

Health is an assessment of a project that is already running. At creation there
is nothing to assess, so the field is shown only in edit mode (§21), and Review
summarizes it only when it was asked for.

The column is `not null` with three allowed values (`supabase/schema.sql`), so
a new row still carries the first one. A fourth "Not assessed" value would be
the honest answer, and it was not added: it is a schema migration plus every
place health is read — Overview's health breakdown, the Projects and Timeline
filters, `HealthBadge`, the seed data — which is a product change to §11, not a
form change. Flagged as a follow-up rather than smuggled in with a layout
refactor.

## Validation appears per field on attempt, not as a standing list of what is missing

The footer used to carry `Required to continue: Project Name, Epic, Department,
Product Owner, Owner Squad` for as long as the step was incomplete — visible
from the moment the form opened, which is before the user has done anything
wrong.

Now each field states its own problem under itself, and only once `Next` has
been pressed on that step. `Next` stays enabled and reveals the errors rather
than sitting disabled: a dead button with no explanation is the thing the
standing list existed to avoid, and this answers the same need at the field
that has the problem. The footer adds one line — `Fill in the highlighted
fields to continue.` — because the first red field may be scrolled off the top.

Errors clear as fields are filled, so the step never stays red once it is
valid.

## Two multi-select controls, chosen by where the list lives

`MultiSelectChecklist` is an always-open bordered list. It stays the right
control inside a dialog, where the list *is* the content (Add squad members).

On a form page it is wrong: Product Owner, Project Admin / PIC and Supporting
Designers each put every stakeholder or designer on screen permanently, so one
section scrolled like a directory. `SearchableMultiSelect` puts the roster
behind a trigger and keeps only the chosen rows visible, each removable. Its
shape is `PersonSelect`'s — trigger, search box, checkmark list — so it reads as
the control the app already uses; the one difference is that the popover stays
open while ticking, because picking three people should not mean opening the
same list three times.

## Projects gained a Board/List view — why that is not the "Kanban" §38 excludes

`docs/PRD.MD` §38 has listed `Kanban` as out of scope since MVP planning, and
every other occurrence of the word in the PRD is specifically about
*task-level* Kanban: turning Weekly Focus, or a project's internals, into a
Jira-style board of subtasks with per-task status, assignee, story points,
and workload (§8.9, §14.2). None of that changed — Weekly Focus is still a
short planning note, not a task list.

The Board added to the Projects page (§14.3) is a different feature at a
different altitude: its cards are whole Projects, its columns are Project
Status, and it lives on the screen that already had a Status column in its
table. Grouping records by status is the same visibility the old table
already gave a Status cell — this only changes the projection, not what is
tracked. It is exactly as much "task management" as the table it replaces.

**Decision:** proceed with the project-level Board, and amend §38's Kanban
line to say so explicitly, rather than read the literal word as blocking a
feature it was never written to describe. This was an explicit instruction
from the person requesting the work, which outranks the PRD per this
repo's own precedence order (`CLAUDE.md`) — but a scope call like this gets
written down here rather than silently overridden, the same discipline
every other PRD deviation in this file follows.

## Project status stays a relabel, not a rename — no migration

The Projects revamp's board columns are "To Do / In Progress / Done", but
the stored `ProjectStatus` enum is untouched: `Planning`, `In Progress`,
`On Hold`, `Completed`, `Cancelled` (`src/lib/domain/enums.ts`) still back
every filter, selector, and Supabase column exactly as before.

`PROJECT_STATUS_LABELS` (same file) is the one new thing: a display-label
map consumed by `StatusBadge` and the Status filter's option labels —
`Planning` reads "To Do", `Completed` reads "Done", the other three keep
their own name. Every other file that used to render `project.status`
directly now renders through `StatusBadge`, so the relabeling is visible
everywhere status text appears (Overview, Timeline, People, Projects)
without any of them knowing about it.

**Decision:** relabel only. Actually renaming the enum values (`Planning`
→ `"To Do"` etc.) was the more literal reading of the originating spec, but
it is a real Supabase migration touching a production table plus every one
of the ~10 files that pattern-match on the literal strings — for a change
that is purely cosmetic ("what do we call this status"), that risk buys
nothing a label map doesn't already buy more cheaply and more reversibly.

## The Board's lifecycle transitions are an explicit matrix, not "drop it anywhere"

Only three moves are legal on the Board, whether by drag or by the card's
own button:

```text
Planning ("To Do")  -> In Progress    (gated: at least one designer assigned)
In Progress         -> Completed      (opens the existing "Mark as complete" flow)
Completed ("Done")  -> In Progress    (reopen)
```

`Planning -> Completed` direct and `Completed -> Planning` direct are both
rejected (a toast explains why, nothing is written) — both would let a
project skip or erase the "someone actually worked on this" state a
day-to-day operational board exists to represent. There is also no
in-column manual reordering: `Project` has no `order` column, and nothing
in the originating spec asked for one, so dragging only ever changes a
card's status, never its position within a column.

Every legal transition has a non-drag equivalent on the card itself (Start
project / Mark done / Reopen) — drag is one of two ways to make the move,
never the only one, per the existing accessibility rule that drag-and-drop
actions need a non-drag alternative (§29).

`@dnd-kit/core` + `@dnd-kit/utilities` were added for the drag interaction
(no drag library existed in this repo before). `@dnd-kit/sortable` was
deliberately left out: it exists for in-list reordering, which the Board
doesn't do, so pulling it in would be a dependency for a capability nothing
uses. The drag itself is exactly as risky as Timeline's existing
drag-to-reschedule, which already writes straight to a Project's date
fields through the same synchronous, optimistic repository layer
(`projectRepository.update`) — this is the same mechanism applied to
`status` instead of `start_date`/`end_date`, not a new pattern.

## `On Hold` and `Cancelled` projects are never a Board column, but are never fully hidden either

The Board's three columns are a deliberately fixed, small set (§6.1 of the
originating spec explicitly says not to add more workflow columns). `On
Hold` and `Cancelled` projects are real, and a Board that silently dropped
them from view would make "where did that project go" a real support
question.

**Decision:** a compact secondary strip renders above the three columns
whenever On Hold or Cancelled projects exist in the current filtered set —
counts only, each linking into Table/List pre-filtered to that status. The
page's Status filter also stays visible on Board (unlike the old Active/
Completed tabs, which hid the granular Status control outside "All") —
Board's fixed column scope and the Status filter are independent controls
now, not one gating the other.

## Two different "no designer" concepts, kept separate and separately named

The Board's "Start project" gate and its Needs Allocation quick filter both
check `canStartProject()` (`src/lib/selectors/projectSelectors.ts`): no
Lead **and** no Support assignment at all. This is a different question
from the pre-existing `designLead === UNASSIGNED_DESIGN_LEAD` filter
(Lead-only), which already had a name, a sentinel, and a consumer —
Overview's "Unassigned Projects" KPI links to `?designLead=unassigned`
expecting exactly the Lead-only meaning.

Reusing "Unassigned" as a label for both would make one word mean two
different things depending on which control showed it. So: the Board/List/
Table quick filter is **Needs Allocation** (`needsAllocation` on
`ProjectFilters`, matching `!canStartProject`), and the existing Lead-only
filter's option label was tightened from the bare "Unassigned" to **"No
Design Lead"** — both now name what they actually check, and a project with
a Support designer but no Lead correctly matches one but not the other.

## Assignment reconciliation lives once, in the repository, not once per caller

Setting a project's Lead+Support roster used to be implemented twice:
inline in the Add/Edit Project wizard's submit (a full diff against
originally-loaded rows) and inline in `AssignLeadControl`'s single-field
Lead edit (remove-old/promote-or-create-new). The Board's new "Assign
design team" dialog would have been a third copy of the same diffing logic.

**Decision:** `projectAssignmentRepository.reconcile(projectId, desired)`
(alongside `create`/`update`/`remove`, the same repository already owns
this entity's writes) takes a project's whole desired Lead+Support roster
and does the add/remove diffing once. The wizard, `AssignLeadControl`, and
the new `AssignTeamDialog` all call it instead of each rolling their own —
matching the precedent `designerRepository.setHomeSquad` already set for a
bulk relationship-write living in the repository rather than at each call
site.

## Department replaces Job title; Department Head becomes a second linkable person type

Two requests drove this at once: an account should be able to self-assign as
Project Design Lead without a separate Master Data step, and a business-side
stakeholder (a Department Head, no design background) should get an account
too — one that shows up in Master Data → Stakeholders, never → Designers.

**Job title, gone from Profile.** `profiles.job_title` was free text, was
mirrored one-way onto the linked Designer, and nothing else read it.
`Designer.job_title` already exists and is already the value every planning
screen renders — Profile carrying a second, ignorable copy was never load-
bearing, it was just a field. It is replaced with `department_id`, a
structured pick from existing Master Data (Departments), because the new
Department Head path needs exactly that value to create a Stakeholder
(`Stakeholder.department_id` is required) — the same field earns its keep
twice instead of once. `supabase/schema.sql`'s own header promises `profiles`
maps 1:1 onto `src/lib/domain/types.ts`; a column the app no longer reads or
writes would break that, so the column is dropped
(`supabase/migrations/003_department_head_profiles.sql`), not just orphaned.

**"Department Head" added to `design_role`, not to a new axis.** It reuses the
exact string already used by `stakeholder_type` (`docs/PRD.MD` §8.5) —
deliberately, since it names the same concept. Every other `design_role` value
means "this account is a Designer"; this one value means "this account is a
Stakeholder" instead. That is inconsistent on its face (one enum, two
different kinds of "what you link to") and was chosen anyway over adding a
second, parallel "account type" field: a person picking their own role in
Settings does not think in terms of the app's join tables, and a Department
Head choosing "Department Head" from the same list they'd otherwise choose
"Design Lead" from is the natural action. The inconsistency is contained to
one `isDepartmentHeadRole` check in the Profile page and the two symmetric FK
columns below it — it never leaks into any other screen.

**Two nullable, mutually-exclusive link columns, not one polymorphic one.**
`profiles.designer_id` already existed; `profiles.stakeholder_id` is added
alongside it rather than replacing it with something like
`(person_type, person_id)`. Postgres can enforce "unique per table" on two
plain FK columns (`designer_id unique`, `stakeholder_id unique`) for free —
a single polymorphic column loses the FK entirely (it can't reference two
tables) and would move that uniqueness/referential-integrity guarantee into
application code that today doesn't need to carry it. The application-level
invariant this trades in return — at most one of the two columns is ever
non-null at a time — is enforced in exactly one place, the Profile page's
submit handler, the same way `ProjectAssignment`'s "at most one Lead per
project" is a partial unique index plus one reconciling function rather than
a type that makes the illegal state unrepresentable.

**Switching roles across the Designer/Stakeholder boundary reuses the Delete
guard, not a new one.** Master Data already blocks deleting a Designer or
Stakeholder that is still referenced (`getDesignerUsage`/
`getStakeholderUsage`, behind `DeleteEntityDialog`'s blockers), with a
"delete anyway" escape hatch. Changing your own `design_role` away from
Designer (or away from Department Head) removes the record that was standing
in for "you" in that table — the same action as its own Delete, just
triggered from a dropdown instead of a menu item. It uses the same two usage
selectors as the guard, but intentionally has **no** "do it anyway" escape
hatch the way Master Data's Delete does: Master Data's force-delete is a
deliberate admin action on someone else's record with a confirmation dialog
spelling out the consequence; here it would be one dropdown change on your
own profile silently orphaning a squad's lead or a project's assignments. If
that block ever proves too strict in practice, the fix is to reassign the
squad/project first, not to add a silent force-path to a settings form.

**Creating the linked record happens inline in Settings, not by sending the
user to Master Data first — and it is always opt-in, never required by the
role choice itself.** A Designer requires a Home Squad (`home_squad_id not
null`); a self-provisioning flow can't manufacture one, so Settings asks for it
right there, once, only when needed (no existing link, and the chosen role
needs one). A Stakeholder only requires a Department, which Settings already
collects for its own sake — so that side needs no extra field at all, the
create action just becomes available the moment a Department is chosen.

Choosing "Department Head" — or any Designer-type role — never *blocks* Save
on picking a department or a squad. Not every account belongs to a squad yet
(a brand-new hire, someone between squads) or knows their department on day
one, and the underlying record — Designer, Stakeholder — is optional in the
data model regardless ("an account with no person record is still a complete,
working account"). Making role selection hostage to an org-chart detail would
contradict that. So the squad/department picker is just deferred: leave it
blank and `design_role` still saves; come back later once it's known, pick it,
and that save is what creates and links the record. This mirrors the "Team
profile" link itself, which has always been optional in exactly the same way.

Both creates are deferred to the same `Save changes` submit as everything else
on the page (`docs/DECISIONS.md` "Settings writes are awaited"), rather than
firing immediately when a squad/department is picked — one save, one moment
where the account's identity either fully
updates or fully doesn't.

## `AvatarGroup` — a new shared component, because none existed

`PersonAvatar` (`src/components/shared/person-avatar.tsx`) is single-avatar
only; nothing in `components/shared` stacked several. The Projects revamp
needed one for Board cards, List rows, and Table's new Designers column, so
`src/components/shared/avatar-group.tsx` was added — built on the
`AvatarGroup`/`AvatarGroupCount` primitives already shipped in
`components/ui/avatar.tsx` (present, but unused anywhere, before this),
the same way `PersonAvatar` itself is a thin layer over the base `Avatar`
primitives. No new visual system — just the overlap/ring/count styling
those primitives already carry, wired up to a list of people.

## Onboarding is a data-driven gate inside DataProvider, not a route

A newly-invited account landing with no Design role used to just reach the
app in that state — nothing prompted them to finish their profile, and
Master Data would quietly gain a person with an empty identity. The fix asked
for was a first-login screen that requires it before anything else is usable.

**No `/onboarding` route, no redirect.** `AppFrame`/`DataProvider` already sit
in front of every route and already render something else entirely in place
of `children` for one state (`phase.kind === "signed-out"` → `<LoginView />`).
Onboarding is the same technique for a second state: `OnboardingGate`, a small
component inside `DataProvider`, calls `useCurrentUser()` and renders
`<OnboardingView />` instead of `children` whenever `needsOnboarding(profile)`
is true. There is nothing to navigate to or away from, so there's no
redirect flash, no "wrong URL" to defend against, and no separate
`has_onboarded` column to keep in sync with reality — the same
`profile.design_role` that already means something (§6.1) is the entire
condition, and it clears itself the instant that field is saved because
`useCurrentUser` reads the same reactive cache everywhere else in the app
does.

**The gate reuses Settings → Profile, it does not fork it.** The two are the
same operation — "give this account a name, a department, a design role, and
optionally a linked person record" — in two different frames (a full Settings
page with a persistent Save button; a one-time full-screen form with a
Continue button). Before this, Settings → Profile owned that logic inline.
It's now `src/lib/hooks/use-profile-identity-form.ts` (state + validation +
the create/drop/usage-guard submit logic from the previous decision above) plus
two presentational components, `ProfileIdentityFields` and `TeamProfileFields`
(`src/components/shared/`), that both surfaces render identically. The one
behavioral difference — Onboarding cannot be skipped with Design role left
"Not set" — is a single `requireDesignRole` flag the hook takes, not a
parallel copy of the validation. `SettingsSection` moved from
`src/app/settings/_components/` to `src/components/shared/` in the same
change, since it's no longer Settings-only and the underscore-folder
convention marks it private to that route otherwise.

**Department and the Designer/Stakeholder link were initially left optional on
this screen too, then partly reversed** (see "Onboarding requires a linked
Designer record for designer roles" below) — a real invite went through
onboarding as a designer-type role, skipped the (fully optional) Home Squad
field, and never got a Designer record at all. Department and the
Department-Head/Stakeholder side of Team profile stay optional: a first-login
screen is exactly the moment someone is least likely to know their department
yet, and nothing about a Stakeholder is silently invisible the way an
unlinked Designer is.

**Required/Optional is stated on the label, not left to the paragraph below
it.** Onboarding surfaced a real usability problem: with everything phrased as
prose ("Optional — leave this for now if..."), it read as unclear which of
several fields actually gated Continue. `Required`/`Optional`
(`src/components/shared/field-requirement.tsx`) are two one-line tags appended
to `FieldLabel` text — `*` for required, a muted "(optional)" for everything
else — rather than a new `Field` prop or a rewrite of the description copy.
Design role is the one label whose tag changes with context (`*` on
Onboarding, "(optional)" in Settings), driven by the `requireDesignRole` flag
the hook already carried for its submit-validation; every other field's
requiredness doesn't depend on which screen is rendering it.

**Self-provisioning's create-then-link had a real foreign-key race, not just
an unclear-copy problem.** `designerRepository.create`/`stakeholderRepository.
create` are the ordinary optimistic writes (docs/DECISIONS.md "Supabase
behind a synchronous in-memory cache") — they return a complete record
synchronously and send the actual INSERT to Supabase in the background,
unawaited. The very next step in this flow, though, is an *awaited* `profiles`
UPDATE that points `designer_id`/`stakeholder_id` — a real foreign key — at
that record's id. Nothing guaranteed the INSERT would land before the
awaited UPDATE reached Postgres; when it didn't, the FK check failed against
a row that (from the browser's own cache) looked like it already existed.
Fixed with `createAwaited` on both repositories — same shape as `create`, but
`await`s the insert before returning — used only at this one call site. Every
other caller of `create` still gets the fast, optimistic version; this is not
a change to how those repositories behave everywhere.

## Onboarding requires a linked Designer record for designer roles; Settings still doesn't

A real invite exposed the gap in "Department and the Designer/Stakeholder link
stay optional on this screen too" (further up this file): an invited account
picked a designer-type Design role, left the (optional) Home Squad field
alone, hit Continue, and landed in the app never having been linked to a
Designer record. Nothing broke — that is exactly what optional was specified
to allow — but the result was silently wrong for the actual goal of inviting
someone as a designer: they didn't show up in Master Data → Designers, or in
any Squad Lead / supporting-designer picker, until someone noticed and fixed
it by hand.

**Decision:** Onboarding (`requireDesignRole`) adds one more requirement on
top of "Design role can't be Not set": if the chosen role is a designer-type
one, the account has to end up with a non-null `designer_id` before Continue
proceeds. Settings → Profile does not gain this rule — an existing account is
still free to unlink itself from its Designer record at any time, matching
every decision above about self-provisioning being opt-in there.

**Home Squad itself stays optional, even under this new rule** — the
requirement is "linked to *a* Designer record," which has two routes: pick an
existing unclaimed one via the `Designer record` field, or create one by
choosing a Home Squad. Tagging `Home Squad` itself `Required` would have been
wrong (and was rejected): filling it is never mandatory in isolation, only
one of two ways to satisfy a requirement that lives on the field above it. The
`Required`/`Optional` tag therefore moved to the `Designer record` label
instead, conditioned on `form.requireDesignRole` — the one label in
`TeamProfileFields` whose tag actually changes between the two screens.

## Create new / Link existing is a Tabs switcher, not two adjacent fields

Feedback on the shipped Onboarding screen: "Designer record" read as a
link-only picker, with "create a new one" living in a separate field below it
(`Home squad, to create a new record`) that was easy to never notice —
especially since the most common case reaching this screen is an account with
*nothing* to link to yet, at which point the picker just shows an empty
"Not linked" and gives no hint that creating one is even possible.

**Decision:** both the Designer and Stakeholder side of Team profile are a
`Tabs` switcher (`Create new` / `Link existing`), reusing the same primitive
`ProjectViewSwitcher` already uses as a plain controlled value-switcher (no
`TabsContent`, just conditional rendering keyed off the selected value) —
not a new interaction pattern for this app. **Defaults to `Create new`**: most
accounts here have never had a person record before, so that is the likely
path, not linking one an admin happened to add in advance. `Link existing`
still always shows, even with zero unclaimed records to offer — hidden would
have read as "not possible," but "No unclaimed \[…\] records exist yet — use
Create new instead" says why, which is more honest than removing the option.

Switching tabs clears the other tab's selection (a stale `designerId` behind
a `Create new` tab would still submit as *linking* that id, not creating
anything) — `handleDesignerModeChange`/`handleStakeholderModeChange`, not the
bare `setDesignerMode`/`setStakeholderMode` a plain `Tabs` `onValueChange`
would suggest.

**The initial tab, and flipping back to `Link existing` after a create
succeeds, is state adjusted during render, not a `useEffect`.** A `designerId`
arriving from null to non-null (a fresh link, or the very record this
component just created) should flip the visible tab to `Link existing`
without an extra render's delay — exactly the case React's own docs describe
as "adjusting state when a prop changes," using a tracked previous-value
`useState` compared during the render body. The equivalent `useEffect` was
tried first and rejected: the project's lint config flags
`setState`-in-effect for exactly this reason (cascading renders), and the
render-time version is both what's recommended and one render cycle faster.

## Onboarding's captcha is local button-gating state, not a form validation rule

Explicit ask: require a captcha after the Onboarding form is filled in, before
the account can finish onboarding. Picked `playcaptcha` (`ClawCaptcha`) — a
claw-machine mini-game captcha — over a conventional checkbox/image captcha
because it was the package requested; it's a young package (v0.1.0, single
maintainer) with no track record, flagged to the user before installing, who
chose to proceed anyway.

**Decision:** the captcha lives entirely in `OnboardingView`
(`src/components/auth/onboarding-view.tsx`), as its own `step: "form" |
"captcha"` and `captchaVerified` `useState`, not inside
`useProfileIdentityForm`. That hook is shared with Settings → Profile
(`docs/DECISIONS.md`, "Field and perilakunya identik…" in `docs/PRD.MD` §6),
and Settings never asks for a captcha or has a second screen — putting either
in the hook would have required flags threaded through both call sites for
something that is, per the ask, onboarding-only.

**Two screens, not one form with the captcha appended:** the fields screen's
"Continue" is a plain submit that calls a new `form.validate()` — the exact
guard clauses `handleSubmit` always ran (name required, Design role
required, linked-designer requirement, in-use-elsewhere checks), extracted
out of `handleSubmit` so they can run on their own before the screen switch.
`handleSubmit` itself is unchanged in behavior: `validate()` first, then the
same save it always did. Only once `validate()` passes does `setStep`
switch to the captcha screen, which renders `ClawCaptcha` behind its own
`<form onSubmit={form.handleSubmit}>` and a "Confirm" button
(`disabled={form.submitting || !captchaVerified}`) — that is the button that
actually persists. A "Back" link returns to the fields screen without losing
its state (the hook's state lives in `OnboardingView`, above both screens, so
switching `step` back and forth doesn't remount it).

**Visual fit:** this is an enterprise/calm/minimal product; the package's
default styling is bright and playful. `ClawCaptcha`'s themeable CSS vars
(`--clawcap-bg/-ink/-muted/-accent/-action`) are mapped in
`src/app/globals.css` onto this app's own tokens (`--card`, `--foreground`,
`--muted-foreground`, `--primary`, `--destructive`) so the one playful step
in onboarding still reads as DesignOps rather than a bolted-on widget from a
different product.

**Assets:** the package serves toy PNGs from a configurable `assetBase` prop,
copied into `public/playcaptcha/toys/`. Its logo, however, is hardcoded in
the package's own bundle to `/playcaptcha.svg` at the site root — not
actually affected by `assetBase`, despite what the package's README implies
— so that one file was placed at `public/playcaptcha.svg` instead of
alongside the toys.

## "Teams" renamed to "Squads" even though it now matches Master Data → Squads

The top-level nav item and its page (`/teams`, PRD §14.7) were renamed from
"Teams" to "Squads" on request. This makes it read identically to Master
Data → Squads, a different (CRUD) page — the app had so far avoided this by
using a different word for a read-only operational overview than for its
Master Data counterpart (People vs. Designers is the existing example).

Kept "Squads" anyway rather than a distinguishing label like "Squad
Overview": the page was already squad-specific throughout its own code
(`visibleSquads`, `getSquadLead`, `TeamsFilterBar` etc. — "Teams" was only
ever the user-facing label, "Teams" is not a concept the domain model has),
so matching that internal terminology in the copy was judged more valuable
than avoiding the nav-list duplicate. The two "Squads" entries sit in
different parts of the sidebar (top-level vs. inside Master Data), which
should keep them distinguishable by context.

Copy-only change: the route (`/teams`) and internal identifiers
(`TeamsPage`, `TeamsFilterBar`, `DEFAULT_TEAMS_FILTERS`) were left alone —
renaming those would touch far more files for no user-visible benefit.

## Shared Squad Membership is a stored table, deliberately independent of Project Assignment

Squad View (`docs/PRD.MD` §13.1, §14.7) asked for a Home/Primary squad plus
"Shared" squads a designer can be dragged into, with a "Shared" badge shown
everywhere except their Primary Squad. The existing domain model has no such
concept: `Designer.home_squad_id` is one required field, and the only other
notion of "which squad a designer touches" is Cross-squad Logic (§32) —
`designer.home_squad_id !== project.owner_squad_id`, entirely derived from
Project Assignment, never stored.

Two ways to get "Shared" were considered:

1. **Derive it from Project Assignment** — a designer reads as "shared" into
   a squad if they support a project that squad owns. Zero schema change,
   and consistent with how every other "cross-squad" fact in this app already
   works (§32).
2. **A new stored membership table**, independent of Project Assignment.

**Decision: option 2**, on explicit instruction — squad membership and
project assignment are to stay separate concepts, and sharing must work even
when the target squad has no project for the designer to be assigned to
(dragging a designer onto an empty squad and choosing "Share" has nothing to
attach a Project Assignment row to). Option 1 could not satisfy that case at
all, since it has no meaning without a project in common.

**Shape of the table** (`squad_designer_memberships`: `id, designer_id,
squad_id`, unique per pair): it only ever holds *additional* memberships.
`Designer.home_squad_id` remains the single source of truth for a designer's
Primary Squad — unchanged, still `not null`, still read everywhere it already
was (People, Designers, Cross-squad Logic). Nothing about Project Assignment
or §32's derived Cross-squad badge changes; the two "cross-squad" concepts
(derived project fact vs. explicit squad membership) now coexist on purpose
and are cross-referenced in the PRD (§13.1, §32) so they're never conflated.

`squadDesignerMembershipRepository.addMembership`/`removeMembership` enforce
the invariants close to the data rather than in every call site: adding a
membership that already exists, or that names the designer's own current
Primary Squad, is a no-op; the same (designer, squad) pair can't be recorded
twice (`unique (designer_id, squad_id)` at the database level too). "Move"
(`DesignerAllocationDialog`) writes `home_squad_id` and then removes any now-
redundant Shared row for that same squad — a designer who becomes Primary
somewhere was, by definition, not usefully also "Shared" there.

## Squad View adds real mutation UI to Teams — Move/Share confirmation, drag never mutates silently

This extends the reversal already recorded above ("Teams' 'No designers · Add'
gains an inline multi-select dialog") one step further: Squad View's kanban
lets a designer be dragged between squad columns, which is Teams' first
drag-and-drop interaction and its first Share action. Explicit current-task
instruction, same as before, outranks the older "People and Teams are
read-only directories" rule per `CLAUDE.md`'s stated precedence order.

**Drag never writes on its own.** `SquadBoard`'s `onDragEnd` only ever opens
`DesignerAllocationDialog` — a drop is a *request*, never a write. The one
exception is a same-column drop or a drop on a squad the designer already
belongs to (Primary or Shared), which is silently a no-op: there is nothing
to confirm when nothing would change. This mirrors the existing "Manage
members → Move" dialog's shape (`manage-squad-members-dialog.tsx`) rather
than inventing a new confirmation pattern: pick a destination, see the
consequence stated in words, then commit — Squad View's version front-loads
the destination via drag instead of a `<Select>`, and adds the Move-vs-Share
branch that dialog never needed (Master Data has no "Share" concept).

**Squad Lead protection carries over unchanged.** Moving a designer who leads
their old squad clears that squad's `lead_designer_id` with the same warning
copy `manage-squad-members-dialog.tsx` and `add-squad-members-dialog.tsx`
already use — one more place the existing guard had to be repeated, since
Squad has no trigger-level enforcement of "a lead must still be a member."

**Talent Pool (spec's "Guest" column for designers with no Primary Squad) was
deliberately dropped for this iteration.** `designers.home_squad_id` is
`not null` throughout the schema, the Designer create/edit form, and every
selector that reads it (People, Cross-squad Logic, Overview) — giving a
designer no Primary Squad is a nullability change with a much wider blast
radius than Squad View itself, on explicit instruction to skip it for now.
Squad View therefore only ever renders real squads; every designer always has
exactly one Primary Squad column they appear in.

## Global filter toolbar simplification (2026-09-13): Projects drops its duplicate quick filters, Squads gains a Filters panel, and the view switcher joins the Search/Filters row everywhere

**Decision:** Two changes, both driven by an explicit task brief asking for one consistent rule: *"If a page already has a comprehensive Filters button/panel, do not expose the same filters individually in the main toolbar."*

1. **Projects** (`projects-filter-bar.tsx`) no longer renders Needs Allocation, Status, Priority, or Department as standalone toolbar controls alongside its existing Advanced Filters popover — they were duplicated in both places (the popover already mirrored them for responsive fallback). All four now live only inside the one "Filters" panel: Needs Allocation/Status/Priority/Department apply live, Epic/Owner Squad/Design Lead/Timeline/Health/Show Archived stay staged behind Apply/Reset, unchanged. The Filters button's badge now counts every active dimension (`Filters · 3`), not just the staged ones, since it's the toolbar's only remaining indicator of active state.
2. **Squads** (`teams-filter-bar.tsx`) gained its first "Filters" popover, consolidating Staffing/Lead/Status — previously three standalone `FilterSelect` triggers — behind one button, live-applying (no staged Apply, matching Timeline's collapsed popover rather than Projects' staged one, since three simple selects have nothing worth batching). Squads also gained its first removable-chip row: with the individual controls no longer directly visible, the chips are now the only way to see what's active without opening the panel.

Both pages' Board/List/Table (Projects) and Table/Squad (Squads) view switchers now render in the same toolbar row as Search/Filters — passed to the shared `<FilterBar>` as a new `leading` prop, pinned to the opposite side via `justify-between` — instead of on their own row above it. `FilterBar` only applies `justify-between` when `leading` is passed, so People/Timeline/Master Data (no view switcher) are visually unchanged.

**Why:** This reverses part of an earlier decision ("Filter bars standardized across Projects/People/Teams/Timeline," above) that deliberately gave Squads/People *no* Filters popover, reasoning that three or four dimensions are "nothing to disclose" and a popover would be progressive disclosure for its own sake. The explicit task brief this time targets a different problem than that entry weighed: not whether a small filter set benefits from hiding, but whether a toolbar's presentation is consistent and free of redundant entry points once a panel exists — and, for Squads specifically, that the page adopt the same panel pattern Projects and Timeline already use rather than staying the odd one out. Per `CLAUDE.md`'s instruction precedence, an explicit current-task instruction outranks a prior recorded decision; People and the five Master Data screens were deliberately left untouched, since none of them exhibit the redundant-toolbar-vs-panel problem this task targets (no page there has both a panel and duplicated standalone controls, and none has a view switcher to align into the row).

## Verified badge (2026-09-13): computed from `profiles.designer_id`/`.stakeholder_id`, not a stored field

**Ask:** distinguish, on Master Data → Designers and → Stakeholders, a row that
belongs to a real person who was invited, signed in, and filled out their
profile from a row an admin created directly in Master Data with no account
behind it.

**Decision:** no new column, no new table. The domain model already carries
exactly this fact: `Profile.designer_id`/`Profile.stakeholder_id` (§6.1) is a
nullable, unique FK that only gets set once an invited account links itself to
a Designer/Stakeholder row — and Onboarding requires that link before a
designer-role account can finish (see "Onboarding requires a linked Designer
record," above). So "verified" is just "some profile's designer_id/
stakeholder_id equals this row's id" — a plain existence check
(`isDesignerVerified`/`isStakeholderVerified`, `src/lib/selectors/
designerSelectors.ts` / `stakeholderSelectors.ts`), computed at read time from
data already in the in-memory cache, same as `getDesignerUsage`/
`getStakeholderUsage` right above them. Storing a redundant `verified` boolean
on Designer/Stakeholder was rejected — it would just be a cache of a fact the
unique FK already states, with its own staleness problem the FK doesn't have.

**Badge, not a column.** `VerifiedBadge` (`src/components/shared/
verified-badge.tsx`) is a small `BadgeCheck` icon rendered inline next to the
Name cell, with a Tooltip spelling out what it means on hover/focus — not a
sixth/seventh table column, which would mostly render empty (most rows in a
freshly-seeded roster have no linked account yet, and that's the normal
state, not a warning). It reuses `--status-success` — the same token
`EntityStatusBadge`'s Active state already uses — rather than introducing a
new color for what is, semantically, the same kind of affirmative fact.

**Both pages now read `profiles` reactively, not just their own table.**
Designers already used `useRepositoryList` per repository, so it gained one
more subscription (`useRepositoryList(profileRepository)`, unused return
value — its only job is to force a re-render when `profiles` changes so the
badge updates live if someone completes onboarding while the page is open).
Stakeholders still reads its tables by hand (`useEffect` + `subscribe`, one
`read()` covering `stakeholders`/`departments`); it gained a third
`setProfiles` in that same `read()` rather than switching the whole page to
`useRepositoryList`, which would have been an unrelated refactor. Its
verified set is precomputed once as `verifiedStakeholderIds` (a `Set`, same
shape as the existing `departmentNameById` map on that page) instead of
calling the selector per row inside the table's `useMemo` — calling the
imported selector directly there compiles fine but reads from
`profileRepository.getAll()` without the memo's dependency array actually
referencing `profiles`, which `react-hooks/exhaustive-deps` correctly flags
as a dependency the memo doesn't see.
