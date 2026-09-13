"use client"

// Decides whether a route gets the application (sign-in gate, data cache,
// sidebar) or renders on its own (docs/PRD.MD §6.2).
//
// Password recovery is the only thing in the product that a signed-out person
// is supposed to reach, and it cannot live behind the gate: the whole point is
// that they can't sign in. So these two routes render bare — no DataProvider,
// no AppShell, no navigation to a place they have no session for.
//
// Done with a pathname check rather than Next's route groups because the group
// that owns DataProvider would have to be the one every existing route moved
// into. Two paths in a list is a smaller thing to understand, and to undo, than
// relocating thirty files.

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { DataProvider } from "./data-provider"
import { AppShell } from "@/components/shell/AppShell"

/** Reachable without a session. Both are part of the sign-in flow, not the app. */
const PUBLIC_ROUTES = ["/forgot-password", "/reset-password"]

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (PUBLIC_ROUTES.includes(pathname)) return <>{children}</>

  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  )
}
