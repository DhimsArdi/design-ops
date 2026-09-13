// The Add/Edit Project step indicator (docs/PRD.MD §20).
//
// Three states, told apart at a glance rather than by reading: done is a
// check, current is the one filled marker on the row, and what is still ahead
// stays neutral. Steps already reached are buttons — going back to fix Epic
// from Review should not mean pressing Back three times — and steps that
// nothing has been entered for yet are inert, so the stepper never skips past
// a required field that the Next button would have caught.

import { Check } from "lucide-react"
import { cn } from "cn"

interface WizardStepperProps {
  steps: readonly string[]
  /** 1-based. */
  current: number
  /** Highest step that may be jumped to — everything after it renders inert. */
  maxReachable: number
  onStepSelect: (step: number) => void
}

function WizardStepper({ steps, current, maxReachable, onStepSelect }: WizardStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {steps.map((label, index) => {
        const stepNumber = index + 1
        const isCurrent = stepNumber === current
        const isComplete = stepNumber < current
        const isReachable = stepNumber <= maxReachable && !isCurrent

        const marker = (
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-(--duration-quick)",
              isCurrent
                ? "bg-primary text-primary-foreground"
                : isComplete
                  ? "bg-primary/10 text-primary"
                  : "border border-border text-muted-foreground",
            )}
          >
            {isComplete ? <Check className="size-3" /> : stepNumber}
          </span>
        )

        const content = (
          <>
            {marker}
            <span className="truncate">{label}</span>
          </>
        )

        const textClass = cn(
          "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors duration-(--duration-quick)",
          isCurrent
            ? "font-semibold text-foreground"
            : isComplete
              ? "text-foreground"
              : "text-muted-foreground",
        )

        return (
          <li key={label} className="flex items-center gap-3">
            {index > 0 ? <span aria-hidden="true" className="h-px w-6 bg-border" /> : null}
            {isReachable ? (
              <button
                type="button"
                onClick={() => onStepSelect(stepNumber)}
                className={cn(textClass, "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}
              >
                {content}
              </button>
            ) : (
              <span aria-current={isCurrent ? "step" : undefined} className={textClass}>
                {content}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export { WizardStepper }
export type { WizardStepperProps }
