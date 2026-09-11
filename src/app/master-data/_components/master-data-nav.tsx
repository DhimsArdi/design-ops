"use client"

// Route-based sub-navigation between the five master data sections
// (PRD §14.9/§15). Plain links, not the Tabs primitive — this switches
// pages, it does not switch panels within one page.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { label: "Designers", href: "/master-data/designers" },
  { label: "Squads", href: "/master-data/squads" },
  { label: "Departments", href: "/master-data/departments" },
  { label: "Epics", href: "/master-data/epics" },
  { label: "Stakeholders", href: "/master-data/stakeholders" },
]

export function MasterDataNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-5 border-b border-border">
      {SECTIONS.map((section) => {
        const active = pathname === section.href
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground transition-colors",
              "hover:text-foreground",
              active && "border-foreground text-foreground"
            )}
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
