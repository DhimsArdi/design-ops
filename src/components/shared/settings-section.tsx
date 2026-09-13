// One labelled group of fields — a heading, an optional line of context, and
// the fields (docs/PRD.MD §14.10). Originally Settings-only; also used by the
// first-login Onboarding gate (src/components/auth/onboarding-view.tsx), which
// shares its identity fields with Settings → Profile.
//
// Not a card. These are a single column of related fields, and wrapping each
// group in its own bordered surface would draw five boxes where the page needs
// one rhythm; the heading and the spacing already say where a group starts and
// ends (PRD §29: subtle borders, generous whitespace, minimal cards). Pages put
// a <Separator /> between sections where a visible break helps.

import type { ReactNode } from "react"
import { cn } from "cn"

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

export { SettingsSection }
export type { SettingsSectionProps }
