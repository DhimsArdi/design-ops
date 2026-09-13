-- Shared (non-home) squad membership — Teams → Squad View (docs/PRD.MD
-- §13.1, docs/DECISIONS.md).
--
-- Before this, a Designer belonged to exactly one Squad (home_squad_id) and
-- "cross-squad" was purely a project-assignment fact, recomputed at read time
-- (isCrossSquadAssignment). That is unchanged: home_squad_id is still each
-- designer's one Primary Squad, and project-based cross-squad support still
-- works exactly as before.
--
-- This adds ONE new, purely additive concept alongside it: a designer can now
-- also be explicitly shared into another squad's roster in Squad View, with
-- no project behind it. That "shared" state is one row here, never a second
-- home_squad_id and never derived from project_assignments (the two stay
-- deliberately independent, per the explicit task decision this migration
-- implements).
--
-- Run this once in the Supabase SQL Editor against an existing installation.
-- A fresh install gets this shape directly from supabase/schema.sql.

create table public.squad_designer_memberships (
  id          uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designers (id) on delete cascade,
  squad_id    uuid not null references public.squads (id) on delete cascade,
  constraint squad_designer_memberships_unique unique (designer_id, squad_id)
);

create index squad_designer_memberships_designer_id_idx on public.squad_designer_memberships (designer_id);
create index squad_designer_memberships_squad_id_idx on public.squad_designer_memberships (squad_id);

-- Same "every authenticated user is Admin" policy as every other planning
-- table (supabase/schema.sql's RLS section).
alter table public.squad_designer_memberships enable row level security;

create policy squad_designer_memberships_authenticated_all
  on public.squad_designer_memberships for all to authenticated
  using (true) with check (true);

-- Same reason as every other table: the app holds this in its in-memory cache
-- (src/lib/store/dataStore.ts) and refetches on change.
alter publication supabase_realtime add table public.squad_designer_memberships;
