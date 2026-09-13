-- DesignOps — demo seed data (docs/PRD.MD §36).
--
-- Generated from src/lib/seed/seedData.ts, with its runtime-generated UUIDs
-- frozen into literals so the foreign keys line up. Run after supabase/schema.sql.
--
-- Insert order works around the two circular references in the schema: squads
-- and departments go in with their lead/head columns null, then get UPDATEd once
-- the rows they point at exist.

begin;

-- squads (lead_designer_id filled in after designers exist)
insert into public.squads (id, name, lead_designer_id, description, status) values
  ('5b8f6e11-ac31-48ca-a9fc-d11365ad3ef7', 'Squad A', null, 'Wholesale Banking design squad, owns Trade Finance work.', 'Active'),
  ('ed2f8596-d2f6-4d94-b855-7c2249bd4d62', 'Squad B', null, 'Merchant Business design squad.', 'Active'),
  ('fd651b5f-56f1-4d5f-97fb-06f629dde7c4', 'Squad C', null, 'Digital Channel and platform design squad.', 'Active');

-- designers
insert into public.designers (id, name, job_title, seniority, home_squad_id, avatar, status) values
  ('c78d62e4-eac0-4fef-98a3-9b49a3b5ab05', 'Dimas', 'Senior Product Designer', 'Senior', '5b8f6e11-ac31-48ca-a9fc-d11365ad3ef7', 'DM', 'Active'),
  ('02e6b372-a493-4525-a655-2a013a1f6024', 'Sarah', 'Junior Product Designer', 'Junior', '5b8f6e11-ac31-48ca-a9fc-d11365ad3ef7', 'SR', 'Active'),
  ('5bfa77f2-aa36-41db-a4ac-745ff71caae8', 'Malik', 'Junior Product Designer', 'Junior', '5b8f6e11-ac31-48ca-a9fc-d11365ad3ef7', 'MK', 'Active'),
  ('66c13633-439d-494a-8dc6-4610431eb2b2', 'Raka', 'Senior Product Designer', 'Senior', 'ed2f8596-d2f6-4d94-b855-7c2249bd4d62', 'RK', 'Active'),
  ('216ee93c-7f61-4ca1-98e7-61de61595efe', 'Nadia', 'Senior Product Designer', 'Senior', 'fd651b5f-56f1-4d5f-97fb-06f629dde7c4', 'ND', 'Active'),
  ('e8b96d78-b0d2-4223-9ffe-7b27dc22a3a7', 'Andi', 'Product Designer', 'Mid', 'ed2f8596-d2f6-4d94-b855-7c2249bd4d62', 'AN', 'Active');

-- squad leads
update public.squads set lead_designer_id = 'c78d62e4-eac0-4fef-98a3-9b49a3b5ab05' where id = '5b8f6e11-ac31-48ca-a9fc-d11365ad3ef7';
update public.squads set lead_designer_id = '66c13633-439d-494a-8dc6-4610431eb2b2' where id = 'ed2f8596-d2f6-4d94-b855-7c2249bd4d62';
update public.squads set lead_designer_id = '216ee93c-7f61-4ca1-98e7-61de61595efe' where id = 'fd651b5f-56f1-4d5f-97fb-06f629dde7c4';

-- departments (department_head_id filled in after stakeholders exist)
insert into public.departments (id, name, description, department_head_id, status) values
  ('21973777-109b-4014-8049-7eb9067ffb4a', 'Wholesale Banking', 'Corporate and institutional banking products.', null, 'Active'),
  ('d26f5d40-e19d-4ffd-a86a-a1ebe829ecc1', 'Merchant Business', 'Merchant acquiring and payments products.', null, 'Active'),
  ('ebc55f0d-d560-4460-ae9e-306521285c8f', 'Digital Channel', 'Retail digital banking channels.', null, 'Active'),
  ('0c13df20-895d-458e-a9d1-7ba3e99d7adf', 'Design Platform', 'Cross-department design system and shared platform work.', null, 'Active');

