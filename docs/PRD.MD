# Product Requirements Document

## Design Portfolio & Manpower Planner — MVP

**Document status:** MVP Ready for Build
**Primary user:** Design Planning Admin / Design Lead
**Primary purpose:** Stakeholder-facing portfolio and manpower visibility
**Platform:** Web application, desktop-first
**MVP access model:** Admin only

---

# 1. Product Summary

Design Portfolio & Manpower Planner adalah aplikasi internal untuk membantu tim Design memetakan:

* project yang sedang dan akan berjalan,
* timeline dan target masing-masing project,
* prioritas project,
* business origin dan stakeholder project,
* struktur squad,
* designer yang terlibat di setiap project,
* project overlap antar-designer,
* cross-squad support.

Aplikasi ini **bukan task management tool** dan **bukan workload calculation tool**.

Tujuan utama aplikasi adalah memberikan visibility yang cukup agar Design Lead atau stakeholder dapat memahami kondisi portfolio dan manpower lalu mengambil keputusan secara manual.

Contoh keputusan:

> “Sarah saat ini menjadi Lead di Project A dan membantu Project B. Project C akan mulai November. Apakah Project B bisa dibantu designer lain?”

Aplikasi cukup menyediakan informasi tersebut.

Aplikasi **tidak perlu menentukan secara otomatis apakah workload seseorang terlalu tinggi atau masih tersedia**.

---

# 2. Problem Statement

Saat beberapa squad dan project berjalan bersamaan, stakeholder sulit melihat secara cepat:

1. Project apa saja yang sedang dikerjakan Design Team?
2. Project tersebut berasal dari Department/Epic mana?
3. Siapa stakeholder yang bertanggung jawab?
4. Mana project dengan priority lebih tinggi?
5. Sampai kapan project berjalan?
6. Apa target setiap periode?
7. Designer mana yang terlibat?
8. Designer tersebut berasal dari squad mana?
9. Siapa Design Lead project tersebut?
10. Apakah designer sedang membantu squad lain?
11. Apakah beberapa project akan overlap pada periode yang sama?
12. Bagaimana struktur keseluruhan Design Team?

Informasi tersebut biasanya tersebar di spreadsheet, Figma, chat, atau knowledge masing-masing orang.

Produk ini menjadi **single visibility layer** untuk portfolio Design Team.

---

# 3. Product Goal

Membuat satu dashboard yang memungkinkan Design Lead menjelaskan kondisi portfolio dan manpower kepada stakeholder dalam beberapa menit.

Produk harus mampu menjawab tiga pertanyaan utama:

### What are we working on?

Project, priority, status, ownership.

### When are we working on it?

Timeline, phase, dan monthly target.

### Who is working on it?

Squad, Design Lead, supporting designer, dan cross-squad support.

---

# 4. Product Principles

## 4.1 Visibility over automation

MVP memberikan informasi untuk membantu manusia mengambil keputusan.

Tidak perlu automated manpower recommendation.

---

## 4.2 No false precision

Tidak ada:

* allocation percentage,
* utilization percentage,
* work hours,
* capacity score,
* workload score.

Jumlah project tidak otomatis menentukan seseorang overloaded.

---

## 4.3 Structural team ≠ project team

Designer mempunyai **Home Squad** sebagai struktur organisasi.

Namun designer bebas membantu project squad lain.

Contoh:

```text
Sarah
Home Squad: Squad A

Project A
Owner Squad: Squad A
Role: Support

Project B
Owner Squad: Squad B
Role: Support
Cross-squad
```

---

## 4.4 Business ownership ≠ Design ownership

Setiap project harus mempunyai konteks business dan konteks design.

Business:

```text
Epic
Department
Department Head
Product Owner
Project Admin / PIC
```

Design:

```text
Owner Squad
Project Design Lead
Supporting Designers
```

---

## 4.5 Keep the MVP operationally simple

Produk harus dapat dipelajari tanpa training khusus.

Jika suatu informasi tidak membantu membaca portfolio atau manpower, jangan dimasukkan ke MVP.

---

# 5. User Persona

## Primary Persona — Design Planning Admin

Contoh:

* Design Lead
* Design Manager
* Senior Designer yang bertanggung jawab terhadap planning
* Design Ops

Tanggung jawab:

* membuat project,
* memperbarui timeline,
* menentukan priority,
* mengelola master data,
* assign designer,
* mengatur squad,
* memperbarui project status.

Untuk MVP, hanya persona ini yang menggunakan aplikasi.

Stakeholder hanya melihat aplikasi melalui presentasi/screen sharing, bukan login langsung.

---

# 6. User Access

## MVP

Hanya satu application role:

```text
Admin
```

Admin dapat:

* melihat seluruh data,
* membuat project,
* mengedit project,
* archive project (tidak ada hard delete, lihat §25),
* mengelola designers,
* mengelola squads,
* mengelola departments,
* mengelola epics,
* mengelola stakeholders.

Tidak perlu:

* login stakeholder,
* Editor role,
* Viewer role,
* permission matrix,
* per-squad permission.

Namun struktur user sebaiknya tetap role-ready:

```text
User
- id
- name
- email
- role = admin
```

Future roles:

```text
Admin
Editor
Viewer
```

