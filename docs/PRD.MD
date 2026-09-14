# Product Requirements Document

## DesignOps — MVP

**Document status:** MVP Ready for Build
**Primary user:** Design Planning Admin / Design Lead
**Primary purpose:** Stakeholder-facing portfolio and manpower visibility
**Platform:** Web application, desktop-first
**Access model:** Sign-in required; every authenticated user has Admin rights

---

# 1. Product Summary

DesignOps adalah aplikasi internal untuk membantu tim Design memetakan:

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

## Sign-in

Aplikasi memerlukan login (Supabase Auth, email + password). Akun dibuat lewat undangan dari Supabase dashboard — **public sign-up harus dimatikan di sana**. Itulah daftar aksesnya: Row Level Security memberi akses penuh ke setiap user yang terautentikasi, jadi siapa yang boleh menjadi terautentikasi adalah kontrol yang sebenarnya.

Stakeholder tetap tidak login — mereka melihat aplikasi lewat presentasi/screen sharing.

## Onboarding

Akun yang baru login dan belum memilih `design_role` (§6.1) melihat satu layar onboarding, bukan langsung ke homepage — tidak ada sidebar, tidak ada navigasi, hanya form ini sampai terisi.

```text
Full name       wajib
Department      opsional
Design role     wajib — tidak boleh dibiarkan "Not set" untuk lanjut
Team profile    tautan/pembuatan Designer atau Stakeholder record
                — WAJIB berakhir tertaut ke Designer jika Design role adalah
                  peran designer (bukan Department Head/Not set): tautkan
                  yang sudah ada, atau buat baru dengan memilih Home Squad
                — tetap opsional untuk Department Head/Stakeholder, sama
                  seperti di Settings → Profile (§6.1)
```

Field dan perilakunya identik dengan Settings → Profile — halaman yang sama, dipakai ulang, bukan alur terpisah yang bisa berbeda aturan. Bedanya hanya bingkai (layar penuh, judul "Welcome to DesignOps", tombol "Continue to DesignOps") dan dua aturan tambahan yang hanya berlaku di sini: `Design role` tidak boleh "Not set", dan jika role-nya designer, akun harus berakhir tertaut ke sebuah Designer record sebelum bisa lanjut — supaya orang yang baru di-invite sebagai designer langsung muncul di Master Data → Designers, bukan menyelesaikan onboarding sebagai "UI Designer" yang tidak muncul di picker manapun. `Home Squad` sendiri tidak wajib diisi — itu cuma salah satu dari dua cara memenuhi syarat itu, cara satunya adalah menautkan Designer yang sudah ada. Department tetap opsional, begitu juga Team profile untuk Department Head.

Tidak ada flag "sudah onboarding" yang tersimpan terpisah. Layar ini murni berdasar data: begitu `design_role` tersimpan, layar ini berhenti muncul dengan sendirinya — baik saat itu juga maupun di sesi berikutnya. Tersedia `Sign out` di layar ini untuk akun yang salah kirim undangan.

Setelah field di atas diisi dan lolos validasi, tombol "Continue" membawa ke **layar kedua** (bukan disisipkan di halaman yang sama): sebuah captcha (claw-machine game — ambil mainan yang diminta), dengan tombol "Confirm" sendiri yang baru menyimpan data — jadi validasi field terjadi di layar pertama, dan captcha jadi langkah terpisah setelahnya, bukan bagian dari form yang sama. Tombol "Confirm" tetap disabled sampai captcha diselesaikan; ada juga link "Back" untuk kembali mengubah field di layar pertama. Ini tidak memengaruhi Settings → Profile (halaman itu tetap satu layar, tanpa captcha).

## Role

Hanya satu application role:

```text
Admin
```

Setiap user yang berhasil login adalah Admin. Tidak ada perbedaan hak akses antar user.

Admin dapat:

* melihat seluruh data,
* membuat project,
* mengedit project,
* mengubah lifecycle project: Mark as complete, Put on hold, Cancel, Reopen (§10, §25),
* archive project (§25),
* delete project atau master data record — master data yang masih direferensikan diblokir, kecuali Designer dan Stakeholder yang punya `Delete anyway` (§25),
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

Future roles:

```text
Admin
Editor
Viewer
```

Saat role tersebut diperlukan, tempatnya adalah policy per-command di `supabase/schema.sql`, bukan perubahan di aplikasi. Tidak perlu dibuat UI-nya sekarang.

---

# 6.1 Profile & Identity

Setiap akun yang login punya satu **Profile**. Profile adalah akun — bukan record terpisah yang menunjuk ke akun — sehingga `Profile.id` sama dengan user id Supabase Auth.

Profile menyimpan identitas akun dan preferensi personalnya (§8.10). Email **tidak** disalin ke Profile: Supabase Auth adalah satu-satunya sumber kebenaran untuk email, dan hanya dari sana email bisa diubah.

## Hubungan Profile, Designer, dan Stakeholder

Designer (§8.1) adalah *orang* yang ditunjuk oleh data perencanaan: home squad, project assignment, squad lead. Stakeholder (§8.5) adalah *orang* di sisi bisnis: Department Head, Product Owner, Project Admin / PIC. Profile adalah *akun*. Profile dihubungkan ke salah satu dari keduanya oleh dua field opsional yang saling eksklusif:

```text
                    ┌─0..1──  Designer      (orang: squad, assignment, leadership)
auth.users  ──1:1──  Profile
                    └─0..1──  Stakeholder    (orang: department head)
(login)              (akun)
```

`Profile.designer_id` dan `Profile.stakeholder_id` boleh null di kedua arah:

* tidak semua Designer atau Stakeholder punya akun login (mereka bisa dibuat langsung di Master Data, bukan lewat undangan),
* tidak semua akun adalah Designer atau Stakeholder (misalnya manajer yang hanya membaca).

Akun yang **belum** ditautkan tetap akun yang lengkap dan berfungsi — ia hanya tidak muncul di people picker (Squad Lead, Supporting Designers, Department Head). Yang menentukan tautan mana yang berlaku adalah `design_role` (lihat di bawah): nilai `Department Head` menautkan ke Stakeholder, semua nilai lain menautkan ke Designer. Keduanya tidak pernah terisi bersamaan.

Penautan dilakukan sendiri oleh user di Settings → Profile — memilih record yang sudah ada, atau membuat satu baru untuk diri sendiri langsung dari Settings tanpa perlu berpindah ke Master Data. Satu Designer atau Stakeholder hanya boleh diklaim oleh satu akun. Mengubah `design_role` sehingga akun berpindah dari Designer ke Stakeholder (atau sebaliknya) melepas tautan yang lama; jika record lama itu masih punya project assignment, squad lead, department head, atau referensi project lain, perubahan role diblokir sampai referensi itu dipindahkan — guard yang sama dengan tombol Delete di Master Data (§25).

Saat tertaut, menyimpan Profile juga menulis `full_name` ke record Designer atau Stakeholder tersebut (mana pun yang tertaut). Sinkronisasi ini satu arah dan disengaja: record itu adalah nama yang dibaca seluruh layar perencanaan, jadi nama di Settings dan nama di Squad/Project tidak boleh berbeda. `job_title` (Designer) dan `title` (Stakeholder) tetap dikelola sendiri-sendiri di Master Data masing-masing, tidak lagi disalin dari Profile.

## Design Role vs System Role

Dua sumbu berbeda, tidak boleh digabung menjadi satu field `role`:

```text
design_role   apa yang dikerjakan orang ini
              Product Designer, UX Researcher, Design Lead, ..., Department Head
              user boleh mengubahnya sendiri

system_role   apa yang boleh dilakukan akun ini
              Admin, Member, Viewer
              user TIDAK boleh mengubahnya sendiri
```

`Department Head` adalah nilai `design_role` yang berbeda dari yang lain: ia tidak membuat akun ini seorang Designer, melainkan seorang Stakeholder (lihat di atas). Namanya sengaja sama dengan `stakeholder_type` "Department Head" yang sudah ada (§8.5) — konsepnya memang satu.

Di MVP setiap akun tetap Admin (§6). `system_role` sudah ada sekarang supaya Editor/Viewer nanti menjadi perubahan policy, bukan perubahan tipe data.

Larangan self-promotion bukan urusan UI. Kolom `system_role` berada di luar GRANT UPDATE untuk role `authenticated` (`supabase/schema.sql`), jadi database yang menolaknya — bukan form yang menyembunyikan kontrolnya.

---

# 6.2 Password Recovery

Selain mengganti password dari dalam aplikasi (Settings → Security), user yang **tidak bisa login** harus punya jalan keluar.

Rute:

```text
/forgot-password    minta link reset
/reset-password     tujuan link dari email
```