-- stakeholders
insert into public.stakeholders (id, name, title, department_id, stakeholder_type, status) values
  ('c4db8aaa-fb0b-4310-90c1-31e3efeae582', 'Budi Santoso', 'Head of Wholesale Banking', '21973777-109b-4014-8049-7eb9067ffb4a', 'Department Head', 'Active'),
  ('ae634b7c-1eff-4950-9b8c-1a2b4687eed3', 'Siti Rahayu', 'Head of Merchant Business', 'd26f5d40-e19d-4ffd-a86a-a1ebe829ecc1', 'Department Head', 'Active'),
  ('d35f6640-dc0f-4a27-941c-84b9a8cf3730', 'Agus Wibowo', 'Head of Digital Channel', 'ebc55f0d-d560-4460-ae9e-306521285c8f', 'Department Head', 'Active'),
  ('3ac1a83e-581a-41ef-b952-51f91f45d950', 'Rina Amelia', 'Product Owner, Trade Finance', '21973777-109b-4014-8049-7eb9067ffb4a', 'Product Owner', 'Active'),
  ('64326604-90d8-4f07-9331-f97e06940a9e', 'Fajar Nugroho', 'Product Owner, Merchant Business', 'd26f5d40-e19d-4ffd-a86a-a1ebe829ecc1', 'Product Owner', 'Active'),
  ('a0f38362-00e0-4fac-904e-2c2055399431', 'Wulan Sari', 'Product Owner, Digital Channel', 'ebc55f0d-d560-4460-ae9e-306521285c8f', 'Product Owner', 'Active'),
  ('b6249e82-1871-43e4-9ec2-1f0709c14fd8', 'Kevin Halim', 'Product Owner, Design Platform', '0c13df20-895d-458e-a9d1-7ba3e99d7adf', 'Product Owner', 'Active'),
  ('92390f28-4c55-4ad7-b1e5-322680aac103', 'Teguh Prasetyo', 'Project Admin, Wholesale Banking', '21973777-109b-4014-8049-7eb9067ffb4a', 'Project Admin / PIC', 'Active'),
  ('1c134441-1a0b-44ae-9fbd-54888f932efa', 'Dewi Lestari', 'Project Admin, Merchant Business', 'd26f5d40-e19d-4ffd-a86a-a1ebe829ecc1', 'Project Admin / PIC', 'Active'),
  ('2a691016-ccae-4576-8fbd-49d2e82d39c4', 'Hendra Kusuma', 'Project Admin, Digital Channel', 'ebc55f0d-d560-4460-ae9e-306521285c8f', 'Project Admin / PIC', 'Active');

-- department heads
update public.departments set department_head_id = 'c4db8aaa-fb0b-4310-90c1-31e3efeae582' where id = '21973777-109b-4014-8049-7eb9067ffb4a';
update public.departments set department_head_id = 'ae634b7c-1eff-4950-9b8c-1a2b4687eed3' where id = 'd26f5d40-e19d-4ffd-a86a-a1ebe829ecc1';
update public.departments set department_head_id = 'd35f6640-dc0f-4a27-941c-84b9a8cf3730' where id = 'ebc55f0d-d560-4460-ae9e-306521285c8f';

-- epics
insert into public.epics (id, name, department_id, description, status) values
  ('1fbf62c5-4a14-4c88-a15d-1cb1931138fe', 'Trade Finance', '21973777-109b-4014-8049-7eb9067ffb4a', 'Trade finance platform and workflows.', 'Active'),
  ('b6aa1b65-31a1-4a6e-a289-1d8eacbffe79', 'Merchant', 'd26f5d40-e19d-4ffd-a86a-a1ebe829ecc1', 'Merchant-facing products and onboarding.', 'Active'),
  ('7c25b457-4d43-48e2-b5b9-ea0bd40022a7', 'Digital Channel Enhancement', 'ebc55f0d-d560-4460-ae9e-306521285c8f', 'Ongoing improvements to retail digital channels.', 'Active'),
  ('058fb98d-5e91-411e-8afe-d1cbe56ec59c', 'Design System', '0c13df20-895d-458e-a9d1-7ba3e99d7adf', 'Shared component library and design standards.', 'Active');

