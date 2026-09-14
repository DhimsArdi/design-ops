-- Tells the account WHY it landed back on Onboarding (docs/PRD.MD §6.1, §25),
-- so it reads as "an admin removed your linked record" rather than looking
-- like a bug or an unexplained reset.
--
-- `needsOnboarding` (`!profile.design_role`, src/components/auth/
-- onboarding-view.tsx) can't tell a brand-new account from one that was just
-- force-reset by 005_reonboard_on_verified_delete.sql — both simply have no
-- design_role. This column is that missing distinction: a plain boolean,
-- because there is exactly one thing that sets it today, not a free-text
-- "reason" column speculatively built for causes that don't exist yet.
--
-- Set to true by the same two `before delete` triggers 005 added, alongside
-- the design_role reset they already do. Cleared automatically the moment
-- design_role is set again — by Onboarding's own save, same as any other
-- account finishing the gate — so it never needs the client to clear it
-- itself, and never lingers once the account is caught up.
--
-- Not user-writable: absent from the column-level GRANT below, same as
-- system_role. A user reading their own "why am I here" note is fine; a user
-- setting it themselves to fabricate that note is not.

alter table public.profiles
  add column force_reonboarded boolean not null default false;

create or replace function public.reonboard_profiles_on_designer_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set design_role = null, force_reonboarded = true
  where designer_id = old.id;
  return old;
end;
$$;

create or replace function public.reonboard_profiles_on_stakeholder_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set design_role = null, force_reonboarded = true
  where stakeholder_id = old.id;
  return old;
end;
$$;

-- Same-row modification of the row already being updated by its own account
-- (profiles_update_own already permits that) — unlike the two functions
-- above, this never touches a different account's row, so it needs no
-- elevated privilege, exactly like profiles_touch_updated_at below it.
create function public.clear_force_reonboarded()
returns trigger
language plpgsql
as $$
begin
  if new.design_role is not null then
    new.force_reonboarded = false;
  end if;
  return new;
end;
$$;

create trigger profiles_clear_force_reonboarded
  before update on public.profiles
  for each row execute function public.clear_force_reonboarded();
