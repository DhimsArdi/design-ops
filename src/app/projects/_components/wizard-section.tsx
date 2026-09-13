// Layout for one step of the Add/Edit Project wizard (docs/PRD.MD §21-24).
//
// A step is a settings-style form, not one long field list: each section says
// on the left what it is for, and holds its controls on the right, with a hair
// rule between sections. That split is the whole point — "Ownership / Define
// who owns the project and which squad is responsible" answers the question a
// bare "Product Owner *" label leaves open, without a line of helper text
// under every input.
//
// Deliberately not a card per section (PRD §29): the step is already inside
// one surface, and five nested boxes would draw borders where the page needs
// rhythm. Below lg the two columns stack — at the shell's 768px floor a 220px
// description column would leave the controls cramped.

import type { ReactNode } from "react"
import { cn } from "cn"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

/** The step body: sections separated by a single rule, never by a border each. */
function WizardSections({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-border", className)}>{children}</div>
}

interface WizardSectionProps {
  title: string
  description?: string
  /** Sits under the description in the left column — the Review step's per-section Edit. */
  aside?: ReactNode
  children: ReactNode
}

function WizardSection({ title, description, aside, children }: WizardSectionProps) {
  return (
    <section className="grid gap-x-12 gap-y-4 py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm leading-normal text-muted-foreground">{description}</p>
        ) : null}
        {aside}
      </div>
      {/* Capped so a control never stretches to a 1440px reading width, even
          though the page itself stays wide. */}
      <div className="max-w-3xl space-y-5">{children}</div>
    </section>
  )
}

/** Two related fields on one line — Epic + Department, Priority + Status. */
function WizardFieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>{children}</div>
}

interface WizardFieldProps {
  label: string
  /** Omit for controls that are not a single labelable element (a checklist, a picker group). */
  htmlFor?: string
  required?: boolean
  /** Says so in words rather than leaving "no asterisk" to be inferred. */
  optional?: boolean
  /** Helper text under the control. Hidden while an error is showing — two lines under one input is noise. */
  hint?: ReactNode
  error?: string | null
  children: ReactNode
  className?: string
}

function WizardField({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  children,
  className,
}: WizardFieldProps) {
  return (
    <Field className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={htmlFor} className="items-center gap-1.5">
        <span>
          {label}
          {required ? (
            <>
              <span aria-hidden="true" className="ml-0.5 text-destructive">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </span>
        {optional ? <span className="text-xs font-normal text-muted-foreground">Optional</span> : null}
      </FieldLabel>
      {children}
      {hint && !error ? <FieldDescription className="text-xs">{hint}</FieldDescription> : null}
      <FieldError className="text-xs">{error}</FieldError>
    </Field>
  )
}

export { WizardField, WizardFieldRow, WizardSection, WizardSections }
export type { WizardFieldProps, WizardSectionProps }
