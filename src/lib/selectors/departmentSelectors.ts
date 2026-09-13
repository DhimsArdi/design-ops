// Derived data for Department (docs/PRD.MD §8.3, §17).

import * as departmentRepository from "@/lib/repositories/departmentRepository";
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository";
import * as epicRepository from "@/lib/repositories/epicRepository";
import * as projectRepository from "@/lib/repositories/projectRepository";
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

/**
 * What still references this Department — the guard behind Delete (Master
 * Data, docs/DECISIONS.md). Counts every Epic/Project regardless of their
 * own status/archive state, since even a fully archived historical project
 * still needs its department's name to render.
 */
export function getDepartmentUsage(departmentId: string): { epicCount: number; projectCount: number } {
  return {
    epicCount: epicRepository.getAll().filter((epic) => epic.department_id === departmentId).length,
    projectCount: projectRepository
      .getAll()
      .filter((project) => project.department_id === departmentId).length,
  };
}
