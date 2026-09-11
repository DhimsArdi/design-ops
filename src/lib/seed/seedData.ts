// Seed data for demo purposes (docs/PRD.MD §36), extended per the
// pre-development audit to also cover a P3 project, At Risk/Blocked health,
// and a project spanning a year boundary. Loading this into storage on
// first run is a later step — this file only exports the typed arrays.

import type {
  Department,
  Designer,
  Epic,
  Project,
  ProjectAssignment,
  ProjectMonthlyTarget,
  ProjectWeeklyFocus,
  Squad,
  Stakeholder,
} from "@/lib/domain/types";

// --- ids -------------------------------------------------------------

const squadAId = crypto.randomUUID();
const squadBId = crypto.randomUUID();
const squadCId = crypto.randomUUID();

const dimasId = crypto.randomUUID();
const sarahId = crypto.randomUUID();
const malikId = crypto.randomUUID();
const rakaId = crypto.randomUUID();
const nadiaId = crypto.randomUUID();
const andiId = crypto.randomUUID();

const deptWholesaleId = crypto.randomUUID();
const deptMerchantId = crypto.randomUUID();
const deptDigitalId = crypto.randomUUID();
const deptDesignPlatformId = crypto.randomUUID();

const epicTradeFinanceId = crypto.randomUUID();
const epicMerchantId = crypto.randomUUID();
const epicDigitalEnhancementId = crypto.randomUUID();
const epicDesignSystemId = crypto.randomUUID();

const stHeadWholesaleId = crypto.randomUUID();
const stHeadMerchantId = crypto.randomUUID();
const stHeadDigitalId = crypto.randomUUID();
const stPoTradeFinanceId = crypto.randomUUID();
const stPoMerchantId = crypto.randomUUID();
const stPoDigitalId = crypto.randomUUID();
const stPoDesignPlatformId = crypto.randomUUID();
const stPicWholesaleId = crypto.randomUUID();
const stPicMerchantId = crypto.randomUUID();
const stPicDigitalId = crypto.randomUUID();

const projTradeFinanceId = crypto.randomUUID();
const projMerchantRevampId = crypto.randomUUID();
const projDesignSystemEnhancementId = crypto.randomUUID();
const projDigitalChannelInitiativeId = crypto.randomUUID();
const projDesignSystemDocsId = crypto.randomUUID();
const projDigitalKycId = crypto.randomUUID();

// --- squads ------------------------------------------------------------

export const seedSquads: Squad[] = [
  {
    id: squadAId,
    name: "Squad A",
    lead_designer_id: dimasId,
    description: "Wholesale Banking design squad, owns Trade Finance work.",
    status: "Active",
  },
  {
    id: squadBId,
    name: "Squad B",
    lead_designer_id: rakaId,
    description: "Merchant Business design squad.",
    status: "Active",
  },
  {
    id: squadCId,
    name: "Squad C",
    lead_designer_id: nadiaId,
    description: "Digital Channel and platform design squad.",
    status: "Active",
  },
];

// --- designers -----------------------------------------------------------

export const seedDesigners: Designer[] = [
  {
    id: dimasId,
    name: "Dimas",
    job_title: "Senior Product Designer",
    seniority: "Senior",
    home_squad_id: squadAId,
    avatar: "DM",
    status: "Active",
  },
  {
    id: sarahId,
    name: "Sarah",
    job_title: "Junior Product Designer",
    seniority: "Junior",
    home_squad_id: squadAId,
    avatar: "SR",
    status: "Active",
  },
  {
    id: malikId,
    name: "Malik",
    job_title: "Junior Product Designer",
    seniority: "Junior",
    home_squad_id: squadAId,
    avatar: "MK",
    status: "Active",
  },
  {
    id: rakaId,
    name: "Raka",
    job_title: "Senior Product Designer",
    seniority: "Senior",
    home_squad_id: squadBId,
    avatar: "RK",
    status: "Active",
  },
  {
    id: nadiaId,
    name: "Nadia",
    job_title: "Senior Product Designer",
    seniority: "Senior",
    home_squad_id: squadCId,
    avatar: "ND",
    status: "Active",
  },
  {
    id: andiId,
    name: "Andi",
    job_title: "Product Designer",
    seniority: "Mid",
    home_squad_id: squadBId,
    avatar: "AN",
    status: "Active",
  },
];

// --- departments -----------------------------------------------------------