Keduanya harus bisa diakses tanpa session — itu seluruh alasan mereka ada — jadi keduanya render di luar gate login dan di luar AppShell. Layout visualnya sama dengan halaman Sign in; tidak ada desain auth kedua.

Aturan:

* Link reset dikirim lewat Supabase Auth (`resetPasswordForEmail`), tujuannya dibangun dari origin browser saat itu supaya benar di local, staging, dan production tanpa hostname yang ditulis di kode.
* Halaman konfirmasi **tidak** memberi tahu apakah email tersebut punya akun. Membocorkannya akan menjadikan form ini alat untuk menguji siapa yang bekerja di sini.
* Link kedaluwarsa atau tidak valid harus mendarat di state yang menjelaskan dan menawarkan `Request a new link`, bukan error mentah dari Supabase.
* Setelah reset berhasil, session recovery ditutup dan user diarahkan kembali ke Sign in — password barunya langsung terbukti bekerja.
* Mengganti password dari Settings → Security wajib melakukan re-autentikasi dengan password lama terlebih dulu. Tanpa itu, laptop yang sedang terbuka sudah cukup untuk mengganti password seseorang.
* Password tidak pernah disimpan di database aplikasi, di localStorage, atau di log.

---

# 7. Information Architecture

Main navigation:

```text
Overview
Timeline
Projects
People
Squads
Master Data
```

Utility navigation:

```text
Account menu
```

Footer sidebar berisi satu baris: akun. Ia terpisah dari enam destinasi kerja di atas karena mengatur orang yang memakai aplikasi, bukan pekerjaan yang diatur aplikasi.

Baris itu menampilkan avatar, nama, email, dan chevron yang menandakan ia membuka menu — bukan link. Saat sidebar collapsed, hanya avatar yang tersisa.

Settings punya sub-navigasi sendiri (§14.10):

```text
/settings           -> /settings/general
/settings/general
/settings/profile
/settings/security
```

Account menu adalah satu-satunya pintu ke Settings. Isinya: header akun (nama + email), lalu ketiga halaman Settings — `General`, `Profile`, `Security` — lalu `Sign out`. Ketiganya menunjuk langsung ke halamannya, bukan ke `/settings`, yang memang hanya me-redirect.

Selama user berada di salah satu halaman Settings, baris akun memakai state aktif yang sama dengan nav item lain, dan halaman yang sedang dibuka ditandai di dalam menu.

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

# 8.2.1 Squad Designer Membership (Shared Squad)

Fields:

```text
id
designer_id
squad_id
```

A designer's **Primary Squad** is still exactly `Designer.home_squad_id` —
unchanged from §8.1/§8.2. This table only ever records an *additional*,
explicitly shared membership, written from Teams → Squad View (§14.7). It is
deliberately independent of Project Assignment (§8.7) and of the Cross-squad
Logic (§32): sharing a designer into a squad's roster does not require a
project behind it, and a cross-squad project assignment does not, by itself,
create a row here.

A designer may have zero or many shared memberships, each in a squad that is
not already their Primary Squad — a designer is never "shared" with the squad
they already primarily belong to, and the same (designer, squad) pair cannot
be recorded twice.

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

Use `status = Inactive` if a department is retired and still referenced by historical Projects/Epics — it remains available for their rendering. Delete is only available once nothing references it (§15).

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

start_date
end_date

description

created_at
updated_at
```

`start_date` and `end_date` are `"YYYY-MM-DD"`, both ends inclusive. The
month span they imply — the one Monthly Targets (§8.8) are keyed to, and the
one Person Timeline (§14.6) draws — is **derived** from them, never stored
alongside them, so a Timeline reschedule can never leave a month field
disagreeing with the dates.

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

Lightweight, operational-planning companion to Project Monthly Target (§8.8) — not a task-management entity. See §14.2 (Timeline) and §22 (Add/Edit Project — Timeline & Planning) for where it is read and edited.

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

# 8.10 Profile

Satu row per akun Supabase Auth. Dibuat bersama akunnya, bukan saat pertama kali membuka Settings — halaman Settings tidak boleh punya state "profil belum ada".

Fields:

```text
id                        = user id Supabase Auth
full_name
avatar_url (optional)

design_role (optional)    disiplin: Product Designer, UX Researcher, ..., Department Head
system_role               otorisasi: Admin | Member | Viewer  (tidak bisa diubah sendiri)

department_id (optional)  department akun ini sendiri (§8.4)
designer_id (optional)    tautan ke Designer (§8.1), unik
stakeholder_id (optional) tautan ke Stakeholder (§8.5), unik — hanya terisi saat design_role = Department Head

language                  'en'
timezone                  nama zona IANA, default 'Asia/Jakarta'
week_starts_on            'monday' | 'sunday'

default_landing_page      'overview' | 'projects' | 'timeline'
default_timeline_view     'week' | 'month' | 'quarter' | 'year'
theme                     'light' | 'dark' | 'system'

created_at
updated_at
```

Profile **bukan** model orang kedua. Ia tidak menduplikasi Designer, Stakeholder, atau entitas master data lain — lihat §6.1 untuk hubungan dan aturan sinkronisasinya. `department_id` adalah pengecualian kecil: itu murni detail personal akun ini (dipakai untuk membuat record Stakeholder saat `design_role` = Department Head), bukan tautan ke sebuah "orang" seperti `designer_id`/`stakeholder_id`.

Preferensi disimpan di sini, bukan di localStorage, supaya ikut pindah ke perangkat berikutnya dan bisa dibaca kembali oleh aplikasi.

Jangan tambahkan: notification preference, connected account, API key, session list, device list, login history, billing. Semuanya di luar scope (§38).

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
Planning
In Progress
On Hold
Completed
Cancelled
```

Typical lifecycle: Planning → In Progress → Completed. On Hold and Cancelled
are the alternate branches, reachable from Planning/In Progress/On Hold.
Completed and Cancelled are both **terminal** — reachable through Reopen back
to In Progress, but neither advances forward on its own.

### Planning

Project sudah cukup pasti tetapi belum mulai execution.

### In Progress

Sedang berjalan.

### On Hold

Sementara dihentikan. Preserves all current allocation and timeline
information — putting a project on hold never touches its assignments,
monthly targets, or timeline.

### Completed

Selesai dan tetap tersimpan sebagai history. Set via "Mark as complete"
(§25), which records a completion date and — only when the project's own
end_date falls after that date — asks whether to keep the existing
end_date as a historical record or shorten it to the completion date. A
Completed project can be Reopened (back to In Progress) at any time; nothing
is deleted or reset by either transition.

### Cancelled

The project will not happen (or will not continue). Like Completed, it is
terminal and reachable via Reopen; unlike Completed, it carries no
completion date and no allocation-timing question, since a cancelled
project's timeline was never actually run to.

Neither Completed nor Cancelled counts toward Active Projects (§14.1), the
Projects list's default Active tab (§14.3), or the Health breakdown — see
those sections for the exact scope each one uses.

`Archived` is **not** a status — it is the independent `is_archived` flag
described in §25. A project can be any of the five statuses above, archived
or not, independently.

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

## 13.1 Shared Squad Membership (Squad View)

The Home Squad / Owner Squad / Cross-squad rules above are entirely derived
and unchanged by this section — no manual override exists for them (§32).

Alongside that, a Designer may also be explicitly **shared** into one or more
additional squads from Teams → Squad View (§14.7, §8.2.1). This is a second,
independent concept:

```text
Primary Squad     Designer.home_squad_id — exactly one, always
Shared Squad(s)   Squad Designer Membership rows — zero or many, explicit
```

