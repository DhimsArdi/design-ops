"use client"

// Who is signed in, as the rest of the app sees them (docs/PRD.MD §6.1).
//
// Three things have to be joined to answer that, and each lives somewhere
// different:
//
//   Supabase Auth   the login — id and email, held in the session
//   profiles        the account — name, design role, preferences, and the link
//   designers       the person — squad, project assignments, squad leadership
//
// The session half comes down through context (DataProvider already holds it,
// and it is the only place that learns about a sign-in). The other two are read
// straight out of the shared cache, so this hook re-renders its callers when
// the profile changes — including when the change was made in another tab.

import { createContext, useContext, useMemo, type ReactNode } from "react"

import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as profileRepository from "@/lib/repositories/profileRepository"
import * as designerRepository from "@/lib/repositories/designerRepository"
import type { Designer, Profile } from "@/lib/domain/types"
import { preferencesOf, type UserPreferences } from "./preferences"

interface AuthUser {
  id: string
  email: string
}

const AuthUserContext = createContext<AuthUser | null>(null)

export function AuthUserProvider({
  user,
  children,
}: {
  user: AuthUser
  children: ReactNode
}) {
  // Memoized on the two fields, not on `user`: callers pass an object literal,
  // so holding the reference itself would change identity on every render of
  // the provider and re-run every consumer's memo with it.
  const value = useMemo(() => ({ id: user.id, email: user.email }), [user.id, user.email])
  return <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>
}

export interface CurrentUser {
  id: string
  /** From Supabase Auth, which is the only source of truth for it (docs/DECISIONS.md). */
  email: string
  /** Undefined only in the window before the account's row exists (see profileRepository.ensure). */
  profile: Profile | undefined
  /** The Designer this account is, if it has been linked. Undefined otherwise — a complete account, just not a person in the planning data. */
  designer: Designer | undefined
  /** `profile.designer_id`, hoisted because it is what every people picker compares against. */
  designerId: string | null
  /** The person record's name when linked, the account's own otherwise. Empty for a brand-new account that has not been named yet. */
  fullName: string
  /** Same resolution as `fullName`. */
  jobTitle: string
  /** `fullName`, or the email when there is no name yet — for chrome that must always render something. */
  displayName: string
  preferences: UserPreferences
}

/**
 * The signed-in user. Returns null only outside the authenticated tree — the
 * public auth routes (/forgot-password, /reset-password) render outside
 * DataProvider, so this is the honest answer there rather than a crash.
 */
export function useCurrentUser(): CurrentUser | null {
  const authUser = useContext(AuthUserContext)
  const [profiles] = useRepositoryList(profileRepository)
  const [designers] = useRepositoryList(designerRepository)

  return useMemo(() => {
    if (!authUser) return null

    const profile = profiles.find((row) => row.id === authUser.id)
    const designer = profile?.designer_id
      ? designers.find((row) => row.id === profile.designer_id)
      : undefined

    // Reading the person record first is deliberate: while the two are linked
    // the Designer row is the name the whole app renders, so preferring the
    // profile's copy here would make Settings the one screen disagreeing with
    // everything else if an admin renamed them in Master Data
    // (docs/DECISIONS.md).
    const fullName = designer?.name || profile?.full_name || ""
    const jobTitle = designer?.job_title || profile?.job_title || ""

    return {
      id: authUser.id,
      email: authUser.email,
      profile,
      designer,
      designerId: profile?.designer_id ?? null,
      fullName,
      jobTitle,
      displayName: fullName || authUser.email,
      preferences: preferencesOf(profile),
    }
  }, [authUser, profiles, designers])
}

/**
 * Just the preferences, for the screens that want a setting rather than an
 * identity — the Timeline's default scale, the date picker's first weekday.
 * Falls back to the defaults outside the authenticated tree.
 */
export function useUserPreferences(): UserPreferences {
  const currentUser = useCurrentUser()
  return currentUser?.preferences ?? preferencesOf(undefined)
}

/**
 * The designer id to compare people against when rendering "(Me)", or null.
 * Separate from useCurrentUser only so the pickers can say what they need.
 */
export function useCurrentDesignerId(): string | null {
  return useCurrentUser()?.designerId ?? null
}