export const seedDepartments: Department[] = [
  {
    id: deptWholesaleId,
    name: "Wholesale Banking",
    description: "Corporate and institutional banking products.",
    department_head_id: stHeadWholesaleId,
    status: "Active",
  },
  {
    id: deptMerchantId,
    name: "Merchant Business",
    description: "Merchant acquiring and payments products.",
    department_head_id: stHeadMerchantId,
    status: "Active",
  },
  {
    id: deptDigitalId,
    name: "Digital Channel",
    description: "Retail digital banking channels.",
    department_head_id: stHeadDigitalId,
    status: "Active",
  },
  {
    id: deptDesignPlatformId,
    name: "Design Platform",
    description: "Cross-department design system and shared platform work.",
    // Deliberately no head assigned yet — demonstrates the nullable case.
    department_head_id: null,
    status: "Active",
  },
];

// --- epics -----------------------------------------------------------------

export const seedEpics: Epic[] = [
  {
    id: epicTradeFinanceId,
    name: "Trade Finance",
    department_id: deptWholesaleId,
    description: "Trade finance platform and workflows.",
    status: "Active",
  },
  {
    id: epicMerchantId,
    name: "Merchant",
    department_id: deptMerchantId,
    description: "Merchant-facing products and onboarding.",
    status: "Active",
  },
  {
    id: epicDigitalEnhancementId,
    name: "Digital Channel Enhancement",
    department_id: deptDigitalId,
    description: "Ongoing improvements to retail digital channels.",
    status: "Active",
  },
  {
    id: epicDesignSystemId,
    name: "Design System",
    department_id: deptDesignPlatformId,
    description: "Shared component library and design standards.",
    status: "Active",
  },
];

// --- stakeholders ------------------------------------------------------------

export const seedStakeholders: Stakeholder[] = [
  {
    id: stHeadWholesaleId,
    name: "Budi Santoso",
    title: "Head of Wholesale Banking",
    department_id: deptWholesaleId,
    stakeholder_type: "Department Head",
    status: "Active",
  },
  {
    id: stHeadMerchantId,
    name: "Siti Rahayu",
    title: "Head of Merchant Business",
    department_id: deptMerchantId,
    stakeholder_type: "Department Head",
    status: "Active",
  },
  {
    id: stHeadDigitalId,
    name: "Agus Wibowo",
    title: "Head of Digital Channel",
    department_id: deptDigitalId,
    stakeholder_type: "Department Head",
    status: "Active",
  },
  {
    id: stPoTradeFinanceId,
    name: "Rina Amelia",
    title: "Product Owner, Trade Finance",
    department_id: deptWholesaleId,
    stakeholder_type: "Product Owner",
    status: "Active",
  },
  {
    id: stPoMerchantId,
    name: "Fajar Nugroho",
    title: "Product Owner, Merchant Business",
    department_id: deptMerchantId,
    stakeholder_type: "Product Owner",
    status: "Active",
  },
  {
    id: stPoDigitalId,
    name: "Wulan Sari",
    title: "Product Owner, Digital Channel",
    department_id: deptDigitalId,
    stakeholder_type: "Product Owner",
    status: "Active",
  },
  {
    id: stPoDesignPlatformId,
    name: "Kevin Halim",
    title: "Product Owner, Design Platform",
    department_id: deptDesignPlatformId,
    stakeholder_type: "Product Owner",
    status: "Active",
  },
  {
    id: stPicWholesaleId,
    name: "Teguh Prasetyo",
    title: "Project Admin, Wholesale Banking",
    department_id: deptWholesaleId,
    stakeholder_type: "Project Admin / PIC",
    status: "Active",
  },
  {
    id: stPicMerchantId,
    name: "Dewi Lestari",
    title: "Project Admin, Merchant Business",
    department_id: deptMerchantId,
    stakeholder_type: "Project Admin / PIC",
    status: "Active",
  },
  {
    id: stPicDigitalId,
    name: "Hendra Kusuma",
    title: "Project Admin, Digital Channel",
    department_id: deptDigitalId,
    stakeholder_type: "Project Admin / PIC",
    status: "Active",
  },
];

// --- projects ----------------------------------------------------------

