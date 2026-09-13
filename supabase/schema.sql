-- DesignOps — Postgres schema (docs/PRD.MD §34).
--
-- Maps 1:1 onto src/lib/domain/types.ts: same table names (snake_case plural),
-- same column names, same nullability. There is no mapping layer in the app —
-- rows come back from PostgREST already shaped like the domain interfaces.
--
-- Enums are text + CHECK rather than Postgres enum types: the TypeScript unions
-- in src/lib/domain/enums.ts stay the source of truth, and adding a value later
-- is an ALTER of one constraint instead of a type migration.
--
-- Run this once in the Supabase SQL Editor, then supabase/seed.sql.

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------

-- Squads and designers reference each other (a squad has a lead designer, a
-- designer has a home squad), so squads.lead_designer_id is added by ALTER
-- once both tables exist. Same pattern for departments/stakeholders below.
create table public.squads (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  lead_designer_id uuid,
  description      text not null default '',
  status           text not null check (status in ('Active', 'Inactive'))
);

create table public.designers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  job_title     text not null default '',
  seniority     text not null check (seniority in ('Junior', 'Mid', 'Senior')),
  -- restrict (the default): a squad still housing designers can't be deleted.
  -- The app already refuses this via getSquadUsage; this is the backstop.
  home_squad_id uuid not null references public.squads (id),
  -- Initials or an image URL — no upload flow, just a display value (PRD §8.1).
  avatar        text not null default '',
  status        text not null check (status in ('Active', 'Inactive'))
);

alter table public.squads
  add constraint squads_lead_designer_id_fkey
  foreign key (lead_designer_id) references public.designers (id)
  on delete set null;

-- Shared (non-home) squad membership — designers.home_squad_id remains each
-- designer's one Primary Squad; this table only ever holds *additional*
-- memberships, written by the Teams → Squad View kanban (docs/PRD.MD §13.1).
-- Deliberately independent of project_assignments: a designer can be shared
-- into a squad's roster with no project behind it, and a cross-squad project
-- assignment does not, by itself, create a row here (docs/DECISIONS.md).
create table public.squad_designer_memberships (
  id          uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designers (id) on delete cascade,
  squad_id    uuid not null references public.squads (id) on delete cascade,
  constraint squad_designer_memberships_unique unique (designer_id, squad_id)
);

create index squad_designer_memberships_designer_id_idx on public.squad_designer_memberships (designer_id);
create index squad_designer_memberships_squad_id_idx on public.squad_designer_memberships (squad_id);

create table public.departments (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text not null default '',
  department_head_id uuid,
  status             text not null check (status in ('Active', 'Inactive'))
);

create table public.stakeholders (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  title             text not null default '',
  department_id     uuid not null references public.departments (id),
  stakeholder_type  text not null check (
                      stakeholder_type in ('Department Head', 'Product Owner', 'Project Admin / PIC')
                    ),
  status            text not null check (status in ('Active', 'Inactive'))
);

-- Nullable: a department exists before a head is assigned, and a Stakeholder
-- row needs a department_id to be created against in the first place (PRD §8.3).
alter table public.departments
  add constraint departments_department_head_id_fkey
  foreign key (department_head_id) references public.stakeholders (id)
  on delete set null;

create table public.epics (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  department_id uuid not null references public.departments (id),
  description   text not null default '',
  status        text not null check (status in ('Active', 'Inactive'))
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,

  epic_id            uuid not null references public.epics (id),
  department_id      uuid not null references public.departments (id),

  -- Deliberately NOT a foreign key. This is a point-in-time snapshot of the
  -- department's head when the project was created or last re-departmented; it
  -- must not follow later changes to that department (docs/DECISIONS.md).
  -- Force-deleting that stakeholder does clear it, in application code — an id
  -- pointing at a row that no longer exists is a dangling pointer, not history.
  department_head_id uuid,

  -- Stakeholder ids, kept as arrays rather than join tables: they are always
  -- written whole from the project form and only ever read via `includes`
  -- (stakeholderSelectors.getStakeholderUsage). Referential integrity for these
  -- two columns is therefore the app's job, not the database's
  -- (docs/DECISIONS.md).
  product_owner_ids  uuid[] not null default '{}',
  project_admin_ids  uuid[] not null default '{}',

  owner_squad_id     uuid not null references public.squads (id),

  priority            text not null check (priority in ('P1', 'P2', 'P3')),
  status              text not null check (
                        status in ('Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled')
                      ),
  health              text not null check (health in ('On Track', 'At Risk', 'Blocked')),
  timeline_confidence text not null check (timeline_confidence in ('Committed', 'Tentative')),
  -- Independent of status: hides a project from Overview/Timeline without
  -- changing its lifecycle or deleting it (docs/DECISIONS.md).
  is_archived         boolean not null default false,

  completed_at       date,

  -- Both ends INCLUSIVE — the app's convention throughout
  -- (src/lib/domain/dateUtils.ts). The month span they imply is always derived,
  -- never stored twice.
  start_date         date not null,
  end_date           date not null,
  constraint projects_dates_ordered check (end_date >= start_date),

  description        text not null default '',

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()

  -- No project_design_lead_id column on purpose: the lead is always the
  -- project_assignments row with project_role = 'Lead' (docs/DECISIONS.md).
);

