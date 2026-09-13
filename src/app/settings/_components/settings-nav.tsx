"use client"

// Sub-navigation between the three Settings pages (docs/PRD.MD §14.10).
//
// Two presentations of one list, because the room available differs by an order
// of magnitude: a vertical rail beside the content on wide screens, and the
// same underlined row MasterDataNav already uses below that. Not a dropdown at
// narrow widths — three items fit on one line in any language the app renders,
// and a select would hide two of them behind a tap for no gain.
//
// Plain links, like MasterDataNav: this switches pages, it does not switch
// panels within one.

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const SECTIONS = [
  { label: "General", href: "/settings/general" },
  { label: "Profile", href: "/settings/profile" },
  { label: "Security", href: "/settings/security" },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings"
      className="flex gap-5 border-b border-border lg:w-44 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:border-b-0"
    >
      {SECTIONS.map((section) => {
        const active = pathname === section.href
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-foreground text-foreground",
              // Rail: the active marker becomes a filled row rather than an
              // underline, which would sit in the wrong place on a vertical list.
              "lg:rounded-md lg:border-b-0 lg:px-2.5 lg:py-2 lg:pb-2 lg:hover:bg-muted",
              active && "lg:bg-muted lg:text-foreground"
            )}
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