export const seedProjects: Project[] = [
  {
    id: projTradeFinanceId,
    name: "Trade Finance Platform Revamp",
    epic_id: epicTradeFinanceId,
    department_id: deptWholesaleId,
    department_head_id: stHeadWholesaleId,
    product_owner_ids: [stPoTradeFinanceId],
    project_admin_ids: [stPicWholesaleId],
    owner_squad_id: squadAId,
    priority: "P1",
    status: "In Progress",
    health: "On Track",
    timeline_confidence: "Committed",
    is_archived: false,
    start_month: "2026-09",
    end_month: "2026-12",
    description:
      "Revamp the trade finance workflow to reduce manual document handling for relationship managers.",
    created_at: "2026-08-01T02:00:00.000Z",
    updated_at: "2026-09-10T07:30:00.000Z",
  },
  {
    id: projMerchantRevampId,
    name: "Merchant Revamp",
    epic_id: epicMerchantId,
    department_id: deptMerchantId,
    department_head_id: stHeadMerchantId,
    product_owner_ids: [stPoMerchantId],
    project_admin_ids: [stPicMerchantId],
    owner_squad_id: squadBId,
    priority: "P1",
    status: "Planning",
    health: "On Track",
    timeline_confidence: "Committed",
    is_archived: false,
    // Spans a year boundary (Oct 2026 -> Jan 2027).
    start_month: "2026-10",
    end_month: "2027-01",
    description:
      "Redesign the merchant onboarding and settlement dashboard experience.",
    created_at: "2026-08-15T03:00:00.000Z",
    updated_at: "2026-09-05T04:15:00.000Z",
  },
  {
    id: projDesignSystemEnhancementId,
    name: "Design System Enhancement",
    epic_id: epicDesignSystemId,
    department_id: deptDesignPlatformId,
    // Snapshot at creation time: Design Platform had no head assigned yet.
    department_head_id: null,
    product_owner_ids: [stPoDesignPlatformId],
    project_admin_ids: [],
    owner_squad_id: squadAId,
    priority: "P2",
    status: "In Progress",
    health: "On Track",
    timeline_confidence: "Tentative",
    is_archived: false,
    start_month: "2026-09",
    end_month: "2026-11",
    description:
      "Extend the shared component library with new patterns requested by product squads.",
    created_at: "2026-07-20T01:00:00.000Z",
    updated_at: "2026-08-25T06:00:00.000Z",
  },
  {
    id: projDigitalChannelInitiativeId,
    name: "Digital Channel Initiative",
    epic_id: epicDigitalEnhancementId,
    department_id: deptDigitalId,
    department_head_id: stHeadDigitalId,
    product_owner_ids: [stPoDigitalId],
    project_admin_ids: [],
    owner_squad_id: squadCId,
    priority: "P2",
    status: "Proposed",
    health: "On Track",
    timeline_confidence: "Tentative",
    is_archived: false,
    // Spans a year boundary (Nov 2026 -> Feb 2027).
    start_month: "2026-11",
    end_month: "2027-02",
    description:
      "Upcoming initiative to refresh key retail digital channel journeys.",
    created_at: "2026-08-25T05:00:00.000Z",
    updated_at: "2026-08-25T05:00:00.000Z",
  },
  {
    id: projDesignSystemDocsId,
    name: "Design System Component Documentation",
    epic_id: epicDesignSystemId,
    department_id: deptDesignPlatformId,
    department_head_id: null,
    product_owner_ids: [stPoDesignPlatformId],
    project_admin_ids: [],
    owner_squad_id: squadCId,
    priority: "P3",
    status: "In Progress",
    health: "At Risk",
    timeline_confidence: "Tentative",
    is_archived: false,
    start_month: "2026-08",
    end_month: "2026-10",
    description:
      "Document usage guidelines for existing components; slipping due to competing priorities.",
    created_at: "2026-07-10T02:00:00.000Z",
    updated_at: "2026-09-08T03:00:00.000Z",
  },
  {
    id: projDigitalKycId,
    name: "Digital Onboarding KYC Enhancement",
    epic_id: epicDigitalEnhancementId,
    department_id: deptDigitalId,
    department_head_id: stHeadDigitalId,
    product_owner_ids: [stPoDigitalId],
    project_admin_ids: [stPicDigitalId],
    owner_squad_id: squadCId,
    priority: "P2",
    status: "In Progress",
    health: "Blocked",
    timeline_confidence: "Committed",
    is_archived: false,
    start_month: "2026-08",
    end_month: "2026-11",
    description:
      "Improve the digital KYC onboarding flow; currently blocked on a pending compliance decision.",
    created_at: "2026-07-01T01:00:00.000Z",
    updated_at: "2026-07-15T01:00:00.000Z",
  },
];

// --- project assignments ------------------------------------------------

