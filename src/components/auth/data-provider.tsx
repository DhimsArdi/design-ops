"use client"

// The app's boot sequence: authenticate, fill the cache, then render.
//
// The gate before `children` is not optional. Pages read their data
// synchronously during render, and several read it exactly once on mount — if
// they rendered before dataStore.loadAll() resolved they would each show an
// empty table and never recover.

import { useEffect, useRef, useState, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import { loadAll, subscribeRealtime } from "@/lib/store/dataStore"
import * as profileRepository from "@/lib/repositories/profileRepository"
import { AuthUserProvider } from "@/lib/identity/current-user"
import { ThemeSync } from "@/components/shell/theme-sync"
import { LoginView } from "./login-view"

type Phase =
  | { kind: "checking" }
  | { kind: "signed-out" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "failed"; message: string }

export function DataProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const [session, setSession] = useState<Session | null>(null)

  // Which account the phase below currently describes. Compared rather than
  // assumed, because onAuthStateChange fires for things that are not a change
  // of user: a token refresh, and — since Settings → Security — the deliberate
  // re-sign-in that proves someone knows their current password. Treating
  // those as a new sign-in would drop the app back to "loading" for a user id
  // the effect below has already loaded, and nothing would ever finish it.
  const currentUserId = useRef<string | undefined>(undefined)

  // Fires once with the restored session on subscribe, so it covers the
  // initial check as well as later sign-in/sign-out.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)

      const nextUserId = next?.user.id
      if (nextUserId === currentUserId.current) return
      currentUserId.current = nextUserId
      setPhase(nextUserId ? { kind: "loading" } : { kind: "signed-out" })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const email = session?.user.email ?? ""

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    loadAll().then(
      async () => {
        if (cancelled) return
        // Accounts created before supabase/migrations/002_profiles.sql ran get
        // their row here rather than meeting an empty Settings page. Normally
        // this finds one already in the cache and does nothing.
        try {
          await profileRepository.ensure(userId, defaultNameFromEmail(email))
        } catch {
          // A missing profile degrades to the default preferences and an empty
          // name — worth continuing for, not worth blocking the app on.
        }
        if (cancelled) return
        unsubscribe = subscribeRealtime()
        setPhase({ kind: "ready" })
      },
      (error: unknown) => {
        if (cancelled) return
        setPhase({
          kind: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      },
    )

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [userId, email])

  if (phase.kind === "signed-out") return <LoginView />

  if (phase.kind === "failed") {
    return (
      <BootMessage
        title="Couldn't load your data"
        detail={phase.message}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            Try again
          </button>
        }
      />
    )
  }

  if (phase.kind !== "ready" || !userId) return <BootMessage title="Loading…" />

  return (
    <AuthUserProvider user={{ id: userId, email }}>
      {/* Applies the account's theme preference once the profile is in the
          cache, and follows the OS from then on while it is "system". */}
      <ThemeSync />
      {children}
    </AuthUserProvider>
  )
}

/** "dimas.aditya@bni.co.id" -> "Dimas Aditya". A first value for a name field the user then owns — the same rule the database trigger uses. */
function defaultNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? ""
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function BootMessage({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {detail ? (
        <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      ) : null}
      {action}
    </div>
  )
}
