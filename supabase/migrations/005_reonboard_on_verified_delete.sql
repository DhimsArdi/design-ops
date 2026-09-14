-- Force re-Onboarding when the account behind a "Verified" row gets
-- force-deleted (docs/PRD.MD §15, §19 "Verified" badge; docs/DECISIONS.md
-- "`Delete anyway` exists for Designer and Stakeholder only").
--
-- Run this once in the Supabase SQL Editor against an existing installation.
-- A fresh install gets this shape directly from supabase/schema.sql.
--
-- `Delete anyway` already detaches every OTHER reference a Designer/
-- Stakeholder row carried (Project Assignments, Squad Lead, department_head_id
-- snapshots, docs/DECISIONS.md), and `profiles.designer_id` /
-- `.stakeholder_id` being `on delete set null` (002_profiles.sql,
-- 003_department_head_profiles.sql) already unclaims the account that had
-- verified into it. What that FK does NOT do is clear `profiles.design_role` —
-- so the account keeps looking like it already finished Onboarding
-- (`needsOnboarding`, src/components/auth/onboarding-view.tsx, purely
-- `!profile.design_role`) even though the record it verified into is gone.
--
-- These triggers close that gap: deleting a Designer/Stakeholder row that is
-- still claimed by a profile also clears that profile's design_role, which is
-- the one and only signal DataProvider's OnboardingGate checks. No new
-- "needs re-onboarding" flag, no route/middleware change, and nothing new on
-- the client — the existing realtime subscription on `profiles`
-- (002_profiles.sql, src/lib/store/dataStore.ts) refetches it into every open
-- session automatically, so an already-signed-in tab is dropped back into
-- Onboarding on its own, and a signed-out account meets it on next sign-in.
-- The Onboarding captcha step re-arms for the same reason: its
-- `captchaVerified` state is local to `OnboardingView`, which simply wasn't
-- mounted a moment ago.
--
-- Scoped to only fire on an actual row DELETE, matched by the OLD row's own
-- id — never on a profile voluntarily unlinking itself via Settings/
-- Onboarding (`useProfileIdentityForm`), which always clears its own
-- design_role in that same save, before the now-orphaned Designer/Stakeholder
-- row is separately removed.
--
-- `security definer`, same reason as `handle_new_user()` above: the row being
-- reset almost always belongs to a DIFFERENT account than the admin doing the
-- deleting, and `profiles_update_own`/the column-level GRANT only let the
-- `authenticated` role touch its own row. Without this, the UPDATE below
-- would run as that role, RLS would match zero rows for anyone else's
-- profile, and the reset would silently do nothing.

create function public.reonboard_profiles_on_designer_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set design_role = null
  where designer_id = old.id;
  return old;
end;
$$;

create trigger designers_reonboard_before_delete
  before delete on public.designers
  for each row execute function public.reonboard_profiles_on_designer_delete();

create function public.reonboard_profiles_on_stakeholder_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set design_role = null
  where stakeholder_id = old.id;
  return old;
end;
$$;

create trigger stakeholders_reonboard_before_delete
  before delete on public.stakeholders
  for each row execute function public.reonboard_profiles_on_stakeholder_delete();
