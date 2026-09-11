// Derived data for Department (docs/PRD.MD §8.3, §17).

import * as departmentRepository from "@/lib/repositories/departmentRepository";
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository";
import type { Stakeholder } from "@/lib/domain/types";

/**
 * The Stakeholder referenced by Department.department_head_id, or undefined
 * if the department has no head assigned yet.
 *
 * This is the department's CURRENT head — not the same thing as a given
 * Project's `department_head_id`, which is a point-in-time snapshot and
 * does not necessarily match this (docs/DECISIONS.md).
 */
export function getDepartmentHead(departmentId: string): Stakeholder | undefined {
  const department = departmentRepository.getById(departmentId);
  if (!department?.department_head_id) return undefined;
  return stakeholderRepository.getById(department.department_head_id);
}
