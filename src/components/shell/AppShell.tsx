"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarRange,
  FolderKanban,
  Users,
  UsersRound,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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

const SIDEBAR_COLLAPSED_KEY = "dpp-sidebar-collapsed"

function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const activeItem = NAV_ITEMS.find((item) =>
    isNavItemActive(pathname, item.href)
  )
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
      setCollapsed(true)
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }

  return (
    <div className="flex h-svh min-w-[768px] gap-2 overflow-hidden bg-muted p-2 pl-0 text-foreground">
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              Design Portfolio Planner
            </span>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleCollapsed}
                  aria-label={
                    collapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                  className="text-sidebar-foreground/70 hover:bg-foreground/5 hover:text-sidebar-foreground"
                />
              }
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
        <Separator className="bg-sidebar-border/60" />
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-0.5 p-2">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href)
              const Icon = item.icon
              const navButton = (
                <Button
                  variant="ghost"
                  size={collapsed ? "icon" : "default"}
                  nativeButton={false}
                  aria-label={collapsed ? item.label : undefined}
                  render={
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                    />
                  }
                  className={cn(
                    "text-sidebar-foreground/70",
                    active
                      ? "bg-background text-foreground shadow-xs"
                      : "hover:bg-foreground/5 hover:text-sidebar-foreground",
                    collapsed ? "mx-auto" : "w-full justify-start"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && item.label}
                </Button>
              )

              if (!collapsed) return <div key={item.href}>{navButton}</div>

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={navButton} />
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
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
