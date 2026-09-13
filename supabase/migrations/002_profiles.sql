-- Account profile + per-user preferences (docs/PRD.MD §6.1, §14.10).
--
-- Until now an authenticated user was an anonymous access token: the app knew
-- their email and nothing else. A `designers` row is the app's person record
-- (squads, project assignments and squad leadership all point at it), but it
-- has no idea which login — if any — belongs to it.
--
-- This adds ONE table. It does not add a second people model:
--
--   auth.users  ──1:1──  public.profiles  ──0..1──  public.designers
--   (login)              (account: prefs,           (person: squad, job,
--                         system role, link)         assignments, lead roles)
--
-- profiles.designer_id is the whole point of the table existing rather than
-- the preferences living in localStorage: it is what makes the signed-in
-- account a selectable person in the Squad Lead and Supporting Designers
-- pickers, without inventing a duplicate "Me" row in `designers`.
--
-- Nullable on purpose (docs/PRD.MD §6.1): not every designer has a login, and
-- not every login is a designer. An unlinked profile is a complete, working
-- account — it just doesn't appear in people pickers.
--
-- Run after supabase/schema.sql. Safe to run against a populated database:
-- it creates one new table and touches no existing row.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.profiles (
  -- Not a generated id: the profile IS the auth user, so they share one id and
  -- a deleted account takes its profile with it.
  id                    uuid primary key references auth.users (id) on delete cascade,

  -- Identity, self-managed from Settings → Profile. Email is deliberately NOT
  -- mirrored here: auth.users owns it and is the only place it can be changed
  -- (docs/DECISIONS.md).
  full_name             text not null default '',
  avatar_url            text,
  job_title             text not null default '',

  -- Design discipline (what this person does) — distinct from system_role
  -- below (what this account may do). Never merged into one `role` column:
  -- one is a job, the other is authorization (docs/PRD.MD §6.1).
  design_role           text check (
                          design_role in (
                            'Product Designer', 'UX Designer', 'UI Designer',
                            'UX Researcher', 'Design Lead', 'Design Manager',
                            'Design Ops', 'Other'
                          )
                        ),

  -- Application authorization. Every signed-in user is still an Admin
  -- (docs/PRD.MD §6) — this column is where Editor/Viewer land when they
  -- arrive, which is why it exists now rather than later. Users cannot change
  -- their own: the column-level GRANT at the bottom of this file is what
  -- enforces that, not UI code.
  system_role           text not null default 'Admin' check (
                          system_role in ('Admin', 'Member', 'Viewer')
                        ),

  -- The person record this account is. `unique` so two accounts can't claim
  -- the same designer; `on delete set null` so force-deleting a designer
  -- (PRD §25) unlinks the account instead of deleting it.
  designer_id           uuid unique references public.designers (id) on delete set null,

  -- Preferences (docs/PRD.MD §14.10). Values are stable lowercase codes, never
  -- the labels shown in the UI.
  --
  -- English is the only runtime language. Bahasa Indonesia is shown in the
  -- picker as Coming Soon and is not selectable, so the constraint says so
  -- rather than accepting a value nothing can render.
  language              text not null default 'en' check (language in ('en')),
  -- No CHECK: the offered list lives in src/lib/domain/enums.ts and is meant to
  -- grow. An IANA zone name the app doesn't list yet is still a valid zone.
  timezone              text not null default 'Asia/Jakarta',
  week_starts_on        text not null default 'monday' check (
                          week_starts_on in ('monday', 'sunday')
                        ),

  default_landing_page  text not null default 'overview' check (
                          default_landing_page in ('overview', 'projects', 'timeline')
                        ),
  -- Four scales, matching the Timeline's own segmented control — `year` is the
  -- portfolio view and has to be expressible here or the preference couldn't
  -- describe the view the product ships with (docs/DECISIONS.md).
  default_timeline_view text not null default 'month' check (
                          default_timeline_view in ('week', 'month', 'quarter', 'year')
                        ),

  theme                 text not null default 'light' check (
                          theme in ('light', 'dark', 'system')
                        ),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
--
-- Set by the database, not the client: `updated_at` is not in the column-level
-- UPDATE grant below, so the app could not write it even if it tried.

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

-- ---------------------------------------------------------------------------
-- Provisioning
-- ---------------------------------------------------------------------------
--
-- A profile must exist before Settings can load, so it is created with the
-- account rather than on first visit. `security definer` because the trigger
-- fires inside Supabase's auth schema, where the invoking role cannot insert
-- into public.profiles.
--
-- full_name is seeded from the invite's metadata when there is any, and
-- otherwise from the email local part ("dimas.aditya@..." -> "Dimas Aditya"),
-- which is a better first impression than an empty name field. The user owns
-- it from then on.

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

-- Everyone who already has an account. The trigger above only covers accounts
-- created from here on.
insert into public.profiles (id, full_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    initcap(replace(split_part(coalesce(u.email, ''), '@', 1), '.', ' ')),
    ''
  )
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
--
-- Unlike the nine planning tables, this one is NOT "all authenticated users can
-- do anything". Reads stay open — the app needs to know which designers are
-- already claimed by an account, and this is a single-team internal tool — but
-- a user may only write their own row.

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

-- No delete policy on purpose: a profile is removed by deleting its auth user.

-- RLS decides WHICH ROWS a user may update; it cannot decide which COLUMNS.
-- system_role is authorization — a user who could write it could make
-- themselves Admin from the browser console, and no amount of UI would stop
-- them. Column-level privileges are the mechanism that actually can, so the
-- blanket UPDATE grant is withdrawn and only the self-service columns are
-- given back. `id`, `system_role`, `created_at` and `updated_at` are absent
-- from this list deliberately.
revoke update on public.profiles from authenticated;
grant update (
  full_name, avatar_url, job_title, design_role, designer_id,
  language, timezone, week_starts_on,
  default_landing_page, default_timeline_view, theme
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
--
-- Same reason as every other table: the app holds profiles in its in-memory
-- cache (src/lib/store/dataStore.ts) and refetches on change, so a preference
-- saved in one tab takes effect in another.

alter publication supabase_realtime add table public.profiles;
