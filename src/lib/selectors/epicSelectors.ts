// Derived data for Epic (docs/PRD.MD §8.4).

import * as projectRepository from "@/lib/repositories/projectRepository";

/**
 * What still references this Epic — the guard behind Delete (Master Data,
 * docs/DECISIONS.md). Counts every Project regardless of its own
 * status/archive state, since even a fully archived historical project
 * still needs its epic's name to render.
 */
export function getEpicUsage(epicId: string): { projectCount: number } {
  return {
    projectCount: projectRepository.getAll().filter((project) => project.epic_id === epicId).length,
  };
}
