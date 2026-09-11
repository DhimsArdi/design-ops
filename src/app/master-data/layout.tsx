import type { ReactNode } from "react"
import { MasterDataNav } from "./_components/master-data-nav"

export default function MasterDataLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <MasterDataNav />
      {children}
    </div>
  )
}
