// Marks a Designer/Stakeholder Master Data row that is claimed by a real
// invited account, as opposed to one created directly in Master Data with no
// account behind it (docs/PRD.MD "Hubungan Profile, Designer, dan
// Stakeholder"; docs/DECISIONS.md "Verified badge"). Reuses --status-success
// like EntityStatusBadge's Active state — this is an affirmative fact about
// the row, not a separate color concept. Callers decide whether to render it
// (via isDesignerVerified/isStakeholderVerified) — this component only knows
// how to draw the mark.

import { BadgeCheck } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "cn"

interface VerifiedBadgeProps {
  className?: string
}

function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className={cn(
              "inline-flex items-center text-status-success outline-none",
              className
            )}
          />
        }
      >
        <BadgeCheck className="size-4" aria-hidden="true" />
        <span className="sr-only">Verified</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        Verified — this account was invited, signed in, and completed onboarding. Not created directly in Master Data.
      </TooltipContent>
    </Tooltip>
  )
}

export { VerifiedBadge }
export type { VerifiedBadgeProps }