Tidak perlu dibuat UI-nya pada MVP.

---

# 7. Information Architecture

Main navigation:

```text
Overview
Timeline
Projects
People
Teams
Master Data
```

Utility navigation:

```text
Settings
User/Profile
```

Settings dapat sangat minimal pada MVP.

---

# 8. Core Entities

## 8.1 Designer

Fields:

```text
id
name
job_title
seniority
home_squad_id
avatar
status
```

Example:

```text
Name:
Sarah

Job Title:
Product Designer

Seniority:
Junior

Home Squad:
Squad A
```

Designer tidak memiliki allocation percentage.

---

# 8.2 Squad

Fields:

```text
id
name
lead_designer_id
description
status
```

Example:

```text
Squad A

Lead:
Dimas

Members:
Sarah
Malik
```

Squad menunjukkan struktur organisasi.

Squad tidak membatasi project assignment.

---

# 8.3 Department

Fields:

```text
id
name
description
department_head_id
status
```

`department_head_id` references Stakeholder Master Data (`stakeholder_type = Department Head`). It is the department's current head, used to auto-fill Department Head on new Projects (§21) and re-derive it when a Project's Department changes (§25).

Example:

```text
Wholesale Banking
Merchant Business
Digital Banking
```

Department is never hard-deleted. Use `status = Inactive` if a department is retired; it remains available for historical Project rendering.

---

# 8.4 Stakeholder

Fields:

```text
id
name
title
department_id
stakeholder_type
status
```

Supported stakeholder types:

```text
Department Head
Product Owner
Project Admin / PIC
```

Satu orang dapat digunakan di beberapa project.

---

# 8.5 Epic

Fields:

```text
id
name
department_id
description
status
```

Example:

```text
Trade Finance
Cash Management
Merchant
Digital Channel
```

Epic menjadi salah satu konteks utama project.

---

# 8.6 Project

Fields:

```text
id
name

epic_id
department_id

department_head_id
product_owner_ids[]
project_admin_ids[]

owner_squad_id

priority
status
health
timeline_confidence
is_archived

start_month
end_month

description

created_at
updated_at
```

`department_head_id` is an ownership **snapshot**: copied from Department's current `department_head_id` at the time the Project is created or its Department is changed. It does not live-update if the Department's head changes later, so historical Project context stays stable.

There is no separate Project Design Lead field on Project. Project Design Lead is derived entirely from Project Assignment (§8.7) — the row where `project_role = "Lead"`.

`is_archived` is independent of `status`. Archiving removes a Project from normal operational views (Overview, Timeline) without changing its lifecycle Status and without deleting it. See §25 (Archiving a Project).

---

# 8.7 Project Assignment

Relationship antara Project dan Designer.

Fields:

```text
id
project_id
designer_id
project_role
```

Supported project roles:

```text
Lead
Support
```

Tidak ada allocation percentage.

**Project Design Lead is this table, not a separate relationship.** "Project Design Lead," wherever it appears in this document, means: the Project Assignment row for a given project where `project_role = "Lead"`. There is no duplicate Design Lead field stored on Project itself.

Rules:

- A project may have **zero or one** Lead. No Lead is a normal, valid state ("Unassigned") — it does not block creating or saving a project.
- A project may have **zero or many** Support designers.
- A designer may appear at most once per project (no duplicate assignment rows for the same project + designer pair).

---

# 8.8 Project Monthly Target

Fields:

```text
id
project_id
month
phase
target
```

Example:

```text
September 2026
Phase: Research
Target: Requirement alignment completed

October 2026
Phase: Exploration
Target: UX direction approved

November 2026
Phase: Design
Target: Final UI ready

December 2026
Phase: Handover
Target: Developer handoff complete
```

---

# 8.9 Project Weekly Focus

Lightweight, operational-planning companion to Project Monthly Target (§8.8) — not a task-management entity. See §14.2 (Timeline Week View) and §22 (Add/Edit Project — Timeline & Planning) for where it is read and edited.

Fields:

```text
id
project_id
week_start_date
title
description (optional)
```

`week_start_date` is an ISO date string (`YYYY-MM-DD`) representing the Monday that starts the week — Monday is the MVP week-start convention. A project may have **zero or many** Weekly Focus items for a given week (e.g. two parallel exploration threads in the same week); a week with no items is a normal, valid state and must render without error.

Weekly Focus does **not** carry a Designer assignment field. Who is working on a project in a given week is still derived entirely from Project Assignment (§8.7) — Weekly Focus only records *what* the project is focused on, never *who* is doing it or how much of their time it takes.

Example:

```text
Week of Sep 7, 2026
Title: Requirement mapping

Week of Sep 7, 2026
Title: Benchmark existing flow

Week of Sep 14, 2026
Title: LC Issuance flow exploration
```

Do not add: task status, task assignee, subtasks, checklist, story points, sprint planning, Kanban, task comments, per-task priority, per-task workload, or task completion percentage. Weekly Focus is a short planning note, not a Jira-style task.

---

# 9. Project Taxonomy

## Priority

Gunakan:

```text
P1
P2
P3
```

Meaning:

**P1 — High Priority**
Strategic / mandatory / critical initiative.

**P2 — Planned Priority**
Committed roadmap work.

