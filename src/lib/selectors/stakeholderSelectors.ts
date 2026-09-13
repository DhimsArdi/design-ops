// Derived data for Stakeholder (docs/PRD.MD §8.5).

import * as departmentRepository from "@/lib/repositories/departmentRepository";
import * as profileRepository from "@/lib/repositories/profileRepository";
import * as projectRepository from "@/lib/repositories/projectRepository";

/**
 * What still references this Stakeholder — the guard behind Delete (Master
 * Data, docs/DECISIONS.md). `projectCount` is the number of distinct
 * Projects citing this Stakeholder in any of its three stakeholder fields
 * (department_head_id snapshot, product_owner_ids, project_admin_ids),
 * counted regardless of that project's own status/archive state, since even
 * a fully archived historical project still needs the name to render.
 */
export function getStakeholderUsage(
  stakeholderId: string,
): { departmentHeadCount: number; projectCount: number } {
  return {
    departmentHeadCount: departmentRepository
      .getAll()
      .filter((department) => department.department_head_id === stakeholderId).length,
    projectCount: projectRepository
      .getAll()
      .filter(
        (project) =>
          project.department_head_id === stakeholderId ||
          project.product_owner_ids.includes(stakeholderId) ||
          project.project_admin_ids.includes(stakeholderId),
      ).length,
  };
}

/**
 * Whether this Stakeholder row is claimed by a real invited account, rather
 * than created directly in Master Data — the same "organic vs. admin-created"
 * distinction as `isDesignerVerified` (see designerSelectors.ts), mirrored via
 * `profiles.stakeholder_id` instead of `profiles.designer_id`.
 */
export function isStakeholderVerified(stakeholderId: string): boolean {
  return profileRepository.getAll().some((profile) => profile.stakeholder_id === stakeholderId);
}
