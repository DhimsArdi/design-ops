-- Adds a "Department Head" path alongside the existing Designer path for a
-- signed-in account, and replaces free-text Job title with a Department pick
-- (docs/PRD.MD §6.1, docs/DECISIONS.md).
--
-- Before this, every design_role made an account a Designer (via
-- profiles.designer_id). Now one value doesn't: choosing "Department Head" in
-- Settings → Profile makes the account a Stakeholder instead (stakeholder_type
-- = 'Department Head'), so it shows up in Master Data → Stakeholders rather
-- than Master Data → Designers. The two links are mutually exclusive by
-- construction — the app only ever writes one of them at a time.
--
--                     ┌─0..1── designers   (person: squad, assignments, leadership)
--   auth.users ──1:1── profiles
--                     └─0..1── stakeholders (person: department head)
--   (login)            (account)
--
-- Run this once in the Supabase SQL Editor against an existing installation.
-- A fresh install gets this shape directly from supabase/schema.sql.
--
-- job_title is dropped, not merely stopped-using: Settings no longer collects
-- it (Department replaces it in the form), and schema.sql's own header promises
-- a 1:1 correspondence with src/lib/domain/types.ts — a column nothing reads or
-- writes would break that. Any previously saved value is lost; the only place
-- that ever wrote to it was Settings → Profile, and it was never surfaced
-- anywhere else in the app.

alter table public.profiles drop column if exists job_title;

alter table public.profiles
  add column department_id  uuid references public.departments (id) on delete set null,
  add column stakeholder_id uuid unique references public.stakeholders (id) on delete set null;

alter table public.profiles drop constraint if exists profiles_design_role_check;
alter table public.profiles add constraint profiles_design_role_check check (
  design_role in (
    'Product Designer', 'UX Designer', 'UI Designer', 'UX Researcher',
    'Design Lead', 'Design Manager', 'Design Ops', 'Department Head', 'Other'
  )
);

-- Additive: the existing grant (full_name, avatar_url, design_role,
-- designer_id, language, timezone, week_starts_on, default_landing_page,
-- default_timeline_view, theme) stands; this just adds the new self-service
-- columns and revokes nothing.
grant update (department_id, stakeholder_id) on public.profiles to authenticated;