**P3 — Improvement / Lower Priority**
Enhancement atau initiative yang lebih fleksibel.

Hindari High / Medium / Low supaya visual lebih ringkas.

---

# 10. Project Status

Supported statuses:

```text
Proposed
Planning
In Progress
On Hold
Done
```

### Proposed

Project masih merupakan upcoming initiative.

### Planning

Project sudah cukup pasti tetapi belum mulai execution.

### In Progress

Sedang berjalan.

### On Hold

Sementara dihentikan.

### Done

Selesai dan tetap tersimpan sebagai history.

---

# 11. Project Health

Manual status:

```text
On Track
At Risk
Blocked
```

Tidak perlu dihitung otomatis.

Health dapat diperbarui oleh Admin.

---

# 12. Timeline Confidence

Supported values:

```text
Committed
Tentative
```

### Committed

Timeline dianggap telah disepakati.

Visual timeline:

```text
solid line
```

### Tentative

Timeline masih mungkin berubah.

Visual timeline:

```text
dashed / lower emphasis
```

Ini membantu stakeholder melihat project mana yang lebih fleksibel saat terjadi overlap.

---

# 13. Squad Relationship Rules

Setiap Designer memiliki:

```text
Home Squad
```

Setiap Project memiliki:

```text
Owner Squad
```

Project assignment tidak dibatasi Home Squad.

Example:

```text
Project:
Merchant Revamp

Owner Squad:
Squad B

Project Design Lead:
Raka — Squad B

Supporting Designer:
Sarah — Squad A
```

System secara otomatis menampilkan badge:

```text
Cross-squad
```

untuk Sarah.

Cross-squad ditentukan jika:

```text
designer.home_squad_id != project.owner_squad_id
```

Tidak perlu disimpan secara manual.

---

# 14. Screen Requirements

# 14.1 Overview

## Purpose

Memberikan stakeholder-level snapshot mengenai kondisi portfolio.

Overview tidak boleh terlalu chart-heavy.

Prioritaskan information density dan actionable visibility.

### Header

```text
Design Portfolio
Q4 2026
```

Optional period selector:

```text
Q3 2026
Q4 2026
2027
```

### Summary cards

Minimal:

```text
Active Projects
Upcoming / Proposed
Designers
Unassigned Projects
```

**Active Projects** = Status ∈ {Planning, In Progress} only. `Proposed` is counted separately under **Upcoming / Proposed**. `On Hold` and `Done` are excluded from the Active count.

**Done and Archived projects are hidden from Overview by default.** They remain fully accessible via filters on the Projects page (§14.3) and are never deleted.

Optional:

```text
Cross-squad Assignments
At Risk Projects
```

### Priority Projects

Show maximum 5–6 high-priority projects.

Example:

```text
P1
Trade Finance

Sep — Dec

Owner Squad
Squad A

Design Lead
Malik

On Track
```

### Upcoming Projects

Show proposed/planning project yang akan segera mulai.

### Project Health

Simple summary:

```text
On Track  8
At Risk   3
Blocked   1
```

Tidak perlu pie chart besar.

### Team Snapshot

Show squads:

```text
Squad A
Lead: Dimas
3 Designers

Squad B
Lead: Raka
4 Designers
```

### Cross-squad Support

Example:

```text
Sarah
Squad A → Merchant / Squad B

Malik
Squad A → Digital Channel / Squad C
```

---

# 14.2 Timeline

## Purpose

Menjadi primary portfolio visualization.

Timeline supports two view modes, switched with a segmented control in the header:

```text
[Month] [Week]
```

**Month** is the default view on load and the default after any filter change. Both views share the same visual language, the same sticky Project column, and the same filters — switching between them must not feel like entering a different screen.

Day-level granularity is **not** supported (no zoom to individual days).

### Month View

The portfolio / stakeholder view. Optimizes for: project duration, priority, Owner Squad, Design Lead, project phase, Committed vs Tentative, and overall portfolio overlap. Stays visually concise — this is the view a Design Lead presents to stakeholders.

```text
                    SEP       OCT       NOV       DEC

[P1] Trade          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    Research  Explore   Design     Handover

[P1] Merchant                 ━━━━━━━━━━━━━━━━━━━━━
                              Discovery Design     Testing

[P2] Website        - - - - - - - - - - - - - - -
                    Tentative
```

Each row displays:

```text
Project Name
Priority
Owner Squad
Project timeline
Project phases
```

Default horizon: approximately 6 months, with Previous / Next navigation.

### Week View

The Design Lead's operational-planning view. Answers "what is this project focusing on this week?" — it is **not** a task-management feature (no task status, assignee, subtasks, checklist, story points, sprint planning, Kanban, task comments, per-task priority, per-task workload, or completion percentage; see §8.9 and §38).

Header groups week columns under their month, and clearly marks a transition into a new month or year:

```text
Timeline

[Today] [Previous]   Sep 2026   [Next]              [Month] [Week]

SEP 2026
Sep 7 (W2)   Sep 14 (W3)   Sep 21 (W4)   Sep 28 (W5)
```

The Project column is identical to Month View (sticky, same fields) and is not repeated per week:

```text
Trade Finance Platform Revamp
[P1] Squad A · Malik
```

