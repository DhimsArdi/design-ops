-- Force delete for Designer (docs/PRD.MD §25, docs/DECISIONS.md).
--
-- project_assignments.designer_id was RESTRICT: the database refused to delete
-- a designer who still had assignments, backing up the app's own usage guard.
-- Deleting a designer "anyway" now has to remove those rows, and the app's
-- writes are optimistic and unordered — the DELETE on designers can reach the
-- server before the DELETEs on its assignments and be rejected.
--
-- Cascading in the database removes the ordering problem entirely: one DELETE,
-- and Postgres clears the assignments. This is the same arrangement
-- project_assignments.project_id already has.
--
-- What this gives up: the database no longer refuses a designer delete that has
-- assignments. That guard now lives solely in getDesignerUsage + the delete
-- dialog — which is deliberate, since the whole point is a supported way past
-- it. Squad, Department and Epic keep their RESTRICT foreign keys.

alter table public.project_assignments
  drop constraint project_assignments_designer_id_fkey;

alter table public.project_assignments
  add constraint project_assignments_designer_id_fkey
  foreign key (designer_id) references public.designers (id)
  on delete cascade;