A Primary Squad never shows a "Shared" badge for that designer; every Shared
Squad does. Moving a designer changes `home_squad_id` (their Primary Squad)
and drops any now-redundant Shared membership in the new squad; sharing only
ever adds a Shared membership and never touches `home_squad_id`. Neither
action is driven by, or drives, a Project Assignment — see §32 for why the
two stay separate.

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
Designers
Unassigned Projects
```

**Active Projects** = Status ∈ {Planning, In Progress} only. `On Hold`, `Completed`, and `Cancelled` are excluded from the Active count. This is a narrower scope than the Projects list's own default Active tab (§14.3), which also includes On Hold — the two "active" definitions are deliberately different: this one is the headline KPI, that one is a default list view.

**Completed, Cancelled, and Archived projects are hidden from Overview by default.** They remain fully accessible via filters on the Projects page (§14.3) and are never deleted.

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

### Project Health

Simple summary:

```text
On Track  8
At Risk   3
Blocked   1
```

Tidak perlu pie chart besar. Scope is broader than Active Projects: every
non-archived, non-Completed, non-Cancelled project (so On Hold projects are
included here even though they aren't part of the Active Projects count
above).

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

Timeline is one Gantt chart across four time scales, always visible as a segmented control in the timeline toolbar — never folded into a dropdown, because which scale you are reading is part of reading the chart:

```text
[Week] [Month] [Quarter] [Year]
```

**Year** is the default on load — its columns are months, which is the portfolio view. **Quarter** has week columns grouped by month, **Month** and **Week** have day columns. Switching scale keeps the active filters. The scales share one sticky Project column, one set of filters, and one visual language: changing scale must not feel like entering a different screen.

Scales are a continuum, not separate screens. Zoom (the canvas utility dock, Ctrl/Cmd + wheel, trackpad pinch) moves within a scale; the timeline extends itself as you scroll toward either edge.

The page is the chart. The timeline card claims the height the page can give it and holds its own toolbar; nothing else competes for the screen (§29 hierarchy: title, canvas, project names, durations, navigation, then filters).

### Toolbar vs. canvas utilities

The toolbar carries only the four things a Design Lead reaches for constantly while planning: **Search**, **Filter**, **navigate time**, **switch scale**. Nothing else belongs there — a toolbar of a dozen equal-weight controls has no primary action.

Time navigation is one cluster, not three controls spread across the row: `Today` sits with the stepper it acts on, and the period readout is only as wide as the selected scale needs, so the arrows stay beside the period instead of at arm's length from it.

**The period readout is never truncated.** It is primary information — `September 20…` is not a period. The readout reserves a minimum width (one floor for Week, whose range labels are half again as wide; one shared by Month / Quarter / Year, so switching between them moves nothing) and grows past it if a label runs long, rather than clamping to a fixed box and ellipsising. Where a scale's natural label would need a box no other scale comes close to filling, the label is shortened deliberately — `Sep 2026`, not a cut-off `September 2026`.

Everything that acts on the canvas rather than on what the canvas shows — **Fit**, **zoom out / in**, **Legend** — lives in a small floating **utility dock** in the bottom corner of the chart itself. It is one reach away, stays visually quiet (ghost controls on a bordered card surface), and does not compete with the primary controls above. The dock is absent while the empty state is showing: there is nothing to fit, zoom or read a legend for.

### Portfolio view (Year / Quarter)

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

Default horizon: approximately 6 months, with Previous / Next / Today navigation.

### Operational view (Month / Week)

The Design Lead's operational-planning view. Answers "what is this project focusing on this week?" — it is **not** a task-management feature (no task status, assignee, subtasks, checklist, story points, sprint planning, Kanban, task comments, per-task priority, per-task workload, or completion percentage; see §8.9 and §38).

Header groups week columns under their month, and clearly marks a transition into a new month or year:

```text
Timeline

Search projects...   Filter · 2                     Today  ‹ Q3 2026 ›
Squad A ×  At Risk ×                          Week  Month  Quarter  Year

Q3 2026
Sep 7   Sep 14   Sep 21   Sep 28

   ...project rows...
                                                 Fit │ −  + │ Legend
```

Previous / Next step by the selected scale — a week in Week, a month in Month, a quarter in Quarter, a year in Year — and the readout between them names the period the same way: `7 – 13 Sep 2026`, `Sep 2026`, `Q3 2026`, `2026`.

The **Week** scale is the finest the product offers. Day columns under a project bar is where a Design Lead plans the week itself, and it is the scale where the granular layer below each project bar — Weekly Focus today — earns its room. Deliberately no Day scale: a design project is scheduled in weeks and months, and an hour axis under a four-month bar answers no planning question (`docs/DECISIONS.md`).

The Project column is identical at every scale (sticky, same fields), 280–320px wide by default, and can be widened or narrowed by dragging the divider between it and the chart:

```text
Trade Finance Platform Revamp
[P1] Squad A · Malik
```

The project **name** is the strongest text in the row and wraps to two lines before anything is cut — identifying a project matters more than reserving empty chart space, and `Trade Finance Platform Rev…` identifies nothing. The metadata line under it (priority badge, Owner Squad, Design Lead) stays small and muted, one line, truncated. Rows are roomy enough to read at a glance: ~56px per row with a ~28px bar, growing only when a row carries a second lane.

Below the Year scale, each Weekly Focus item renders as its own one-week band stacked underneath its project's bar, on the same row — a quiet neutral wash with its title in it, not a third bar style competing with Committed/Tentative. Clicking one opens a dialog with the full week detail (phase + that week's full Weekly Focus list) — do not navigate away from Timeline to inspect it. Weekly Focus bars are deliberately absent at Year scale, where a week is too narrow to read and the portfolio should stay one bar per project.

A Weekly Focus bar can be dragged to another week; it always snaps to that week's Monday, and it cannot be resized — a focus is one week by definition (§8.9).

### Interactions

Required:

* hover project
* click project → Project Detail
* horizontal timeline navigation (Today / Previous / Next) at every scale, stepping by that scale
* search and filtering
* switching scale
* zoom from the canvas utility dock, and Ctrl/Cmd + wheel / trackpad pinch
* **Fit** — put the projects currently on screen into one frame: the coarsest scale their whole span still needs, at natural zoom, centred on that span. A secondary action in the canvas utility dock, useful right after a filter change, a scale switch or a long scroll
* **drag a project bar to reschedule it**, and **resize either end** to change its start or end date — both snap to whole days and write straight back to the project's `start_date` / `end_date`
* click a Weekly Focus bar → Weekly Focus detail dialog (no navigation away)

Completed and Cancelled projects are **read-only** on the Timeline: their `end_date` is a historical record written by Mark as complete (§25), and a stray drag must not rewrite it.

Rescheduling never cascades. There are no dependencies between projects, so nothing else moves when a bar moves (§30). Monthly Target rows whose month falls outside the new range are **kept**, not deleted — they become invisible until the range covers them again, and the Edit wizard remains the only place that drops them, with its existing confirmation.

### Filters

Filtering is a secondary act on a chart you are looking at, so only two controls are permanently visible:

```text
[ Search projects... ]  [ Filter ]
```

**Search** matches project name, Owner Squad, Department, Epic, and any designer assigned to the project — a quick lookup, not a second filter surface.

Everything else lives in the **Filter** popover, which lists one control per dimension and applies immediately (no staged Apply — the chart is right there to read the result off):

```text
Filter projects

Squad · Priority · Status · Department · Epic · Health · Designer

Project visibility
[ ] Include archived projects