Each week cell may show the active phase plus a short Weekly Focus preview, kept concise (no paragraphs in the grid):

```text
Research

Requirement mapping
+1 more
```

When a project has more Weekly Focus items than fit, show a `+N more` affordance. Clicking a week cell opens a small popover/sheet/dialog with the full week detail (phase + full Weekly Focus list) — do not navigate away from Timeline to inspect it.

Default horizon: approximately 6–8 weeks, with Previous / Next navigation. Do not render an excessively wide weekly timeline by default.

### Interactions

Required:

* hover project
* click project → Project Detail
* horizontal timeline navigation (Month and Week)
* filtering
* Month ↔ Week toggle
* click a Week View cell → Weekly Focus detail (popover/sheet/dialog, no navigation away)

Drag-and-drop rescheduling is **not required** for MVP, in either view.

### Filters

Month View and Week View share the same filters:

```text
Search
Owner Squad
Priority
Status
Department
Epic
Health
Show archived
```

Optional:

```text
Designer
```

Switching Month ↔ Week preserves active filters where practical.

**Done and Archived projects are hidden from Timeline by default in both views.** Use the Status filter (and the Show archived toggle) to bring them back into view.

### Current time indicator

Month View: highlight the current month, with a subtle current-time vertical indicator. Week View: clearly highlight the current week. In both views, keep the indicator subtle — do not over-emphasize it visually.

### Visual rules

Committed:

```text
solid timeline
```

Tentative:

```text
dashed / reduced opacity timeline
```

Priority should use subtle badge treatment.

Avoid excessive saturated colors, rainbow phase coloring, a separate card per week, excessive pills, and dense borders. The Timeline (project rows and grid) must stay the dominant visual element on the page — filters and the view toggle stay restrained.

### Responsive behavior

Desktop-first. Week View will naturally require horizontal scrolling — keep the Project column sticky and let week columns scroll horizontally. Do not compress week columns until their text becomes unreadable.

---

# 14.3 Projects

## Purpose

Project directory / source of truth.

### Project List

Recommended table columns:

```text
Project
Epic
Department
Priority
Status
Owner Squad
Design Lead
Timeline
Health
Updated
```

Support:

```text
Search project
Filter
Sort
```

### Default sort

Recommended:

```text
Priority
then
Start Date
```

or latest updated.

### Add Project CTA

Primary button:

```text
+ Add Project
```

### Done and Archived Projects

Unlike Overview and Timeline, the Projects page may show `Done` and `Archived` projects — reachable via the Status filter and an Archived toggle, not shown by default alongside active work.

---

# 14.4 Project Detail

Project Detail should quickly answer:

```text
What is this project?
Where does it come from?
Who owns it?
When does it run?
Who is designing it?
```

Recommended layout:

## Header

```text
Trade Finance

P1
In Progress
On Track
Committed

Sep — Dec 2026
```

---

## Project Context

```text
Epic
Trade Finance

Department
Wholesale Banking

Department Head
Budi Santoso

Product Owners
Sarah Wijaya
Ahmad Fikri

Project Admin / PIC
Nadia Putri
```

---

## Design Ownership

```text
Owner Squad
Squad A

Squad Lead
Dimas

Project Design Lead
Malik

Supporting Designers
Sarah
Raka
```

If designer comes from another squad:

```text
Raka
Support
Squad B
Cross-squad
```

If no Project Design Lead is assigned, display `Project Design Lead: Unassigned` rather than omitting the field.

---

## Timeline & Monthly Targets

Example:

```text
SEP
Research
Requirement alignment

OCT
Exploration
UX direction approval

NOV
Design
Final UI

DEC
Handover
Developer handoff
```

---

## Weekly Plan (shown only when Weekly Focus data exists)

Secondary to the Timeline & Monthly Targets section above — a read-only rollup of Project Weekly Focus (§8.9). A project with no Weekly Focus items simply omits this section.

Example:

```text
September 2026

Sep 7–13
Research
• Requirement mapping
• Benchmark

Sep 14–20
Exploration
• LC Issuance flow exploration
• Navigation exploration
```

---

## Meta Information

```text
Created
Updated
Last updated by
```

Show:

```text
Updated 2 days ago
```

If data is old, system may show subtle warning:

```text
Needs review
```

Suggested threshold:

```text
14 days without update
```

This is optional but recommended.

---

# 14.5 People

## Purpose

Menampilkan manpower dan project involvement tanpa menghitung utilization.

### People List

Display:

```text
Avatar
Name
Role
Seniority
Home Squad
Active Projects
Lead Projects
Support Projects
```

Do not show:

```text
capacity %
utilization %
hours
```

**Active Projects** uses the same status set as Overview's Active Projects (§14.1): Status ∈ {Planning, In Progress}. **Active Projects**, **Lead Projects**, and **Support Projects** all count that designer's Project Assignment rows only on non-archived projects — archived projects are excluded from every count here, the same as they're excluded from Overview and Timeline by default.

### Person Card Example

```text
Sarah
Junior Product Designer

Home Squad
Squad A

Squad Lead
Dimas

2 Active Projects
1 Lead
1 Support
```

---

# 14.6 Person Detail

Header:

```text
Sarah

Junior Product Designer
Squad A
```

