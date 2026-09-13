"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarRange,
  FolderKanban,
  Users,
  UsersRound,
  Database,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useCurrentUser } from "@/lib/identity/current-user"
import { initialsFromName } from "@/lib/identity/person-display"

import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as projectRepository from "@/lib/repositories/projectRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Key into the counts computed below — omitted for items with no useful "which one first" number (PRD §4.2: never a workload/capacity figure). */
  countKey?: "projects" | "people" | "teams"
}

// Two groups, not six flat items: Planning (day-to-day operational screens)
// vs. the one Administration screen (Master Data — system configuration, no
// project/people/team data of its own to show "at a glance"). Mirrors the
// task's own "Operational view ≠ Configuration view" mental model directly
// in navigation, not just in copy.
const PLANNING_ITEMS: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Timeline", href: "/timeline", icon: CalendarRange },
  { label: "Projects", href: "/projects", icon: FolderKanban, countKey: "projects" },
  { label: "People", href: "/people", icon: Users, countKey: "people" },
  { label: "Teams", href: "/teams", icon: UsersRound, countKey: "teams" },
]
const ADMIN_ITEMS: NavItem[] = [{ label: "Master Data", href: "/master-data", icon: Database }]

// Settings sits in the footer strip with the account, not in either group
// above: it configures the person using the app, not the work the app is about,
// and putting a gear between Timeline and Projects would make five workflow
// destinations look like six (docs/PRD.MD §7 — Settings is utility navigation).
// It is deliberately the only entry there, rather than being repeated inside
// the account menu as well.
const UTILITY_ITEMS: NavItem[] = [{ label: "Settings", href: "/settings", icon: Settings }]

// Every destination, for resolving the header title — not a render list.
const NAV_ITEMS: NavItem[] = [...PLANNING_ITEMS, ...ADMIN_ITEMS, ...UTILITY_ITEMS]

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

  // Same repository reads every other screen uses. These now track the shared
  // cache, so they follow edits made here and by anyone else (docs/DECISIONS.md:
  // Supabase behind a synchronous in-memory cache). Still only a nav-level
  // "roughly how big is this" figure, never a workload/capacity number.
  const [projects] = useRepositoryList(projectRepository)
  const [designers] = useRepositoryList(designerRepository)
  const [squads] = useRepositoryList(squadRepository)

  const counts = useMemo(
    () => ({
      // Same "Active Projects" predicate as Overview (§14.1/docs/DECISIONS.md): Planning + In Progress, non-archived.
      projects: projects.filter(
        (project) =>
          !project.is_archived && (project.status === "Planning" || project.status === "In Progress")
      ).length,
      people: designers.filter((designer) => designer.status === "Active").length,
      teams: squads.filter((squad) => squad.status === "Active").length,
    }),
    [projects, designers, squads]
  )

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
      // Read here rather than in a useState initializer on purpose: localStorage
      // doesn't exist during the server render, so seeding state from it would
      // be a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
              DesignOps
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
          <nav className="flex flex-col gap-3 p-2">
            <NavGroup
              heading="Planning"
              items={PLANNING_ITEMS}
              pathname={pathname}
              collapsed={collapsed}
              counts={counts}
            />
            <NavGroup
              heading="Administration"
              items={ADMIN_ITEMS}
              pathname={pathname}
              collapsed={collapsed}
              counts={counts}
            />
          </nav>
        </ScrollArea>
        <Separator className="bg-sidebar-border/60" />
        <div className="flex flex-col gap-0.5 p-2">
          <NavGroup
            items={UTILITY_ITEMS}
            pathname={pathname}
            collapsed={collapsed}
            counts={counts}
          />
          <AccountMenu collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <header className="flex h-14 shrink-0 items-center border-b border-border px-6">
          <h1 className="text-sm font-medium text-foreground">
            {activeItem?.label ?? "DesignOps"}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

/**
 * Who you're signed in as, and what you can do about it (docs/PRD.MD §14.10).
 *
 * Was a bare email and a Sign out button. Now that an account has a name and a
 * profile, it is the identity: initials, name, email, and a menu. Settings is
 * NOT repeated in that menu — it is the row directly above this one, and two
 * routes to the same page one centimetre apart is a menu that has stopped
 * meaning anything.
 */
function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const currentUser = useCurrentUser()

  const name = currentUser?.displayName ?? ""
  const email = currentUser?.email ?? ""
  const initials = initialsFromName(name || email)

  const trigger = (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "md"}
      aria-label={collapsed ? `Account: ${name || email}` : undefined}
      className={cn(
        "text-sidebar-foreground/70 hover:bg-foreground/8 hover:text-sidebar-foreground",
        collapsed ? "mx-auto" : "w-full justify-start gap-2 px-2"
      )}
    >
      <Avatar size="sm" aria-hidden>
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      {!collapsed ? (
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="w-full truncate text-left text-sm font-medium text-sidebar-foreground">
            {name || email}
          </span>
          {name && email ? (
            <span className="w-full truncate text-left text-xs font-normal text-sidebar-foreground/45">
              {email}
            </span>
          ) : null}
        </span>
      ) : null}
    </Button>
  )

  return (
    <DropdownMenu>
      {/* No tooltip on the collapsed avatar, unlike the nav items above it:
          those are links that go somewhere unannounced, while this opens a menu
          whose first line is the name and email the tooltip would have shown. */}
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="start" side="top" className="w-56">
        {/* A plain header, not DropdownMenuLabel: that primitive is Base UI's
            Menu.GroupLabel and throws unless it sits inside a Menu.Group. It
            would be the wrong element anyway — this names the account, it does
            not label a group of items below it. */}
        <div className="px-2 py-1.5">
          <span className="block truncate text-sm font-medium text-foreground">
            {name || email}
          </span>
          {name && email ? (
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings/profile" />}>
          <UserRound />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void supabase.auth.signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface NavGroupProps {
  /** Omitted for the footer strip, which is one unlabelled row rather than a titled section. */
  heading?: string
  items: NavItem[]
  pathname: string
  collapsed: boolean
  counts: Record<"projects" | "people" | "teams", number>
}

/** One labeled nav section (Planning / Administration) — the label itself is skipped while collapsed, since there's no room for it next to icon-only buttons. */
function NavGroup({ heading, items, pathname, collapsed, counts }: NavGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {heading && !collapsed ? (
        <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground/40 uppercase">
          {heading}
        </p>
      ) : null}
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href)
        const Icon = item.icon
        const count = item.countKey ? counts[item.countKey] : undefined
        const navButton = (
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "md"}
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
                : "hover:bg-foreground/8 hover:text-sidebar-foreground",
              collapsed ? "mx-auto" : "w-full justify-start"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed ? <span className="flex-1 truncate text-left">{item.label}</span> : null}
            {!collapsed && count !== undefined ? (
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  active ? "text-foreground/50" : "text-sidebar-foreground/45"
                )}
              >
                {count}
              </span>
            ) : null}
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
    </div>
  )
}

export { AppShell }
