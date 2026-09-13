import type { ReactNode } from "react"
import { MasterDataNav } from "./_components/master-data-nav"

// AppShell's own header bar already titles this section "Master Data" — no
// second <h1> here. Just the short clarifying subtitle the task asked for
// (§12: distinguish this administrative/configuration layer from the
// operational screens — Overview/Projects/Timeline/People/Teams — that read
// this same data).
export default function MasterDataLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Reference data and organizational configuration used across the app. For day-to-day
          planning, use Overview, Projects, Timeline, People, or Teams instead — those stay in sync
          with whatever is configured here.
        </p>
        <MasterDataNav />
      </div>
      {children}
    </div>
  )
}