Structural information:

```text
Home Squad
Squad A

Squad Lead
Dimas
```

### Current Projects

Example:

```text
P1
Trade Finance
Support
Squad A

P1
Merchant Revamp
Support
Squad B
Cross-squad
```

### Person Timeline

Important MVP feature. Month granularity only — the Week View introduced for the portfolio Timeline (§14.2) does not apply here; Person Timeline is about overlap across projects, which reads better at month scale.

Example:

```text
                 SEP       OCT       NOV       DEC

Trade Finance    ███████████████████████████████
Support

Merchant                    █████████████████████
                            Support · Cross-squad
```

Tujuan view ini adalah membuat overlap mudah terlihat.

System tidak memberi warning otomatis apakah overlap tersebut terlalu berat.

---

# 14.7 Teams

## Purpose

Menunjukkan struktur organisasi Design Team.

### Team Overview

Example:

```text
Squad A
Lead: Dimas
3 Designers

Squad B
Lead: Raka
4 Designers
```

Click squad → Squad Detail.

---

# 14.8 Squad Detail

Example:

```text
Squad A

Squad Lead
Dimas
```

### Members

```text
Dimas
Senior Product Designer

Sarah
Junior Product Designer

Malik
Junior Product Designer
```

### Projects Owned by Squad

Example:

```text
Trade Finance
P1

Cash Management
P2
```

### Cross-squad Support

Outgoing:

```text
Sarah
→ Merchant Revamp
Squad B
```

Incoming:

```text
Raka
Squad B
→ Trade Finance
```

This section is particularly useful for stakeholder visibility.

---

# 14.9 Master Data

Accessible from sidebar:

```text
Master Data
```

Use tabs or nested navigation:

```text
Designers
Squads
Departments
Epics
Stakeholders
```

---

# 15. Master Data — Designers

Admin can:

```text
Create
Edit
Deactivate
```

Fields:

```text
Name
Job Title
Seniority
Home Squad
Avatar
Status
```

Designers are never permanently deleted, regardless of whether they are connected to historical projects.

Use:

```text
Active
Inactive
```

An Inactive designer remains visible wherever historical Project data references them (past assignments, People history).

---

# 16. Master Data — Squads

Fields:

```text
Squad Name
Squad Lead
Description
Status
```

Squads are never permanently deleted. Use `Active` / `Inactive` (matching Designers, §15) — an Inactive squad remains available wherever historical Project data references it as Owner Squad.

Members do not need to be manually maintained twice.

Squad members are derived from:

```text
Designer.home_squad_id
```

---

# 17. Master Data — Departments

Fields:

```text
Department Name
Description
Department Head
Status
```

Department Head references Stakeholder Master Data (`stakeholder_type = Department Head`, §8.4/§19) — no arbitrary free text. It is the department's current head, used to auto-fill Department Head on new Projects (§21) and re-derive it when a Project's Department changes (§25).

Departments are never permanently deleted. Use `Active` / `Inactive` — an Inactive department remains available wherever historical Project data references it.

---

# 18. Master Data — Epics

Fields:

```text
Epic Name
Department
Description
Status
```

Epic selector in Project form must use this master.

Epics are never permanently deleted. Use `Active` / `Inactive` — an Inactive epic remains available wherever historical Project data references it.

---

# 19. Master Data — Stakeholders

Fields:

```text
Name
Title
Department
Stakeholder Type
Status
```

Stakeholder Type:

```text
Department Head
Product Owner
Project Admin / PIC
```

Project form dropdowns must pull data from this master. Every project reference to a Department Head, Product Owner, or Project Admin/PIC must resolve to a Stakeholder row here — never arbitrary free text.

Do not hardcode stakeholder names directly inside project form.

Stakeholders are never permanently deleted. Use `Active` / `Inactive` — an Inactive stakeholder remains available wherever historical Project data references them.

---

# 20. Create Project User Flow

Use a lightweight 4-step flow.

```text
Add Project

1. Project Context
        ↓
2. Timeline & Targets
        ↓
3. Design Team
        ↓
4. Review
        ↓
Create Project
```

---

# 21. Add Project — Step 1: Project Context

Fields:

```text
Project Name *

Epic *

Department *

Department Head (auto-filled, read-only)

Product Owner *

Project Admin / PIC

Priority *

Status *

Project Health

Timeline Confidence *

Owner Squad *
```

All organizational selectors must come from Master Data.

Product Owner and Project Admin can support multiple selections.

**Department Head is not independently selected.** It is auto-filled from the selected Department's current `department_head_id` (Department Master Data, §8.3/§17) and displayed read-only. The resulting value is stored on the Project as a snapshot (§8.6) at save time — it does not change later if the Department's head changes.

If Epic is linked to Department, selecting Epic may prefill Department.

However the UI should still clearly show Department.

---

# 22. Add Project — Step 2: Timeline & Planning

Fields:

```text
Start Month *
End Month *
```

After selecting timeline, generate month rows.

This step has two sub-views, kept lightweight, switched with a small segmented control:

```text
[Monthly] [Weekly]
```

### Monthly

One row per month in range: month, phase, target (unchanged from the original Monthly Target behavior).

Example:

