// Project name, clamped to 2 lines with an ellipsis rather than truncated to
// one line — long names (e.g. "Design System Component Documentation") stay
// identifiable in the Overview priority list and the Projects table without
// widening either column or growing every row to a fixed taller height. The
// full name is still in the DOM (line-clamp is visual only, not a11y-hiding),
// and a Tooltip repeats it on hover/keyboard focus as a convenience, not as
// the only way to read it.

import Link from "next/link"
import type { MouseEvent } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "cn"

interface ProjectNameLinkProps {
  href: string
  name: string
  className?: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

function ProjectNameLink({ href, name, className, onClick }: ProjectNameLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            onClick={onClick}
            className={cn(
              "line-clamp-2 text-sm leading-snug font-medium text-foreground hover:underline",
              className
            )}
          />
        }
      >
        {name}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {name}
      </TooltipContent>
    </Tooltip>
  )
}

export { ProjectNameLink }
export type { ProjectNameLinkProps }