Clear all                                                    Done
```

The Filter button carries the count of active dimensions (`Filter · 2`), and each one also appears under the toolbar as a removable chip. Chips show only when something is active, stay visually secondary, and `Clear filters` resets everything including the search query.

Changing scale preserves active filters.

**Completed, Cancelled, and Archived projects are hidden from Timeline by default at every scale.** Use the Status filter (and `Include archived projects`) to bring them back into view.

### Current time indicator

A now-line marks the present instant at every scale, labelled `Today` in the date header so it names itself instead of leaving the reader to decode a coloured column, and the column containing today is highlighted. Both use the brand accent, never the destructive red — red on this screen means Blocked. Keep both subtle. Non-working days (weekends) are muted at the scales where individual days are visible.

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

A bar reads as **duration + commitment**, in one neutral brand hue: Committed is a solid fill inside a solid border, Tentative a light fill inside a dashed one. The difference has to be obvious without the legend (§31 — never colour alone).

**Health is separate from the bar's own state, and exception-driven.** A bar does not take the colour of its health: a portfolio of strong green bars says nothing, and it drowns out the two states worth reacting to. Instead, At Risk and Blocked each show a small dot at the start of their bar (Blocked strongest, At Risk medium); On Track carries no marker at all. Full health is always one hover away in the bar tooltip, which reads: project name, start and end date, duration, commitment, health.

Avoid excessive saturated colors, rainbow phase coloring, excessive pills, and dense borders. Grid lines stay minimal — period boundaries only, no row rules, and the body's lines lighter than the header's. The Timeline (project rows and grid) must stay the dominant visual element on the page — filters, the scale control and the legend stay restrained.

### Legend

One click away, not permanently parked above the chart: a `Legend` button in the canvas utility dock opens a small popover covering Committed / Tentative / Weekly focus and the two health exceptions. Commitment should already be readable from the bars themselves; the legend exists for the parts that can't be inferred.

### Responsive behavior

Desktop-first. Every scale requires horizontal scrolling — keep the Project column sticky and let the time columns scroll. Do not compress columns until their text becomes unreadable; zoom out to a coarser scale instead.

---

# 14.3 Projects

## Purpose

An operational workspace, not only a directory: plan, assign, and track
design projects across the team, in whichever of three view modes fits the
task at hand.

### Project lifecycle and its display labels

The stored Project Status enum is unchanged (§10): `Planning`, `In
Progress`, `On Hold`, `Completed`, `Cancelled`. Every screen that renders a
status (Projects, Overview, Timeline, People) now renders a display label
instead of the raw value — `Planning` reads as **To Do** and `Completed`
reads as **Done**; `In Progress`, `On Hold`, and `Cancelled` keep their own
name as their label. This is a display-only relabeling (no migration, no
schema change) — filters, selectors, and every other piece of status logic
still match on the underlying enum values.

### View modes: Board / List / Table

A segmented control above the filter toolbar switches how the same
filtered project set renders:

```text
Board   List   Table
```

**Board** is the default, and the primary operational view. **List** and
**Table** are equally available, and the choice persists locally
(`localStorage`) across visits, the same way the sidebar's collapsed state
already does — except an Overview drill-down link (`?status=`, `?health=`,
`?designLead=`) always lands on Table, since Table is the one view whose
Status filter is always visible and freely combinable.

View mode and lifecycle status are unrelated axes: switching views never
changes which projects are visible, only how they render. The old `Active |
Completed | All` lifecycle tabs are gone — Board's columns and List's status
groups already scope by lifecycle, and Table shows every status with the
Status filter always reachable.

#### Board

Three fixed columns, mapping to three of the five stored statuses:

```text
To Do          (Planning)
In Progress    (In Progress)
Done           (Completed)
```

Each column header shows its label and a live project count. `On Hold` and
`Cancelled` projects are **never** a Board column (per the "do not add an
excessive number of workflow columns" rule below) — but they are not hidden
from the page: whenever such projects exist in the current filtered set, a
small strip above the columns shows their counts (e.g. "On Hold · 3 ·
Cancelled · 1"), each a link that switches to Table/List pre-filtered to
that status. The Status filter itself also stays visible and usable on
Board, for anyone who wants to inspect them directly.

A card shows Project Name, Epic/Department, Priority, a day-level Timeline
range, Design Lead (or an "Unassigned · Assign" affordance), Designers (an
avatar group, or a "No designer assigned" affordance), and Health — Health
only on In Progress (§22: a newly created or already-finished project has
no ongoing execution to assess). A Done card is deliberately quieter:
Project Name, Team, and "Completed <date>" only — no Priority, no Health, no
resource-assignment affordance, since a completed project no longer needs
day-to-day tracking (§25).

**Lifecycle transitions.** Only these moves are legal, whether by drag or by
the card's own explicit button (drag is never the only way — see
Accessibility, §29):

```text
To Do        -> In Progress   (gated: at least one designer assigned)
In Progress  -> Done          (opens the same "Mark as complete" flow as Project Detail)
Done         -> In Progress   (reopen)
```

`To Do -> Done` direct and `Done -> To Do` direct are not legal moves —
both bypass the "started" state. Every legal transition also has an
explicit, non-drag control on the card: "Start project" (disabled with an
explanatory tooltip when the Start gate isn't met), "Mark done", and
"Reopen". Dragging a card to an illegal target, or to In Progress without
a designer assigned, is rejected with an explanation and does not change
anything — see §10.3 for the Start gate itself.

A Done column beyond a small number of recent cards caps itself with a
"View all completed" link into Table/List, pre-filtered to Done — the same
mechanism the On Hold/Cancelled strip uses, so the board never grows
unusably tall (§9, §18 of the originating design brief).

#### List

The same projects, grouped by status for high-density scanning — one
section per status actually present in the filtered set (To Do, In
Progress, On Hold, Done, Cancelled, in that order), each with a header
(label + count) and a dense row per project: name, epic/department,
priority, timeline, Lead/Designers (or Assign), Health (In Progress only),
and the same explicit lifecycle action as the Board card. Unlike Board, On
Hold and Cancelled sections appear here whenever such projects are present
— List's purpose is scanning everything, not Board's narrower operational
focus.

#### Table

The detailed, portfolio-management view — every status, always. Columns:
Project, Epic, Department, Priority, Status, Owner Squad, Design Lead,
Designers, Timeline, Health. Design Lead stays the existing inline
assignment control; Designers is a new column (an avatar group of
Supporting Designers, opening the same Assign design team dialog Board and
List use). Sort, search, and filters all work exactly as before.

### Filters

A compact toolbar sits directly above the content (no large standalone filter card), sharing one row with the Board/List/Table switcher:

```text
Board | List | Table          Search projects...   Filters
```

Search matches project name, Epic, Department, Owner Squad, and Design
Lead. Every dataset filter — **Needs Allocation** (a quick toggle for
projects with no designer assigned at all, Lead nor Support: the same
predicate that gates "Start project"), **Status**, **Priority**, and
**Department** — lives inside the single "Filters" panel rather than as its
own standalone toolbar control, so the toolbar never shows the same filter
twice (see `docs/DECISIONS.md`: global filter toolbar simplification).
Status and Priority apply immediately and are multi-select (e.g. Planning +
In Progress at once). Needs Allocation is a distinct concept from the
existing "Design Lead: Unassigned" filter (Lead-only, and what Overview's
"Unassigned Projects" KPI already links to) — the two coexist and can
produce different result sets.

"Filters" opens one panel for every dimension:

```text
Needs Allocation, Status, Priority, Department   (quick — apply immediately)
Epic, Owner Squad, Design Lead, Timeline, Health, Show archived   (staged)
```

The quick fields apply immediately; the rest are staged — changes take
effect on "Apply" (or are cleared immediately by "Reset"). Owner Squad and
Design Lead are searchable. The Filters button's badge counts every active
dimension across both groups (`Filters · 3`), since it is now the toolbar's
only indicator of active filter state.

**Timeline** buckets a project's start/end date against today: `Active now` (today falls within the range), `Upcoming` (starts later), `Past` (already ended). See `docs/DECISIONS.md` for why this is a simple bucket rather than a full date-range picker.

Active filters (beyond Search) show as a row of small removable tokens directly under the toolbar; the row is absent entirely when no token would appear (a Search query alone does not produce one). Clearing everything is the shared toolbar's single "Clear filters" action — see §29.1.

### Default sort (Table)

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

Creating a project never requires resource allocation to be complete —
Design Lead and Supporting Designers are optional at creation (§20, §23);
a project is always creatable with neither set, and always enters **To
Do**. Assigning a designer to a project never, by itself, changes its
status — starting a project is a separate, explicit action gated on §10.3
below.

### §10.3 Starting a project

Before a project can move from To Do to In Progress, at least one
responsible designer must be assigned — a Lead or a Support designer, both
being the same underlying "Designer" entity and either a fully valid
"someone is responsible for this" state on its own. If the user tries to
start a project with no one assigned, the move is rejected with:

```text
Unable to start project
Assign at least one designer before starting this project.
[ Assign designer ]
```

### Completed, Cancelled, and Archived Projects

Unlike Overview and Timeline, the Projects page can show every status and
archived projects too — reachable via List/Table, the Status filter, the
Board's secondary strip, and the Show archived toggle, not shown by default
alongside active work on the Board. Deleting a project (§25) is always
available from this list's row menu as well as from Project Detail.

---

# 14.4 Project Detail

A Project Control Page, not a database record dump — scannable in a few
seconds, not read field by field. Project Detail should quickly answer:

```text
What project is this?
What is its current status?
Is it healthy / on track?
Who owns it?
Who is working on it?
What is its timeline?
What needs attention?
Is it still active or already completed?
```

One primary content surface (Overview / Design Team / Timeline & Monthly
Targets / Weekly Plan, separated by subtle dividers and section headings,
not stacked cards) plus a lightweight "Project Details" footer for metadata.

## Header

```text
← Projects

Trade Finance                                          [Edit]  [•••]

P1   In Progress   ● On Track   Committed
Sep 2026 — Dec 2026
```

The title is the strongest element on the page. Priority, Status, Health,
Timeline Confidence, and the month range sit directly under it as compact
indicators — badges only where an attribute genuinely benefits from strong
visual distinction. Health is never color alone: the dot always sits beside
the word ("On Track"), never in place of it.

**Edit** is the one primary action. Every other lifecycle action lives
behind **•••** (the overflow menu), contextual on the project's current
status — see §25 for exactly which actions appear in which state.

---

## Overview

```text
Epic
Trade Finance

Department
Wholesale Banking

Product Owner
Sarah Wijaya, Ahmad Fikri

Department Head (ⓘ)
Budi Santoso