```text
Sep 2026
Phase: Research
Target: Requirement aligned

Oct 2026
Phase: Exploration
Target: UX direction approved

Nov 2026
Phase: Design
Target: Final UI approved

Dec 2026
Phase: Handover
Target: Ready for development
```

Supported phase presets:

```text
Discovery
Research
Exploration
Design
Testing
Handover
BAU
Other
```

Target remains free text.

Do not create task management inside monthly target.

One month can have one primary phase and target for MVP.

### Weekly

Add / edit Project Weekly Focus items (§8.9): pick a week (Monday-start) within the project's Start–End range, then one or more short focus titles (optional description). A week may have zero items. This is not a task list — no status, assignee, or completion percentage. Weekly Focus is additive to, not a replacement for, Monthly Target: Monthly Target answers "what should be achieved this month," Weekly Focus answers "what are we working on this week."

Do not create a standalone Tasks page — Weekly Focus is edited only from this step (Add and Edit Project share this one wizard step, per §25) and, where shown, from Project Detail (§14.4) as read-only display.

---

# 23. Add Project — Step 3: Design Team

Fields:

```text
Project Design Lead (optional)

Supporting Designers
```

Project Design Lead selector sources data from Designer Master. Leaving it empty is valid and does not block saving the project — the project is simply represented as **Unassigned** (§26) until a Lead is assigned.

Supporting Designer is multi-select.

Show structural context while selecting:

```text
Sarah
Junior Product Designer
Squad A
```

Do not prevent selecting designer from another squad.

If designer's Home Squad differs from Owner Squad, show:

```text
Cross-squad
```

---

# 24. Add Project — Step 4: Review

Show summary:

```text
Trade Finance

P1
In Progress
Committed

Epic
Trade Finance

Department
Wholesale Banking

Department Head
Budi Santoso

Product Owner
Sarah Wijaya

Owner Squad
Squad A

Design Lead
Malik

Supporting
Sarah
Raka

Sep — Dec 2026
```

If no Design Lead was selected, show `Design Lead: Unassigned` instead — this is a valid state, not an error.

Show monthly target summary.

Primary CTA:

```text
Create Project
```

Secondary:

```text
Back
```

After creation:

```text
Redirect → Project Detail
```

---

# 25. Edit Project

Admin can edit all project information, including Weekly Focus (§8.9, §22).

Use same structure as Add Project.

Changes must automatically propagate to:

```text
Overview
Timeline
Projects
People
Teams
```

Example:

If Sarah removed from Trade Finance:

People view must immediately stop showing Trade Finance under Sarah.

If Department is changed on an existing Project, Department Head is re-derived from the new Department and the stored snapshot (§8.6) is updated to match.

---

## Archiving a Project

Archive is a separate concept from Status. A Project can be `Done` and not archived (kept visible as recent history), or archived at any Status, if it should be removed from normal operational views (Overview, Timeline) without being deleted.

Archiving:

- sets `is_archived = true` (§8.6),
- does not change Status, Health, or any assignment data,
- removes the project from Overview and Timeline by default,
- keeps the project fully visible on the Projects page via an Archived filter/toggle (§14.3).

There is no permanent delete for Projects. Un-archiving is always possible (`is_archived = false`).

---

# 26. Unassigned Projects

A project can exist without Supporting Designer, and without a Project Design Lead, at any Status (Proposed, Planning, In Progress, On Hold). This is a normal, valid state — never a validation error that blocks creating or saving a project.

For a project considered active (`Active Projects` = Planning + In Progress, §14.1), a missing Project Design Lead should be visually noticeable.

Overview can show:

```text
Unassigned Projects
2
```

Example:

```text
Project X
P1
Starts November
Design Lead not assigned
```

This is visibility only.

No automatic assignment recommendation.

---

# 27. Search

MVP search requirement:

Projects page:

```text
Search project name
```

People page:

```text
Search designer
```

Master Data:

```text
Search current entity
```

Global search is optional and can be postponed.

---

# 28. Empty States

Provide intentional empty states.

Example People:

```text
No designers yet

Add designers to start mapping your design team.

[Add Designer]
```

Example Project:

```text
No projects found

Create your first project to start building the portfolio.

[Add Project]
```

Filtered state:

```text
No projects match these filters.

[Clear filters]
```

---

# 29. UI / Visual Direction

Design direction:

```text
Enterprise
Calm
Minimal
Professional
Light mode
High information clarity
```

Avoid:

* excessive gradients,
* glassmorphism,
* dark dashboard aesthetic,
* oversized charts,
* excessive rounded cards,
* gaming-style dashboard visuals,
* neon status colors.

Recommended characteristics:

```text
Neutral page background
White surfaces
Subtle border
Minimal shadow
Clear table hierarchy
Compact status badges
Consistent spacing
Strong typography hierarchy
```