export const seedProjectAssignments: ProjectAssignment[] = [
  // Trade Finance Platform Revamp — Lead: Malik, Support: Sarah, Raka (cross-squad).
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    designer_id: malikId,
    project_role: "Lead",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    designer_id: sarahId,
    project_role: "Support",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    designer_id: rakaId,
    project_role: "Support",
  },

  // Merchant Revamp — Lead: Raka, Support: Sarah (cross-squad).
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    designer_id: rakaId,
    project_role: "Lead",
  },
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    designer_id: sarahId,
    project_role: "Support",
  },

  // Design System Enhancement — Lead: Dimas, Support: Malik.
  {
    id: crypto.randomUUID(),
    project_id: projDesignSystemEnhancementId,
    designer_id: dimasId,
    project_role: "Lead",
  },
  {
    id: crypto.randomUUID(),
    project_id: projDesignSystemEnhancementId,
    designer_id: malikId,
    project_role: "Support",
  },

  // Digital Channel Initiative — intentionally no assignments (Unassigned / no Lead).

  // Design System Component Documentation — Lead: Nadia, Support: Andi (cross-squad).
  {
    id: crypto.randomUUID(),
    project_id: projDesignSystemDocsId,
    designer_id: nadiaId,
    project_role: "Lead",
  },
  {
    id: crypto.randomUUID(),
    project_id: projDesignSystemDocsId,
    designer_id: andiId,
    project_role: "Support",
  },

  // Digital Onboarding KYC Enhancement — Lead: Andi (cross-squad), no Support.
  {
    id: crypto.randomUUID(),
    project_id: projDigitalKycId,
    designer_id: andiId,
    project_role: "Lead",
  },
];

// --- project monthly targets ---------------------------------------------

export const seedProjectMonthlyTargets: ProjectMonthlyTarget[] = [
  // Trade Finance Platform Revamp (matches docs/PRD.MD §8.8 example).
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    month: "2026-09",
    phase: "Research",
    target: "Requirement alignment completed",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    month: "2026-10",
    phase: "Exploration",
    target: "UX direction approved",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    month: "2026-11",
    phase: "Design",
    target: "Final UI ready",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    month: "2026-12",
    phase: "Handover",
    target: "Developer handoff complete",
  },

  // Merchant Revamp.
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    month: "2026-10",
    phase: "Discovery",
    target: "Stakeholder requirements mapped",
  },
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    month: "2026-11",
    phase: "Research",
    target: "Merchant journey pain points identified",
  },
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    month: "2026-12",
    phase: "Exploration",
    target: "Concept directions reviewed",
  },
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    month: "2027-01",
    phase: "Design",
    target: "Final design ready for handover",
  },

  // Design System Enhancement.
  {
    id: crypto.randomUUID(),
    project_id: projDesignSystemEnhancementId,
    month: "2026-09",
    phase: "Design",
    target: "Updated component specs drafted",
  },
  {
    id: crypto.randomUUID(),
    project_id: projDesignSystemEnhancementId,
    month: "2026-10",
    phase: "Testing",
    target: "Component QA against product surfaces",
  },
  {
    id: crypto.randomUUID(),
    project_id: projDesignSystemEnhancementId,
    month: "2026-11",
    phase: "Handover",
    target: "Rollout guide published",
  },
];

// --- project weekly focus (docs/PRD.MD §8.9) -----------------------------
//
// Deliberately sparse — only two of the six seed projects get Weekly Focus
// rows, and neither gets one for every week in its range. This demonstrates
// (per PRD §36): multiple items in the same week, an empty week with zero
// items, different phases across weeks, a cross-month transition, and (via
// Merchant Revamp, which already spans a year boundary) a cross-year one.

export const seedProjectWeeklyFocus: ProjectWeeklyFocus[] = [
  // Trade Finance Platform Revamp — Sep (Research) into Oct (Exploration).
  // Sep 21 is intentionally left with no rows (an empty week).
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-09-07",
    title: "Requirement mapping",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-09-07",
    title: "Benchmark existing flow",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-09-14",
    title: "LC Issuance flow exploration",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-09-14",
    title: "Navigation exploration",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-09-28",
    title: "Amendment UI exploration",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-09-28",
    title: "Empty states",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-10-05",
    title: "PO review",
    description: "Walk through the amendment flow with the Wholesale Banking PO before sign-off.",
  },
  {
    id: crypto.randomUUID(),
    project_id: projTradeFinanceId,
    week_start_date: "2026-10-05",
    title: "UX revision",
  },

  // Merchant Revamp — a single item either side of the Dec 2026 -> Jan 2027
  // boundary (Exploration -> Design), to demonstrate a cross-year week range.
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    week_start_date: "2026-12-28",
    title: "Year-end concept review prep",
  },
  {
    id: crypto.randomUUID(),
    project_id: projMerchantRevampId,
    week_start_date: "2027-01-04",
    title: "Q1 design kickoff planning",
  },
];
