"use client"

// Table / Squad segmented control — same Tabs primitive and shape as
// ProjectViewSwitcher (Projects page). View mode is unrelated to which
// squads are visible: it only switches how the same filtered list renders.

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TeamsView = "table" | "squad"

interface TeamsViewSwitcherProps {
  value: TeamsView
  onChange: (next: TeamsView) => void
}

function TeamsViewSwitcher({ value, onChange }: TeamsViewSwitcherProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as TeamsView)}>
      <TabsList>
        <TabsTrigger value="table">Table</TabsTrigger>
        <TabsTrigger value="squad">Squad</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export { TeamsViewSwitcher }
export type { TeamsView, TeamsViewSwitcherProps }
