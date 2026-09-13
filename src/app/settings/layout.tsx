import type { ReactNode } from "react"

import { SettingsNav } from "./_components/settings-nav"

// AppShell's header bar already titles this section "Settings", exactly as it
// does for Master Data — so there is no second <h1> here, and each page
// supplies its own heading for the panel beside the nav (docs/PRD.MD §14.10).
//
// The content column is capped rather than filling the window: these are forms,
// and a text input stretched across a 32" monitor is harder to use, not more
// generous (PRD §29, task §53).
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <SettingsNav />
      <div className="min-w-0 flex-1 lg:max-w-2xl">{children}</div>
    </div>
  )
}