-- projects
insert into public.projects (id, name, epic_id, department_id, department_head_id, product_owner_ids, project_admin_ids, owner_squad_id, priority, status, health, timeline_confidence, is_archived, completed_at, start_date, end_date, description, created_at, updated_at) values
  ('bb5499a4-fcbc-4181-bc27-01ce48f5241e', 'Trade Finance Platform Revamp', '1fbf62c5-4a14-4c88-a15d-1cb1931138fe', '21973777-109b-4014-8049-7eb9067ffb4a', 'c4db8aaa-fb0b-4310-90c1-31e3efeae582', array['3ac1a83e-581a-41ef-b952-51f91f45d950']::uuid[], array['92390f28-4c55-4ad7-b1e5-322680aac103']::uuid[], '5b8f6e11-ac31-48ca-a9fc-d11365ad3ef7', 'P1', 'In Progress', 'On Track', 'Committed', false, null, '2026-09-07', '2026-12-18', 'Revamp the trade finance workflow to reduce manual document handling for relationship managers.', '2026-08-01T02:00:00.000Z', '2026-09-10T07:30:00.000Z'),
  ('5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', 'Merchant Revamp', 'b6aa1b65-31a1-4a6e-a289-1d8eacbffe79', 'd26f5d40-e19d-4ffd-a86a-a1ebe829ecc1', 'ae634b7c-1eff-4950-9b8c-1a2b4687eed3', array['64326604-90d8-4f07-9331-f97e06940a9e']::uuid[], array['1c134441-1a0b-44ae-9fbd-54888f932efa']::uuid[], 'ed2f8596-d2f6-4d94-b855-7c2249bd4d62', 'P1', 'Planning', 'On Track', 'Committed', false, null, '2026-10-05', '2027-01-29', 'Redesign the merchant onboarding and settlement dashboard experience.', '2026-08-15T03:00:00.000Z', '2026-09-05T04:15:00.000Z'),
  ('47dbf713-6f07-42f9-9725-33a7045a0b2c', 'Design System Enhancement', '058fb98d-5e91-411e-8afe-d1cbe56ec59c', '0c13df20-895d-458e-a9d1-7ba3e99d7adf', null, array['b6249e82-1871-43e4-9ec2-1f0709c14fd8']::uuid[], '{}', '5b8f6e11-ac31-48ca-a9fc-d11365ad3ef7', 'P2', 'In Progress', 'On Track', 'Tentative', false, null, '2026-09-01', '2026-11-27', 'Extend the shared component library with new patterns requested by product squads.', '2026-07-20T01:00:00.000Z', '2026-08-25T06:00:00.000Z'),
  ('2684b922-0ee4-4045-97a3-0e819e168e29', 'Digital Channel Initiative', '7c25b457-4d43-48e2-b5b9-ea0bd40022a7', 'ebc55f0d-d560-4460-ae9e-306521285c8f', 'd35f6640-dc0f-4a27-941c-84b9a8cf3730', array['a0f38362-00e0-4fac-904e-2c2055399431']::uuid[], '{}', 'fd651b5f-56f1-4d5f-97fb-06f629dde7c4', 'P2', 'Planning', 'On Track', 'Tentative', false, null, '2026-11-02', '2027-02-26', 'Upcoming initiative to refresh key retail digital channel journeys.', '2026-08-25T05:00:00.000Z', '2026-08-25T05:00:00.000Z'),
  ('d08d6941-e6ee-410c-b7bc-6f6881838442', 'Design System Component Documentation', '058fb98d-5e91-411e-8afe-d1cbe56ec59c', '0c13df20-895d-458e-a9d1-7ba3e99d7adf', null, array['b6249e82-1871-43e4-9ec2-1f0709c14fd8']::uuid[], '{}', 'fd651b5f-56f1-4d5f-97fb-06f629dde7c4', 'P3', 'In Progress', 'At Risk', 'Tentative', false, null, '2026-08-10', '2026-10-30', 'Document usage guidelines for existing components; slipping due to competing priorities.', '2026-07-10T02:00:00.000Z', '2026-09-08T03:00:00.000Z'),
  ('970961bd-2801-4ad0-9949-a60e0c791c83', 'Digital Onboarding KYC Enhancement', '7c25b457-4d43-48e2-b5b9-ea0bd40022a7', 'ebc55f0d-d560-4460-ae9e-306521285c8f', 'd35f6640-dc0f-4a27-941c-84b9a8cf3730', array['a0f38362-00e0-4fac-904e-2c2055399431']::uuid[], array['2a691016-ccae-4576-8fbd-49d2e82d39c4']::uuid[], 'fd651b5f-56f1-4d5f-97fb-06f629dde7c4', 'P2', 'In Progress', 'Blocked', 'Committed', false, null, '2026-08-03', '2026-11-20', 'Improve the digital KYC onboarding flow; currently blocked on a pending compliance decision.', '2026-07-01T01:00:00.000Z', '2026-07-15T01:00:00.000Z');