Project Admin / PIC
Nadia Putri
```

Empty values are worded consistently across this whole page: `Not set` for
missing configuration (Epic, Department, Owner Squad), `Not assigned` for
missing people (Department Head, Product Owner, Project Admin/PIC, Squad
Lead, Project Design Lead) — never a bare `–`, `None`, or `Unassigned` mixed
in. The Department Head's "snapshot at creation, may differ from the
department's current head" caveat is an info-icon tooltip next to the label,
not permanent body text under the value.

---

## Design Team

```text
Owner Squad
Squad A

Squad Lead
[avatar] Dimas

Project Design Lead
[avatar] Malik

Supporting Designers
[avatar] Sarah
[avatar] Raka
+ Add designer
```

Squad Lead and Project Design Lead both show a person's avatar, not just a
name — this section should read as people, not generic metadata. If
designer comes from another squad:

```text
Raka
Support
Cross-squad
```

If no Project Design Lead is assigned, show `Not assigned` plus an inline
`Assign` action (not an omitted field) — the Assign action is visually
secondary to the name it sits beside.

---

## Timeline & Monthly Targets

A scannable, project-level summary — month, phase, and outcome per month,
not a full Gantt chart (the detailed timeline is the Timeline feature,
§14.2). Example:

```text
Sep          Oct          Nov          Dec
Discovery    Design       Validation   Handover
```

Empty state is actionable, not a passive one-liner:

```text
No monthly targets yet

Break the project timeline into monthly outcomes so the team can see
what is expected each month.

[+ Add monthly target]
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

## Project Details

A lightweight footer below the main content surface, not a large card —
typography stays subtle since this information is secondary.

```text
Created Aug 1, 2026
Last updated Sep 10, 2026
```

If data is old, a subtle warning sits alongside it:

```text
Needs review
```

Suggested threshold:

```text
14 days without update
```

This is optional but recommended, and only ever shown for a project that is
still Planning or In Progress — a Completed, Cancelled, or On Hold project
is never flagged as needing review.

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

Important MVP feature. Month granularity only — the finer scales on the portfolio Timeline (§14.2) do not apply here; Person Timeline is about overlap across projects, which reads better at month scale. Its months are derived from each project's `start_date` / `end_date` (§8.2), so day-level dates never leak into this view.

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

# 14.7 Squads

## Purpose

Menunjukkan struktur organisasi Design Team.

### Squad Overview

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

A squad with zero members shows "No designers · Add" in its row. **Add** opens a dialog to search and multi-select Active designers and assign them to this squad in one step, without leaving Squads. Since Home Squad is a single required field per Designer (§8.1), selecting a designer here moves them out of whichever squad they currently belong to — the dialog lists each candidate's current squad so this is never a surprise. Squad Lead stays a link out to Master Data (unchanged).

### Filters

The Table/Squad view switcher shares its row with Search and a single
`Filters` button (§29.1) — Staffing (derived from member count: Has
designers / No designers), Lead (assigned / unassigned), and Status all
live inside that one panel rather than as separate standalone toolbar
controls. No Department filter — `Squad` has no `department_id` in the
domain model (§8.2). Active filters show as removable tokens under the
toolbar, same as every other screen.

### Squad View

A second, kanban-style view of the same squads, switched via a Table/Squad
toggle in the toolbar (default: Table). Squads render as fixed-width columns
in one horizontal, non-wrapping row — never onto a second row — each showing
its Squad Lead, its Designers (Primary members plus any Shared members,
§13.1), and its owned Projects (collapsed to a count, expandable).

Designers are dragged between squad columns to reallocate them; dropping one
on another squad always asks **Move** (changes their Primary Squad) or
**Share** (adds a Shared membership, keeping their Primary Squad) before
anything is written — a drop never mutates membership silently. Clicking a
designer opens a Designer Details sheet (Overview / Squads / Projects /
About) rather than navigating away, so the board stays in view.

Table View's own behavior, filters, and Master-Data-only editing are
unchanged — Squad View is an additional way to read and reallocate the same
structure, not a replacement.

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

# 14.10 Settings

Navigasi utama:

```text
Settings
```

Ada di area utility footer sidebar, bukan di grup Planning atau Administration (§7).

Sub-navigasi: rail vertikal di sebelah konten pada layar lebar, dan baris underline yang sama seperti Master Data pada layar sempit.

```text
General
Profile
Security
```

`/settings` mengarahkan ke `/settings/general`.

## Aturan visual

Kolom konten dibatasi lebarnya (~2xl), tidak melebar mengikuti monitor — ini form, dan input yang membentang 32 inci lebih sulit dipakai, bukan lebih lega.

Setiap bagian adalah judul + deskripsi + field, dipisah `Separator`. **Bukan** kartu per bagian: lima kotak bertumpuk akan membuat satu kolom form terbaca sebagai lima halaman (§29).

## General

```text
General
Manage your default preferences across DesignOps.
```

Section `Regional`:

```text
Language          hanya English yang bisa dipilih
Timezone          default Asia/Jakarta
Week starts on    Monday | Sunday, default Monday
```

Bahasa Indonesia tetap terlihat di dropdown, dalam keadaan disabled, dengan penanda `Coming soon`. Gunakan warna muted — bukan warna warning atau error; tidak ada yang salah, hanya belum siap. Jangan membuat terjemahan parsial, dan jangan memperlakukan `'id'` sebagai bahasa runtime yang didukung.

Section `Workspace defaults`:

```text
Default landing page     Overview | Projects | Timeline, default Overview
Default timeline view    Week | Month | Quarter | Year, default Month
```

`Year` ikut ditawarkan karena Timeline memang punya skala itu (§14.2) — preferensi yang tidak bisa menyebut skala yang ada bukan preferensi yang lengkap.

Section `Appearance`:

```text
Theme    Light | Dark | Match system, default Light
```

## Bagaimana preferensi dipakai

Nilai yang disimpan selalu kode stabil (`'overview'`, `'monday'`), tidak pernah label yang tampil.

```text
timezone                Timeline membaca batas hari dan penanda Today dengan zona ini
week_starts_on          kolom pertama setiap date picker
default_landing_page    tujuan setelah masuk aplikasi
default_timeline_view   skala saat Timeline dibuka
theme                   kelas tema pada dokumen
```

Urutan prioritas untuk Timeline:

```text
pilihan eksplisit pada sesi ini
-> preferensi tersimpan
-> default aplikasi
```

`week_starts_on` **tidak** menggeser kolom minggu di Timeline. Project Weekly Focus selalu tercatat pada hari Senin (§8.9) dan dijaga oleh constraint database, jadi kolom Minggu-mulai-Minggu akan memotong setiap band focus menjadi dua.

## Profile

```text
Profile
Manage your personal information and identity across DesignOps.
```

```text
Profile photo             inisial dari nama; belum ada upload
Full name                 wajib
Department                opsional — wajib diisi dulu jika mau Design role = Department Head
Design role                opsional
Designer record           tautan ke Designer, atau buat baru langsung dari sini (§6.1)
  — atau, jika Design role = Department Head —
Stakeholder record        tautan ke Stakeholder, atau buat baru langsung dari sini (§6.1)
Email                     read-only
Access level              read-only
```

"Team profile" menampilkan salah satu dari dua picker di atas, tergantung Design role yang dipilih: picker Designer untuk semua role kecuali Department Head, picker Stakeholder untuk Department Head. Keduanya menawarkan record yang sudah ada (dan belum diklaim akun lain) untuk ditautkan, atau membuat record baru untuk akun ini saat itu juga — tidak perlu berpindah ke Master Data. Mengubah Design role sehingga berpindah dari satu sisi ke sisi lain melepas tautan lama itu; jika record lama masih dirujuk di tempat lain (project assignment, squad lead, department head, project), perubahan diblokir sampai rujukan itu dipindahkan (§6.1, §25).

Email read-only dan tidak boleh diubah dari sini sampai ada alur verifikasi email yang benar (§38). Access level ditampilkan sebagai fakta, bukan sebagai kontrol yang di-disable.

## Security

```text
Security
Manage your password and account security.
```

Hanya satu section: `Password` — Current password, New password, Confirm new password. Minimal 8 karakter. Field dikosongkan setelah berhasil.

Jangan tambahkan sekarang: 2FA, passkey, security key, daftar session, manajemen device, login history (§38).

## Form behaviour

Semua form Settings memakai save eksplisit:

```text
Save changes / Saving…
Change password / Updating…
```

Tombol mati sampai benar-benar ada yang berubah, tidak bisa disubmit dua kali, isian tidak hilang saat request berjalan, sukses dikonfirmasi toast (§29.2), gagal dijelaskan inline. Tidak ada auto-save.

Halaman Settings tidak boleh menampilkan nilai default lalu mengoreksi dirinya sendiri setelah data datang — preferensi sudah ada di cache sebelum layar ini render (§34).

