-- Lets a designer be removed from their Home Squad without forcing an
-- immediate reassignment (Teams → Squad View, Master Data → Squads —
-- docs/PRD.MD §8.1, §13.1). They become "Unassigned" until someone gives
-- them a new Home Squad, instead of the old "must always belong to exactly
-- one squad" rule. The restrict-on-delete backstop (a squad still housing
-- designers can't be deleted) is unchanged.

alter table public.designers
  alter column home_squad_id drop not null;