create table public.project_assignments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  -- Cascades, unlike the squad/department/epic foreign keys: a designer can be
  -- force-deleted out of their projects (PRD §25), and the app's optimistic
  -- writes arrive unordered, so the database has to own the cleanup.
  designer_id  uuid not null references public.designers (id) on delete cascade,
  project_role text not null check (project_role in ('Lead', 'Support')),
  constraint project_assignments_unique_designer unique (project_id, designer_id)
);

-- At most one Lead per project. Until now this rule lived only in UI code; the
-- UI still validates first so the error message stays friendly, and this is the
-- backstop that makes the rule actually true of the data.
create unique index project_assignments_one_lead
  on public.project_assignments (project_id)
  where project_role = 'Lead';

create table public.project_monthly_targets (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- "YYYY-MM" rather than a date: the app reasons in months here, and storing a
  -- day would invent precision the domain doesn't have.
  month      text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  phase      text not null check (
               phase in ('Discovery', 'Research', 'Exploration', 'Design',
                         'Testing', 'Handover', 'BAU', 'Other')
             ),
  -- Free text, intentionally not a task list (PRD §8.8).
  target     text not null default '',
  constraint project_monthly_targets_unique_month unique (project_id, month)
);

create table public.project_weekly_focus (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  -- Always a Monday (src/lib/domain/weekUtils.ts). Zero or many rows per week —
  -- no uniqueness constraint here, unlike monthly targets.
  week_start_date date not null check (extract(isodow from week_start_date) = 1),
  title           text not null,
  description     text
  -- No designer_id on purpose: who works on a project is always derived from
  -- project_assignments, never duplicated here (PRD §8.9).
);

-- Every list view filters or joins on these.
create index project_assignments_project_id_idx on public.project_assignments (project_id);
create index project_assignments_designer_id_idx on public.project_assignments (designer_id);
create index project_monthly_targets_project_id_idx on public.project_monthly_targets (project_id);
create index project_weekly_focus_project_id_idx on public.project_weekly_focus (project_id);
create index designers_home_squad_id_idx on public.designers (home_squad_id);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
--
-- One row per auth user: who they are, what they may do, and how they like the
-- app set up (PRD §6.1, §14.10). Full rationale in
-- supabase/migrations/002_profiles.sql — this is the same DDL, kept here so a
-- fresh install from this file alone is complete.
--
--                     ┌─0..1── designers   (person: squad, assignments, leadership)
--   auth.users ──1:1── profiles
--                     └─0..1── stakeholders (person: department head)
--   (login)            (account)
--
-- designer_id/stakeholder_id are nullable in both directions: not every
-- designer or stakeholder has a login, and not every login is either. The two
-- are mutually exclusive in practice, driven by design_role — 'Department
-- Head' links to a stakeholder, every other non-null value links to a
-- designer (docs/DECISIONS.md).