---

# 14.11 Menampilkan user yang sedang login

Di setiap people picker, record orang milik user yang sedang login ditandai:

```text
[DA] Dimas Aditya (Me)
     Senior Product Designer

[AP] Andi Pratama
     Product Designer
```

Aturan:

* `(Me)` adalah **sufiks**, bukan pengganti nama. Squad lead bernama "Me" tidak bisa dibaca orang berikutnya yang membuka record itu.
* Tidak ada user "Me" sebagai record, pseudo-designer, atau opsi hardcoded. Nilai yang disimpan selalu id Designer yang sebenarnya.
* User yang sedang login tidak disuntikkan ke dalam daftar. Ia ada di sana karena ia memang seorang Designer, sama seperti yang lain.
* Logika `(Me)` tinggal di satu helper bersama, tidak diulang per layar.

Picker orang menampilkan avatar, nama, dan satu baris sekunder (job title) — cukup untuk membedakan dua orang, tidak lebih.

Picker yang memakai aturan ini: Squad Lead (Master Data → Squads), Project Design Lead dan Supporting Designers (Add/Edit Project), aksi inline `Assign` untuk Design Lead, dan dialog `Add designers` di Squads.

---

# 15. Master Data — Designers

Admin can:

```text
Create
Edit
Deactivate
Delete
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

Use `Active` / `Inactive` to retire a designer that is still connected to historical projects — an Inactive designer remains visible wherever that history references them (past assignments, People history).

**Delete** permanently removes a designer, but only when nothing currently references them: no Project Assignment row (Lead or Support, on any project regardless of that project's own status or archive state) and no Squad's Squad Lead. If either is true, Delete is blocked with a message naming what's still using it — deactivate instead. This guard is what keeps historical Project context from ever breaking (docs/DECISIONS.md); it is the same rule for every Master Data entity in §15–19 and for Project itself (§25).

The row that is the signed-in account's own Designer (`Profile.designer_id`, §6.1) reads `[Name] (Me)`, matching every other person picker in the app (docs/PRD.MD §14.11), and its **Delete** action is disabled outright — an account can't delete the record standing in for itself. This is separate from and in addition to the usage guard above: it applies even to a designer with zero assignments.

A **Verified** badge sits next to any row that some account has claimed via `Profile.designer_id` (§6.1) — i.e. someone was invited, signed in, and completed Onboarding into this record, rather than the row being created directly here in Master Data. Unverified is the normal state for a designer added ahead of that person's invite; it is not an error or a warning. Force-deleting a Verified row via `Delete anyway` also forces the claiming account back through Onboarding — see §25.

---

# 16. Master Data — Squads

Fields:

```text
Squad Name
Squad Lead
Description
Status
```

Use `Active` / `Inactive` (matching Designers, §15) to retire a squad still connected to historical projects — an Inactive squad remains available wherever historical Project data references it as Owner Squad. **Delete** is blocked while any Designer has this squad as their Home Squad or any Project references it as Owner Squad.

Members do not need to be manually maintained twice.

Squad members are derived from:

```text
Designer.home_squad_id
```

This still describes only a designer's **Primary Squad** membership. A
designer may additionally hold **Shared** squad memberships (§8.2.1, §13.1),
managed from Teams → Squad View rather than here — Master Data → Squads
continues to manage Primary Squad only (Add member / Manage members below).

## Managing members

Membership is still never stored on the Squad — but it is edited from here,
rather than only from the Designers tab. Every action below writes
`Designer.home_squad_id` (or `Squad.lead_designer_id`); nothing introduces a
second record of who is in a squad, so the member count, the Designers tab,
Squads, People and Overview all follow the same change without being updated
separately.

Row actions:

```text
Edit
Add member
Manage members
Deactivate
Delete
```

**Add member** opens a searchable multi-select of Active designers who are not
already in this squad, each listed with their job title and the squad they are
in now. Because Home Squad is a single required field (§8.1), every selection is
a **move** — the dialog names the designer's current squad on their row and
states the consequence for the actual selection before the user confirms.
Confirming shows `N designers added to <Squad>`.

**Manage members** lists the squad's current members — avatar, name, job title,
and a `Squad Lead` badge on the lead. Each member has:

```text
Make Squad Lead  (or Remove as Squad Lead, for the current lead)
Move to another squad
```

There is no *Remove from squad*: a designer cannot exist without a home squad
(§25), so leaving a squad always means joining another one, and the move step
requires a destination. `Move to another squad` is unavailable when no other
Active squad exists.

**Squad Lead protection.** A Squad may have no lead (§8.2), so a lead can be
moved out — but never silently. Moving the lead of a squad states the impact
first and, on confirmation, sets that squad's Squad Lead to Unassigned rather
than leaving it pointing at someone who is no longer a member. This applies in
both directions: moving this squad's lead away, and adding someone who leads the
squad they are coming from.

**Member count.** The `N designers` cell in the Squads table opens Manage
members. Only the count is interactive — the row itself is not clickable. A
squad with no members shows `0 designers · Add member` instead, matching the
`No designers · Add` treatment Squads already uses (§14.7).

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

Use `Active` / `Inactive` to retire a department still connected to historical data — an Inactive department remains available wherever historical Project data references it. **Delete** is blocked while any Epic or Project still references it.

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

Use `Active` / `Inactive` to retire an epic still connected to historical projects — an Inactive epic remains available wherever historical Project data references it. **Delete** is blocked while any Project still references it.

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

Use `Active` / `Inactive` to retire a stakeholder still connected to historical data — an Inactive stakeholder remains available wherever historical Project data references them. **Delete** is blocked while any Department still names them as its head, or any Project still references them as a department-head snapshot, Product Owner, or Project Admin/PIC.

Same **Verified** badge as Designers (§15), driven by `Profile.stakeholder_id` (§6.1) instead of `Profile.designer_id`, including forcing the claiming account back through Onboarding on `Delete anyway` (§25).

---

# 20. Create Project User Flow

Use a lightweight 4-step flow.

```text
Add Project

1. Project Context
        ↓
2. Timeline & Planning
        ↓
3. Design Team
        ↓
4. Review
        ↓
Create Project
```

## Wizard shell (all four steps)

The page is: title + one-line description + `Cancel` (header), the stepper, the
step's content, and the navigation footer. No step repeats its own name as a
heading — the stepper already says where the user is.

**Stepper.** Three visually distinct states, so the row is never four equal
items: completed (check), current (the one filled marker, primary color),
upcoming (neutral). A step is clickable once it has been reached; steps beyond
what the entered data supports stay inert, so the stepper cannot skip a
required field that `Next` would have stopped at. Going backward is always
allowed.

**Step content.** Each step is a set of named sections rather than one long
field list. A section states its purpose on the left and holds its controls on
the right, separated from the next section by a single rule — not by a card
each. Below ~1024px the two columns stack, section text above controls.

**Footer.** `Back` on the left, `Next` (or `Create Project` / `Save Changes` on
Review) on the right, pinned to the bottom of the content area so it is not
something to scroll for on a long step. `Cancel` is not repeated here.

**Validation.** No permanent list of missing fields. Requirements are marked on
the field (`*` for required, `Optional` where it helps), and a field states its
own problem under itself once the user has tried to continue past that step.
`Next` stays enabled and explains rather than sitting dead — pressing it is
what reveals what is missing.

---

# 21. Add Project — Step 1: Project Context

Three sections:

```text
Project Details      Project Name *
                     Epic *              Department *
                     Description

Ownership            Product Owner *
                     Project Admin / PIC
                     Owner Squad *

Project              Priority *          Status *
Classification       Timeline Confidence *
```

Department Head is shown, auto-filled and read-only, under the Department
field it is derived from.

All organizational selectors must come from Master Data.

Product Owner and Project Admin can support multiple selections, and both are
searchable pickers rather than a permanently expanded list of every
stakeholder: the roster opens from the field, and only the chosen people stay
on screen, each removable.

**Project Health is not collected when creating a project.** A project with no
work behind it yet has no evidence of being On Track, At Risk or Blocked, and
asking for one produces a health value that means nothing. It is first assessed
from Edit Project (§25), where the field does appear. The stored value of a new
project is the first Health value; see `docs/DECISIONS.md`.

**Department Head is not independently selected.** It is auto-filled from the selected Department's current `department_head_id` (Department Master Data, §8.3/§17) and displayed read-only. The resulting value is stored on the Project as a snapshot (§8.6) at save time — it does not change later if the Department's head changes.

If Epic is linked to Department, selecting Epic may prefill Department.

However the UI should still clearly show Department.

---

# 22. Add Project — Step 2: Timeline & Planning

Fields:

```text
Start Date *
Target End Date *   (stored as end_date)
```

Both are day-level dates (§8.2), inclusive. After selecting the timeline,
generate one month row per month the range spans — the months are derived
from the dates, not entered separately.

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

Read-only. This step exists to catch a wrong Epic or a slipped end date before
the project is created, so it shows values, not controls.

Summary sections, named after the sections they came from, each with its own
`Edit` action that returns to the step that owns it:

```text
Project Details            Edit    Project Name, Epic, Department,
                                   Department Head, Description

