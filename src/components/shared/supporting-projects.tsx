// Explicit "Supporting: X, Y" cross-squad notation (task ask: replace
// ambiguous "→ Project / –" shorthand with plain language). Secondary
// metadata — muted, no visual weight beyond the surrounding text. Once a
// designer supports more than a couple of projects, collapses to "Supporting
// N projects" with a Tooltip (keyboard-focusable, not hover-only) listing
// every name, rather than growing an ever-longer inline comma list. Used
// anywhere this notation appears: Overview's Cross-squad Support list and
// Squad Detail's Outgoing/Incoming sections.

import Link from "next/link"
import type { Project } from "@/lib/domain/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "cn"

const INLINE_LIST_MAX = 2

interface SupportingProjectsProps {
  projects: Project[]
  className?: string
}

function SupportingProjects({ projects, className }: SupportingProjectsProps) {
  if (projects.length === 0) return null

  if (projects.length <= INLINE_LIST_MAX) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        Supporting:{" "}
        {projects.map((project, index) => (
          <span key={project.id}>
            {index > 0 ? ", " : ""}
            <Link href={`/projects/${project.id}`} className="hover:underline">
              {project.name}
            </Link>
          </span>
        ))}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className={cn(
              "cursor-default text-muted-foreground underline decoration-dotted underline-offset-2 outline-none focus-visible:decoration-solid",
              className
            )}
          />
        }
      >
        Supporting {projects.length} projects
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {projects.map((project) => project.name).join(", ")}
      </TooltipContent>
    </Tooltip>
  )
}

export { SupportingProjects }
export type { SupportingProjectsProps }
