# CLAUDE.md — Design Portfolio Planner

Project: **Design Portfolio Planner** (internal web app for mapping projects, timelines, design team structure, squads, designers, project ownership, business stakeholders, and cross-squad designer assignments).

Status: MVP built. All PRD phases (scaffold/domain/repositories/selectors/shell, Master Data CRUD, Projects, Timeline, Overview, People, Teams, search/filter/edge cases, UI/UX polish) are implemented and validated; see `docs/DECISIONS.md` for architecture decisions made along the way.

## Rules

1. `/docs/PRD.MD` is the current source of truth for product behavior and scope.
2. Read this file and relevant documentation before major implementation work.
3. Product requirement changes must update `/docs/PRD.MD`.
4. Meaningful requirement changes should also be recorded in `/docs/CHANGELOG.md`.
5. Important product or architecture decisions should be recorded in `/docs/DECISIONS.md`.
6. Minor UI polish does not need to update the PRD.
7. Inspect existing code before creating new architecture or components.
8. Prefer existing reusable components over creating duplicates.
9. Do not expand product scope unless explicitly instructed.
10. Do not start application implementation until explicitly instructed to do so.
11. Project-level Claude skills live in `.claude/skills/` and should be respected once installed.
12. If installed skills contain instructions relevant to a task, read and follow them before implementing that task.

## Installed Skill Policy

Installed, project-local (`.claude/skills/`):

- **Anti-slop** — `antislop` (core) + `antislop-ui`, `antislop-code`, `antislop-copywriting`, `antislop-layoutmobile`, `antislop-human`. UI/copy/code quality guardrail against generic "AI slop" (fake metrics, generic gradients, decorative filler, accessibility regressions). It does **not** define this product's visual direction — that stays enterprise / calm / minimal / professional / light-mode-first per the PRD, not whatever default identity antislop would otherwise invent. Use while building user-facing screens and after completing a major UI screen.
- **Ponytail** — `ponytail` (lite/full/ultra) + `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`. YAGNI/anti-over-engineering guardrail. Default to **lite** during normal feature implementation; use `ponytail-review`/`ponytail-audit` after a feature or milestone to find unnecessary complexity. Must never remove architecture the PRD explicitly requires (domain models, shared source of truth, service/repository layer, reusable components, relational data structure, role-ready foundations). Do not use `ultra` by default.
- **Impeccable** — `impeccable` (installed via the official `npx impeccable install` flow; ships `.claude/skills/impeccable/`, four `impeccable-*` agents in `.claude/agents/`, and a `PostToolUse`/`Stop` design-detector hook in `.claude/settings.local.json`). Frontend design-quality skill: 23 `/impeccable <command>` subcommands (`polish`, `audit`, `critique`, `typeset`, `colorize`, `animate`, etc.) plus 61 deterministic anti-pattern detector rules (overused fonts, gray-on-color text, nested cards, un-tinted black/gray, dated easing). Like Anti-slop, it does **not** set this product's visual direction — enterprise / calm / minimal / professional / light-mode-first per the PRD wins over any of its default aesthetic suggestions. Its detector hook runs automatically after UI edits and again on Stop; treat its findings as advisory quality signals, not product-scope changes. Overlaps with Anti-slop on anti-pattern detection — prefer Impeccable's deterministic detector for objective checks (fonts, contrast, layout) and Anti-slop for broader copy/code slop review; do not run both as a redundant pair on the same change.

Installed, global (user-level `~/.claude/skills/`, already available — not duplicated here): **Emil Kowalski design-engineering skills** (`animate`, `apple-design`, `ask-sonner`, `emil-design-eng`, `animation-vocabulary`, `animate-expo`, `find-animation-opportunities`, `improve-animations`, `review-animations`, `write-swift`, `prototype`, `pick-ui-library`). Use selectively for interaction/motion/component quality (dialogs, popovers, hover/press feedback, UI library choice). This is an enterprise planning app — motion stays restrained and functional; do not add animation just because a skill exists, and prefer speed/clarity over decorative motion for core navigation, tables, and filters.

**Instruction precedence when sources conflict:**

1. Explicit instruction from the user in the current task
2. `docs/PRD.MD` — product behavior and scope
3. `docs/DECISIONS.md` — accepted product/architecture decisions
4. `CLAUDE.md` — repository working rules (this file)
5. Installed specialist skills (above)
6. General implementation preference

Skills are advisors and quality guardrails, not permission to change product scope. A skill must never override an explicit PRD requirement; if a skill's default recommendation conflicts with the PRD, the PRD wins and the skill's suggestion is skipped or adapted.

## Documentation model

```text
PRD.MD
= how the intended product currently works

CHANGELOG.md
= what meaningful product requirements changed

DECISIONS.md
= why important product or architecture decisions were made

CLAUDE.md
= how Claude should work inside this repository
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