Ownership                  Edit    Product Owner, Project Admin / PIC,
                                   Owner Squad

Project Classification     Edit    Priority, Status, Timeline Confidence
                                   (Project Health only when editing, §21)

Timeline & Planning        Edit    Start Date, Target End Date,
                                   monthly target summary, Weekly Focus

Design Team                Edit    Design Lead, Supporting Designers
```

Example:

```text
Project Details                                             Edit

Project Name                        Epic
Trade Finance Platform Revamp       Trade Finance

Department                          Department Head
Wholesale Banking                   Budi Santoso
```

If no Design Lead was selected, show `Design Lead: Unassigned` instead — this is a valid state, not an error.

Show monthly target summary. Weekly Focus is shown only when the project has any.

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
Squads
```

Example:

If Sarah removed from Trade Finance:

People view must immediately stop showing Trade Finance under Sarah.

If Department is changed on an existing Project, Department Head is re-derived from the new Department and the stored snapshot (§8.6) is updated to match.

---

## Project Lifecycle Actions

From Project Detail's overflow menu (§14.4), contextual on the project's
current Status:

```text
Planning / In Progress:  Mark as complete · Put on hold · Cancel project
On Hold:                 Resume project · Mark as complete · Cancel project
Completed / Cancelled:   Reopen project
```

**Mark as complete** opens a confirmation with a completion date (defaults
to today, editable) and sets Status to Completed. If the project's own
`end_date` falls after the chosen date, a warning names how many
designers are assigned and offers a choice: **keep** the existing
`end_date` as a historical record, or **end** it by shortening `end_date`
to the completion date. Neither choice ever touches Project Assignment
rows — there is no per-assignment date to change (docs/DECISIONS.md).

**Put on hold** sets Status to On Hold immediately — no confirmation, and no
change to assignments, monthly targets, or timeline.

**Cancel project** requires confirmation (its status becomes permanent
unless reopened) and sets Status to Cancelled. **Resume project** (from On
Hold) and **Reopen project** (from Completed/Cancelled) both set Status to
In Progress immediately, with no confirmation — reversible, non-destructive.
Reopen additionally clears the completion date. None of these actions
deletes or resets timeline, assignment, or monthly-target data.

## Archiving a Project

Archive is a separate concept from Status. A Project can be `Completed` and not archived (kept visible as recent history), or archived at any Status, if it should be removed from normal operational views (Overview, Timeline) without being deleted.

Archiving requires confirmation (Unarchiving does not) and:

- sets `is_archived = true` (§8.6),
- does not change Status, Health, or any assignment data,
- removes the project from Overview and Timeline by default,
- keeps the project fully visible on the Projects page via an Archived filter/toggle (§14.3).

Un-archiving is always possible (`is_archived = false`).

## Deleting a Project

Delete permanently removes a Project and every row that exists only in
relation to it — its Project Assignments, Monthly Targets, and Weekly Focus
items. Nothing else in the data model references a Project by id, so unlike
Master Data (§15–19) there is no "still in use" guard to run first; Delete
always requires confirmation naming the project, since it is irreversible.
Master data the project referenced (its Owner Squad, Epic, Department,
stakeholders, designers) is untouched.

## Deleting Master Data that is still in use

Every Master Data entity (§15–19) is guarded: before the confirm dialog opens,
the app counts live references to the record and, if any exist, says what is
still using it.

For **Designer** and **Stakeholder** that guard can be overridden with
`Delete anyway`. The dialog names what will happen before offering it:

- **Designer** — removed from every project they were assigned to, and any
  squad they led is left with no lead. If they were a project's Design Lead,
  that project becomes unassigned (§26).
- **Stakeholder** — removed from every project's Product Owner and Project
  Admin lists and from its department-head snapshot (§8.6), and any department
  they headed is left with no head.

For **Squad**, **Department** and **Epic** there is no override. A project
cannot exist without an owner squad, an epic and a department, and a designer
cannot exist without a home squad, so "delete anyway" there would mean
destroying projects or designers rather than detaching them. These stay
blocked; retire them with Inactive instead.

If the Designer or Stakeholder being force-deleted is **Verified** (§15, §19)
— claimed by a signed-in account via `Profile.designer_id`/`.stakeholder_id`
— that account is forced back through Onboarding, captcha included, the next
time it loads the app: already signed in, it is dropped into Onboarding on
its own without needing to sign out first; not yet signed in, it meets
Onboarding on its next sign-in. The account is not treated as still verified
once the record it verified into no longer exists — it is exactly the same
gate a brand-new account meets, not a special "reinstated" state, except for
one difference: Onboarding shows a note explaining that an admin removed its
linked record, so it reads as an explained reset rather than an unexplained
one.

`Delete anyway` is the only action in the product that discards data the user
cannot recover, so it always states its consequence in the dialog rather than
relying on the word "anyway" to carry the warning. Setting the record to
`Inactive` remains the non-destructive way to retire someone who has left —
it hides them from every picker while keeping project history intact.

---

# 26. Unassigned Projects

A project can exist without Supporting Designer, and without a Project Design Lead, at any Status. This is a normal, valid state — never a validation error that blocks creating or saving a project.

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
No projects yet

Create your first project to start building the portfolio.

[Add Project]
```

Filtered state:

```text
No projects match these filters

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

Color palette: the app's shadcn theme is generated from a published shadcn preset (`shadcn init --preset b3YQijUO6K`, style `base-vega`, base color `zinc`) — a single teal/zinc accent hue for `--primary`/`--accent`/focus states over neutral zinc surfaces, still honoring the Avoid list below (no gradients, no neon, no decorative color). The earlier Ink Navy/Signal Blue brand primitives (from an interim `docs/DESIGN.md`-driven palette) have been fully removed — no component still references them. All status/health color (Project Status, Project Health, Master Data Active/Inactive) is driven by a small set of shared semantic tokens (`--primary` for the "active/in-motion" family, `--status-warning`, `--status-success`, `--destructive`) defined once in `src/app/globals.css`, never hardcoded per component — see `docs/DECISIONS.md`.

Recommended components:

```text
shadcn/ui
```

Icon library: shadcn's own primitives (Button, Dialog, etc.) use Hugeicons per the preset; existing app code continues to use lucide-react directly — both packages are present, not a full migration.

Button sizing: three fixed heights — `sm` 32px (compact contexts: table row actions, dense toolbars, compact filters), `md` 40px (default when no size is specified — form actions, modal actions, filters, navigation, standard CTAs), `lg` 48px (prominent/emphasis actions only). Icon-only buttons follow the same square dimensions (32×32 / 40×40 / 48×48). An additional `xs` (24px) tier remains for pre-existing very dense inline controls (e.g. row-level remove buttons); it is not part of the standard 3-tier scale and should not be used for new call-to-action buttons.

Typography: Geist is the product's single font family — headings, body text, labels, tables, buttons, forms, and navigation all use it (one font load, no mixed-font pairing). Consistent with the PRD's original "Inter or Plus Jakarta Sans" direction (Geist is the same geometric-sans family).

Desktop-first target:

```text
1440px
```

Application should remain usable down to tablet width.

Mobile optimization is not required for MVP.

## 29.1 Filter toolbar (shared across every list screen)

Projects, Timeline, People, Squads, and all five Master Data screens use one
shared filter toolbar, so filtering behaves and reads the same everywhere.

Layout, in a single wrapping row:

```text
<view switcher, if the screen has one>   Search   <the screen's own filters>   Clear filters
```

