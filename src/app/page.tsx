"use client"

// The app's entry point. Sends you to whichever screen you set as your default
// landing page (docs/PRD.MD §14.10) — Overview unless you changed it.
//
// Client-side rather than the server `redirect()` this used to be: the answer
// lives on the signed-in account's profile, and there is no session on the
// server (the app talks to PostgREST straight from the browser — see
// src/lib/supabase/client.ts). Nothing flashes: this route only renders once
// DataProvider has the cache filled, so the preference is already known.

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useUserPreferences } from "@/lib/identity/current-user"

export default function RootPage() {
  const router = useRouter()
  const { defaultLandingPage } = useUserPreferences()

  useEffect(() => {
    router.replace(`/${defaultLandingPage}`)
  }, [router, defaultLandingPage])

  return null
}
