"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarRange,
  FolderKanban,
  Users,
  UsersRound,
  Database,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Timeline", href: "/timeline", icon: CalendarRange },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "People", href: "/people", icon: Users },
  { label: "Teams", href: "/teams", icon: UsersRound },
  { label: "Master Data", href: "/master-data", icon: Database },
]

function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const activeItem = NAV_ITEMS.find((item) =>
    isNavItemActive(pathname, item.href)
  )

  return (
    <div className="flex h-svh min-w-[768px] overflow-hidden bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 shrink-0 items-center px-4">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Design Portfolio Planner
          </span>
        </div>
        <Separator className="bg-sidebar-border" />
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-0.5 p-2">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active &&
                      "border-l-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-border px-6">
          <h1 className="text-sm font-medium text-foreground">
            {activeItem?.label ?? "Design Portfolio Planner"}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

export { AppShell }