A screen with a presentation/view switcher (Projects' Board/List/Table,
Squads' Table/Squad) renders it on the left of this same row, pinned
opposite Search/Filters, rather than on a row of its own — one cohesive
toolbar instead of two stacked controls. At narrower widths the row wraps,
putting the view switcher above Search/Filters. Screens without a view
switcher are unaffected.

* **Search** sits first among the filter controls and is always the same
  width. `Cmd/Ctrl+K` focuses it from anywhere on the page. Matching is
  case-insensitive substring matching on the trimmed query, debounced by
  250 ms so the list doesn't re-filter on every keystroke. Which fields a
  screen searches is listed in that screen's own section.
* **Filters** are dropdown buttons. Each one names its dimension before a value
  is picked ("Department") and reads `Dimension: Value` after ("Department:
  Wholesale Banking"), so several active filters stay unambiguous at a glance.
  Dropdowns over long lists (squads, departments, epics, designers, design
  leads) are searchable. If a screen already exposes a comprehensive `Filters`
  panel, its dimensions are never *also* shown as separate standalone toolbar
  controls — one entry point per filter, not two. Projects, Timeline, and
  Squads all collapse into a single `Filters` button this way; every dimension
  lives in the popover behind it (§14.2, §14.3, §14.7). People and the five
  Master Data screens have few enough dimensions that each is shown directly,
  with no popover to hide anything behind.
* **Clear filters** is the only reset action, appearing at the end of the row
  once anything is active — including a Search query. Projects' Advanced
  Filters panel keeps its own staged Reset/Apply footer, which is separate.

The "All" row at the top of each dropdown is worded by what the filter selects:
`All <entities>` for a list of records (All squads, All epics, All departments,
All designers, All design leads), `All <values>` for an enum (All statuses, All
priorities, All health statuses, All types), and `Any <dimension>` for a
derived yes/no predicate (Any timeline, Any staffing, Any lead, Any
assignment).

Filter state is per screen and resets on navigation — it is deliberately not
kept in the URL. The one exception is Projects, which reads `designLead`,
`health`, and `status` once on mount so Overview can drill down into it; it
never writes those params back. See `docs/DECISIONS.md`.

No screen shows a result count. Empty states are worded the same everywhere:
`No <entities> yet` before any data exists, and `No <entities> match these
filters` with a `Clear filters` action when filtering returns nothing.

## 29.2 Write confirmations (shared across every screen)

Every write that succeeds raises one toast in the bottom-right corner. Reads,
filters, navigation and opening a dialog never do.

* **Wording is `<the thing> <what happened>`** and nothing more: `Sarah Chen
  updated`, `Trade Finance archived`, `Merchant Revamp rescheduled`. Naming the
  record is what makes the toast worth reading — the user already knows they
  pressed Delete, but not always which row was focused when they did.
* **One toast per user action**, not per row written. Saving the project wizard
  touches assignments, monthly targets and weekly focus rows; it confirms once.
  Moving several designers into a squad confirms once, with the count.
* **Toasts confirm, they do not ask.** Anything needing a decision stays a
  confirmation dialog (§25, §33). A failed or refused write is reported where
  the user is working — inline field errors, a dialog that stays open — not in a
  toast they may have already looked away from.
* **No undo action** in the MVP. Destructive actions are already gated by a
  confirmation dialog, so the toast is a receipt, not a second chance.

Screens that raise them: all five Master Data screens (create, update, delete,
Active/Inactive toggle), Add/Edit Project, Project Detail lifecycle actions
(hold, resume, reopen, cancel, complete, archive, restore, delete), Timeline
drag-to-reschedule and Weekly Focus moves, Squad Detail designer assignment,
and the inline Assign Design Lead control (§26).

---

---

# 30. Timeline UX Requirements

Timeline should prioritize readability over exhaustive Gantt functionality. Every capability below earns its place by answering a planning question a Design Lead actually asks; anything that only makes the chart look more capable stays out.

Required:

```text
Sticky project-name column, resizable, wide enough for a two-line project name
Horizontal scrolling
Time axis grouped one level up (months under quarters, weeks under months, and so on)
Labelled now-line and current-column highlight
Row hover that tracks across the project column and the canvas together
Project bars
Weekly Focus bands below the Year scale
Click a project bar → Project Detail
Click a Weekly Focus band → week detail dialog
Hover a bar → project name, dates, duration, commitment, health
Scale segmented control: Week / Month / Quarter / Year (§14.2)
Zoom within a scale from the canvas utility dock, and Ctrl/Cmd + wheel / pinch
Fit
Drag a project bar to reschedule it
Resize either end of a project bar
Empty state when filtering leaves nothing to draw, with the filters still in reach
```

Not required:

```text
dependencies
critical path
% complete / progress bars on bars
baselines (planned vs actual)
grouping projects into a collapsible tree
recurring bars
```

Drag and resize were out of scope before day-level dates existed on Project;
they are in scope now that `start_date` / `end_date` give them something exact
to write to. Dependencies and critical path remain out of scope — this product
plans a design portfolio, not a construction schedule, and nothing in the
domain model expresses a blocking relationship between projects.

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
Planning
In Progress
On Hold
Completed
Cancelled
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

This is unrelated to **Shared Squad Membership** (§8.2.1, §13.1): Cross-squad
above is a fully derived fact about a *project assignment*, never stored;
Shared Squad Membership is an explicit, stored fact about *squad membership*,
with no project involved. A designer can be cross-squad on a project without
being Shared into that project's squad, and vice versa.

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

Components should not directly import large mock arrays, and must not access any storage mechanism directly. All reads and writes go through the service/repository layer:

```text
UI
→ service / repository layer
→ in-memory cache of every table
→ Supabase (PostgreSQL + Auth + Realtime)
```

**Persistence:** Supabase. Data is shared — several people on several devices see the same portfolio, and a change made by one of them appears for the others without a reload.

The repository layer stayed synchronous through this move. It reads from an in-memory cache of all nine tables, filled once at sign-in; writes update that cache immediately and go to Supabase in the background, and Supabase Realtime pushes everyone else's changes back into it. That is what allowed the database to be introduced without rewriting UI components — the promise this section made when persistence was `localStorage`.

The trade-offs this accepts are recorded in `docs/DECISIONS.md`: writes are optimistic (a rejected write toasts and refetches rather than blocking the UI), and the cache assumes a data set small enough to hold whole.

Schema and seed data live in `supabase/schema.sql` and `supabase/seed.sql`. Column names match the domain interfaces in `src/lib/domain/types.ts` exactly, so there is no mapping layer.

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

For persistence:

```text
Supabase (PostgreSQL + Auth + Realtime), wrapped by the service/repository layer (§34)
```

Preferred architecture:

```text
UI
↓
Service / Repository Layer
↓
Supabase
```

Do not tightly couple UI to a particular data source. This layer has now survived one move (localStorage → Supabase) without the UI changing; keep it that way.

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
Status: Planning
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

Weekly Focus is additive: a project with no Weekly Focus rows must render correctly rather than being treated as incomplete data. (This originally also governed back-compat with data already in a user's browser; persistence has since moved to Supabase, where the rows simply don't exist for such a project.)

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
* switch time scale without losing active filters,
* reschedule a project by dragging or resizing its bar,
* see what a project is focused on in a given week (Weekly Focus), without it turning into a task board,
* see the same Weekly Focus data on Timeline, Project Detail, and Project Edit.

### Projects

* create project,
* edit project,
* switch between Board / List / Table views (§14.3),
* assign a Design Lead and/or Supporting Designers directly from Board, List, or Table,
* start a project (To Do → In Progress, gated on §10.3),
* mark a project complete, put it on hold, cancel it, or reopen it (§10, §25),
* archive / un-archive a project,
* delete a project (§25),
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

### Squads

* see every squad,
* identify Squad Lead,
* see squad members,
* see cross-squad support.

### Master Data

* create/edit/deactivate/delete Designers,
* create/edit/deactivate/delete Squads,
* create/edit/deactivate/delete Departments (including Department Head),
* create/edit/deactivate/delete Epics,
* create/edit/deactivate/delete Stakeholders.

### Data Consistency

Changing assignment or project data must update all relevant views automatically.

---

# 38. Explicitly Out of Scope

DO NOT implement these features for MVP. Note on "Kanban" below: every
occurrence in this list means *task-level* Kanban — turning a project's
internals (Weekly Focus, a task list inside a project) into a Jira-style
board of subtasks with per-task status, assignee, and workload. It does not
mean the *project-level* Board added at §14.3, whose cards are whole
Projects grouped by Project Status on the existing Projects page, the same
kind of visibility a status column already gave the old table — not task
management. See `docs/DECISIONS.md` for why the two are a different feature
and this line was clarified rather than silently overridden.

```text
Task management
Kanban (task-level — see the note above; does not restrict the Projects Board at §14.3)
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
Project progress / % complete
Timeline baselines (planned vs actual)
Task management inside Weekly Focus (status, assignee, subtasks, checklist, story points, sprint planning, Kanban, comments, per-task priority/workload, completion percentage)
Resource forecasting
SSO
Bahasa Indonesia translation
Mengubah alamat email sendiri
Two-factor authentication
Passkeys / security keys
Daftar active session
Manajemen device
Login history
Audit log
Upload foto profil
Notification preferences
Connected accounts
Billing
API keys
Team / organization settings
Undangan user dari dalam aplikasi
UI manajemen permission
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