Color palette (see `docs/DESIGN.md`): the app uses a defined navy/blue brand palette rather than pure grayscale — Ink Navy (#0b3558) for text and icons, Signal Blue (#006bff) as the single primary action/focus/selection color, Slate Gray (#476788) for secondary text, and a Cloud/Paper/Pebble neutral surface scale. This still honors the Avoid list below (no gradients, no neon, no decorative color) — it replaces "grayscale" with "one disciplined brand hue," not with a colorful/maximalist palette.

Recommended components:

```text
shadcn/ui
```

Typography:

```text
Inter
or
Jakarta Sans
```

Desktop-first target:

```text
1440px
```

Application should remain usable down to tablet width.

Mobile optimization is not required for MVP.

---

# 30. Timeline UX Requirements

Timeline should prioritize readability over complex Gantt functionality.

Required:

```text
Sticky project-name column
Horizontal scrolling
Month header (Month View) / week header grouped by month (Week View)
Current month indicator (Month View) / current week indicator (Week View)
Project bars (Month View) / phase + Weekly Focus preview per week cell (Week View)
Phase labels
Click → Project Detail
Month ↔ Week view toggle (§14.2)
```

Not required:

```text
drag project
resize project bar
dependencies
critical path
zoom by day (no Day View)
```

---

# 31. Visual Status System

Use color conservatively.

Examples:

Priority:

```text
P1 = stronger emphasis
P2 = medium emphasis
P3 = neutral
```

Health:

```text
On Track
At Risk
Blocked
```

Status:

```text
Proposed
Planning
In Progress
On Hold
Done
```

Timeline confidence should primarily use visual pattern:

```text
Committed = solid
Tentative = dashed
```

Do not rely on color alone.

---

# 32. Cross-squad Logic

Automatically calculate Cross-squad status.

Pseudo logic:

```text
if designer.homeSquadId !== project.ownerSquadId
  assignment.crossSquad = true
else
  assignment.crossSquad = false
```

Do not expose Cross-squad as a manually editable checkbox.

---

# 33. Data Freshness

Every Project should store:

```text
created_at
updated_at
```

Project Detail displays:

```text
Updated 2 days ago
```

Optional recommendation:

If project is active and:

```text
updated_at > 14 days
```

show subtle:

```text
Needs review
```

Do not show error or critical warning.

---

# 34. MVP Data Architecture Recommendation

For first implementation, separate UI from data source.

Create a data/service layer.

Example:

```text
projectService
designerService
squadService
departmentService
epicService
stakeholderService
```

Components should not directly import large mock arrays, and must not access `localStorage` (or any storage mechanism) directly. All reads and writes go through the service/repository layer:

```text
UI
→ service / repository layer
→ localStorage repository
```

**MVP persistence assumption:** single Admin, single browser/device, used for live stakeholder demonstration. No concurrent multi-admin editing is required for MVP. If that changes, only the repository implementation is swapped — the service layer contract and UI stay the same.

This allows MVP data source to start from:

```text
local storage
mock JSON
```

and later move to:

```text
Supabase
PostgreSQL
REST API
company backend
```

without rewriting UI components. Do not introduce Supabase, an authentication backend, or a server database for this MVP.

For stakeholder demo, local persistence is acceptable.

---

# 35. Recommended Technical Stack

If no existing stack is specified:

```text
React / Next.js
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
```

For MVP persistence:

```text
localStorage, wrapped by the service/repository layer (§34)
```

Preferred architecture:

```text
UI
↓
Service / Repository Layer
↓
Mock / Local Data
```

Later:

```text
UI
↓
Same Service Layer
↓
Real Backend API
```

Do not tightly couple UI to mock data.

---

# 36. Seed Data for Demo

Create realistic seed data so the application is immediately useful when opened.

## Squads

```text
Squad A
Lead: Dimas

Squad B
Lead: Raka

Squad C
Lead: Nadia
```

## Designers

```text
Dimas
Senior Product Designer
Squad A

Sarah
Junior Product Designer
Squad A

Malik
Junior Product Designer
Squad A

Raka
Senior Product Designer
Squad B

Nadia
Senior Product Designer
Squad C

Andi
Product Designer
Squad B
```

## Departments

```text
Wholesale Banking
Merchant Business
Digital Channel
```

## Epics

```text
Trade Finance
Merchant
Digital Channel Enhancement
Design System
```

## Example Projects

### Trade Finance

```text
Priority: P1
Status: In Progress
Health: On Track
Timeline: Sep–Dec
Confidence: Committed

Owner Squad:
Squad A

Design Lead:
Malik

Support:
Sarah
Raka

Raka should show Cross-squad.
```

### Merchant Revamp

```text
Priority: P1
Status: Planning
Health: On Track
Timeline: Oct–Jan
Confidence: Committed

Owner Squad:
Squad B

Design Lead:
Raka

Support:
Sarah

Sarah should show Cross-squad.
```

### Design System Enhancement

```text
Priority: P2
Status: In Progress
Health: On Track
Timeline: Sep–Nov
Confidence: Tentative

Owner Squad:
Squad A

Design Lead:
Dimas

Support:
Malik
```

### Digital Channel Initiative

```text
Priority: P2
Status: Proposed
Timeline: Nov–Feb
Confidence: Tentative

Owner Squad:
Squad C

Design Lead:
Not assigned
```

Seed data should intentionally demonstrate:

* cross-squad support,
* overlapping project timelines,
* different priorities,
* tentative project,
* unassigned project.

### Project Weekly Focus (§8.9)

Extend a few existing seed projects (e.g. Trade Finance) with realistic Weekly Focus examples — do not add Weekly Focus to every project or every week. Demo data should show:

* multiple focus items in the same week,
* at least one week in range with zero items (empty week renders fine),
* different phases across weeks,
* a week range that crosses a month boundary,
* a week range that crosses a year boundary, if a seeded project's timeline spans one.

Weekly Focus is additive: existing persisted demo data (already in a user's browser from before this change) must continue to load correctly even though it has no Weekly Focus rows — do not wipe or migrate existing localStorage data to backfill this field.

---

# 37. MVP Acceptance Criteria

The MVP is considered successful when an Admin can:

### Portfolio

* see active and upcoming projects,
* identify priority projects,
* identify project health,
* identify unassigned projects.

### Timeline

* see projects across months,
* see project phases,
* distinguish committed vs tentative,
* filter portfolio,
* switch between Month View and Week View without losing active filters,
* see what a project is focused on in a given week (Weekly Focus), without it turning into a task board,
* see the same Weekly Focus data on Timeline, Project Detail, and Project Edit.

### Projects

* create project,
* edit project,
* archive / un-archive a project (without deleting it, §25),
* view complete project context,
* see business stakeholders,
* see Design ownership.

### People

* see every designer,
* see Home Squad,
* see current project assignments,
* see Lead vs Support,
* see cross-squad assignments,
* see project overlap across timeline.

### Teams

* see every squad,
* identify Squad Lead,
* see squad members,
* see cross-squad support.

### Master Data

* create/edit/deactivate Designers,
* create/edit/deactivate Squads,
* create/edit/deactivate Departments (including Department Head),
* create/edit/deactivate Epics,
* create/edit/deactivate Stakeholders.

### Data Consistency

Changing assignment or project data must update all relevant views automatically.

---

# 38. Explicitly Out of Scope

DO NOT implement these features for MVP:

```text
Task management
Kanban
Sprint planning
Subtasks
Timesheets
Work hours
Allocation percentage
Utilization percentage
Capacity percentage
Capacity scoring
Workload scoring
Automated manpower balancing
AI manpower recommendation
Project budget
Cost tracking
Notifications
Comments
Mentions
Approval workflow
File attachments
Chat
Jira integration
Figma integration
Slack integration
Google Calendar integration
Stakeholder login
Editor role
Viewer role
Complex RBAC
Per-squad permissions
Skill matching
Project dependencies
Critical path
Drag-and-drop timeline
Day-level timeline view (Week View is in scope — see §14.2, §8.9)
Task management inside Weekly Focus (status, assignee, subtasks, checklist, story points, sprint planning, Kanban, comments, per-task priority/workload, completion percentage)
Resource forecasting
Hard delete of Projects or Master Data records
Concurrent multi-admin editing
Supabase / backend database for MVP
Authentication / SSO backend for MVP
```

Do not add these proactively.

---

# 39. Future Roadmap — Not MVP

Potential future capabilities:

### Role & Permission

```text
Admin
Editor
Viewer
```

### Stakeholder Portal

Stakeholders can access read-only portfolio view.

### Project Request Intake

Incoming initiative before becoming committed project.

### Scenario Planning

Experiment with moving designers between projects.

### Capacity Planning

Optional qualitative or quantitative workload model.

### Integrations

Potential:

```text
Jira
Figma
Google Calendar
HRIS
```

### Change History

Track:

```text
Designer reassigned
Timeline changed
Priority changed
Status changed
```

### AI

Only after data quality has matured.

Possible use:

```text
Portfolio summary
Risk explanation
Overlap detection
Planning assistant
```

---

# 40. MVP Success Scenario

A Design Lead opens the application during stakeholder meeting.

Within one screen they can explain:

```text
We currently have 12 active projects.

Four projects are P1.

Trade Finance runs until December and is owned by Squad A.

Malik is the Design Lead.

Sarah and Raka are supporting it.

Raka comes from Squad B, so this is cross-squad support.

Sarah is also supporting Merchant Revamp starting October.

Digital Channel will likely start November but is still tentative and does not yet have a Design Lead.
```

Stakeholder should be able to understand:

```text
what is happening,
when it is happening,
where the work comes from,
who owns it,
who is working on it,
and where project overlap exists.
```

without requiring workload percentages or detailed project-management data.

---

# 41. Primary MVP Value Proposition

> A single source of visibility for Design portfolio, timeline, team structure, project ownership, and designer assignment—so Design Leads can explain current workload and manpower allocation clearly without turning the tool into a task manager or timesheet system.

---

# 42. Build Guardrail for AI Coding Agent

When implementing this PRD:

1. Do not invent additional product features outside the defined scope.
2. Prefer existing shared components over creating unnecessary custom components.
3. Use shadcn/ui when an appropriate component already exists.
4. Keep the design light-mode-first and enterprise-oriented.
5. Avoid dashboard visual clutter.
6. Do not implement allocation or capacity calculations.
7. Do not infer that project count equals workload.
8. Do not restrict designer assignment based on Home Squad.
9. Derive Cross-squad status automatically.
10. Keep data access behind a service/repository layer so the mock/local backend can later be replaced.
11. Make all major portfolio views derive from the same project, designer, squad, and stakeholder data source.
12. Optimize the MVP for stakeholder demonstration and design-planning visibility, not production-grade enterprise workforce management.
