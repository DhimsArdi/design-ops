"use client"

// Keeps the document's theme matching the signed-in user's preference.
// Renders nothing (docs/PRD.MD §14.10).
//
// Two things can change the answer after boot: the user picking a different
// theme in Settings — which reaches here through the profile cache, so it also
// covers a change made in another tab — and, while the preference is `system`,
// the OS switching. Both are handled here so no screen has to.

import { useEffect } from "react"

import { useUserPreferences } from "@/lib/identity/current-user"
import { applyTheme } from "@/lib/theme/theme"

export function ThemeSync() {
  const { theme } = useUserPreferences()

  useEffect(() => {
    applyTheme(theme)

    if (theme !== "system") return
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyTheme("system")
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [theme])

  return null
}