create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,

  -- Email is NOT mirrored here: auth.users owns it (docs/DECISIONS.md).
  full_name             text not null default '',
  avatar_url            text,

  -- Design discipline, not authorization. Kept separate from system_role
  -- below on purpose (PRD §6.1).
  design_role           text check (
                          design_role in (
                            'Product Designer', 'UX Designer', 'UI Designer',
                            'UX Researcher', 'Design Lead', 'Design Manager',
                            'Design Ops', 'Department Head', 'Other'
                          )
                        ),
  -- Everyone is still Admin (PRD §6); Editor/Viewer land here when they
  -- arrive. Not self-writable — see the column-level GRANT below.
  system_role           text not null default 'Admin' check (
                          system_role in ('Admin', 'Member', 'Viewer')
                        ),

  -- This account's own department (PRD §6.1). Replaces the old free-text
  -- job_title, which nothing reads or writes anymore. `set null` rather than
  -- restrict: a Department can still be retired/deleted freely even though a
  -- profile points at it — this is a personal detail, not planning data a
  -- delete should be blocked on.
  department_id         uuid references public.departments (id) on delete set null,

  -- The person this account is, in the app's own people tables. At most one
  -- of these is non-null at a time (design_role decides which).
  designer_id           uuid unique references public.designers (id) on delete set null,
  stakeholder_id        uuid unique references public.stakeholders (id) on delete set null,

  language              text not null default 'en' check (language in ('en')),
  -- No CHECK: the offered list (src/lib/domain/enums.ts) is meant to grow.
  timezone              text not null default 'Asia/Jakarta',
  week_starts_on        text not null default 'monday' check (
                          week_starts_on in ('monday', 'sunday')
                        ),
  default_landing_page  text not null default 'overview' check (
                          default_landing_page in ('overview', 'projects', 'timeline')
                        ),
  default_timeline_view text not null default 'month' check (
                          default_timeline_view in ('week', 'month', 'quarter', 'year')
                        ),
  theme                 text not null default 'light' check (
                          theme in ('light', 'dark', 'system')
                        ),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A profile exists from the moment the account does, so Settings never has to
-- cope with a missing row. `security definer` because this fires in the auth
-- schema, where the invoking role cannot write public.profiles.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      initcap(replace(split_part(coalesce(new.email, ''), '@', 1), '.', ' ')),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
--
-- Every authenticated user is an Admin (PRD §6: one application role). RLS is
-- the real access boundary for this app — the client talks to PostgREST
-- directly with the anon key, so these policies, not any redirect, are what
-- keeps the data private.
--
-- Public sign-up MUST be disabled in the Supabase dashboard (Authentication →
-- Sign In / Providers → "Allow new users to sign up" off) and users invited
-- manually. Without that, anyone could create an account and satisfy
-- `to authenticated`. That switch is what replaces an allowlist table here.
--
-- Editor/Viewer roles are future scope (PRD §39); when they arrive they become
-- per-command policies here rather than a change in the app.

do $$
declare
  t text;
begin
  foreach t in array array[
    'squads', 'designers', 'departments', 'stakeholders', 'epics',
    'projects', 'project_assignments', 'project_monthly_targets',
    'project_weekly_focus', 'squad_designer_memberships'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- profiles is the exception to the rule above: reads stay open (the app needs
-- to know which designers are already claimed by an account), but a user may
-- only write their own row.
alter table public.profiles enable row level security;

create policy profiles_select_authenticated
  on public.profiles for select to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- RLS decides which ROWS a user may update, never which COLUMNS. system_role
-- is authorization: a user who could write it could make themselves Admin from
-- the browser console. Column privileges are what actually prevent that, so the
-- blanket UPDATE grant is withdrawn and only the self-service columns given
-- back. id, system_role, created_at and updated_at are absent deliberately.
revoke update on public.profiles from authenticated;
grant update (
  full_name, avatar_url, design_role, department_id, designer_id, stakeholder_id,
  language, timezone, week_starts_on,
  default_landing_page, default_timeline_view, theme
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
--
-- The app holds every table in an in-memory cache and refetches a table when it
-- changes, so a second person's edit shows up without a reload
-- (src/lib/store/dataStore.ts). That requires these tables in the realtime
-- publication.

alter publication supabase_realtime add table public.squads;
alter publication supabase_realtime add table public.designers;
alter publication supabase_realtime add table public.departments;
alter publication supabase_realtime add table public.stakeholders;
alter publication supabase_realtime add table public.epics;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_assignments;
alter publication supabase_realtime add table public.project_monthly_targets;
alter publication supabase_realtime add table public.project_weekly_focus;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.squad_designer_memberships;
