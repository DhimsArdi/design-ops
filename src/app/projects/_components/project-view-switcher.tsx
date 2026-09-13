"use client"

// Board / List / Table segmented control — replaces the old Active /
// Completed / All lifecycle tabs (Projects page revamp). Same Tabs
// primitive, same segmented-control shape; view mode and lifecycle status
// are unrelated concepts now, so this only ever switches *how* the list
// renders, never *which* projects are in it.

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ProjectView = "board" | "list" | "table"

interface ProjectViewSwitcherProps {
  value: ProjectView
  onChange: (next: ProjectView) => void
}

function ProjectViewSwitcher({ value, onChange }: ProjectViewSwitcherProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ProjectView)}>
      <TabsList>
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="list">List</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export { ProjectViewSwitcher }
export type { ProjectView, ProjectViewSwitcherProps }