-- project assignments (the 'Lead' row IS the project design lead)
insert into public.project_assignments (id, project_id, designer_id, project_role) values
  ('bbca9ab9-0fd4-4b92-a0e3-1ed8723595cf', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '5bfa77f2-aa36-41db-a4ac-745ff71caae8', 'Lead'),
  ('e5a4897a-c52d-4187-b39c-3832d7352e1a', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '02e6b372-a493-4525-a655-2a013a1f6024', 'Support'),
  ('d6a29e5d-59f7-410b-9e9e-b07649984a9d', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '66c13633-439d-494a-8dc6-4610431eb2b2', 'Support'),
  ('094b745c-0c4a-4b30-b49c-c7b15f2ac6dc', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '66c13633-439d-494a-8dc6-4610431eb2b2', 'Lead'),
  ('5391fc60-f33f-432e-b88e-19625f42ef3d', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '02e6b372-a493-4525-a655-2a013a1f6024', 'Support'),
  ('53515c94-e08d-4da9-8e2f-9b659e7654df', '47dbf713-6f07-42f9-9725-33a7045a0b2c', 'c78d62e4-eac0-4fef-98a3-9b49a3b5ab05', 'Lead'),
  ('48a79f64-b6fd-47d8-ac38-ec2a8afca26d', '47dbf713-6f07-42f9-9725-33a7045a0b2c', '5bfa77f2-aa36-41db-a4ac-745ff71caae8', 'Support'),
  ('80c0463f-9172-45fb-adba-c609ce0b3ca3', 'd08d6941-e6ee-410c-b7bc-6f6881838442', '216ee93c-7f61-4ca1-98e7-61de61595efe', 'Lead'),
  ('c23eaed2-75f8-4355-9e22-6e6eeb9ed10b', 'd08d6941-e6ee-410c-b7bc-6f6881838442', 'e8b96d78-b0d2-4223-9ffe-7b27dc22a3a7', 'Support'),
  ('c4016847-d814-4cc1-9967-b7359997773e', '970961bd-2801-4ad0-9949-a60e0c791c83', 'e8b96d78-b0d2-4223-9ffe-7b27dc22a3a7', 'Lead');

-- monthly targets
insert into public.project_monthly_targets (id, project_id, month, phase, target) values
  ('b7cc1d28-e121-4d55-9a61-19df2644e426', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-09', 'Research', 'Requirement alignment completed'),
  ('74a16a7b-dde8-4bdf-87a2-fcf64a8212dd', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-10', 'Exploration', 'UX direction approved'),
  ('89977e22-3a76-42cf-b31f-4fcf75114bb5', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-11', 'Design', 'Final UI ready'),
  ('7674e32e-b749-4623-be5a-dc9c70ffd704', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-12', 'Handover', 'Developer handoff complete'),
  ('22b387a0-0f1f-4bac-8c98-73187aebc008', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '2026-10', 'Discovery', 'Stakeholder requirements mapped'),
  ('19983df1-254d-429c-8e66-24275a7134d5', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '2026-11', 'Research', 'Merchant journey pain points identified'),
  ('c7f2ecb0-5d27-445a-b695-452edf09dd33', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '2026-12', 'Exploration', 'Concept directions reviewed'),
  ('999f2055-1567-4347-af6d-bae0aadce681', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '2027-01', 'Design', 'Final design ready for handover'),
  ('96041ef3-48ab-4a95-9416-31ac2b2e78df', '47dbf713-6f07-42f9-9725-33a7045a0b2c', '2026-09', 'Design', 'Updated component specs drafted'),
  ('52e0dd04-335a-4601-8a8d-d359d443fffe', '47dbf713-6f07-42f9-9725-33a7045a0b2c', '2026-10', 'Testing', 'Component QA against product surfaces'),
  ('20b7e57d-2ba9-4aaa-8b50-bf9585b5cbeb', '47dbf713-6f07-42f9-9725-33a7045a0b2c', '2026-11', 'Handover', 'Rollout guide published');

-- weekly focus
insert into public.project_weekly_focus (id, project_id, week_start_date, title, description) values
  ('05ebea76-94ee-49a0-b7df-ef7212030955', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-09-07', 'Requirement mapping', null),
  ('457f2d32-1ee7-4c23-a732-bf7a040d64cf', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-09-07', 'Benchmark existing flow', null),
  ('3c729c12-7519-4cd5-99ed-8b9e43fea173', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-09-14', 'LC Issuance flow exploration', null),
  ('5ca2bda4-a728-4805-bae8-30bd933d0993', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-09-14', 'Navigation exploration', null),
  ('d0850d75-83f0-4313-a724-045060f6b18a', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-09-28', 'Amendment UI exploration', null),
  ('fd159c0a-2422-4f83-ba2f-8db810aba9f9', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-09-28', 'Empty states', null),
  ('41dd61fc-94b2-42d9-abba-0a35034261f6', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-10-05', 'PO review', 'Walk through the amendment flow with the Wholesale Banking PO before sign-off.'),
  ('5cdc507c-4815-4f21-8b64-d1434f5a2edc', 'bb5499a4-fcbc-4181-bc27-01ce48f5241e', '2026-10-05', 'UX revision', null),
  ('d69ff579-1a2f-4f61-b90e-333c117c096a', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '2026-12-28', 'Year-end concept review prep', null),
  ('588eb73d-fb4c-4c66-a556-3153c2a11177', '5b569c1e-1c8f-45d6-8ea5-8c488e0997d2', '2027-01-04', 'Q1 design kickoff planning', null);

commit;