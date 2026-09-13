// Theme application (docs/PRD.MD §14.10).
//
// DesignOps is light-mode-first and has no theme library — `next-themes` was
// deliberately removed from this project once before (docs/DECISIONS.md). It is
// not being reinstalled for one three-value preference: every colour in the app
// is already a CSS variable, `globals.css` already ships a complete `.dark`
// block, and the whole mechanism is "put a class on <html>".
//
// The preference itself lives on the profile, in the database. It is mirrored
// into localStorage purely so the boot script below can read it synchronously —
// the database answer arrives several hundred milliseconds into the page, which
// is far too late to avoid a white flash for a user who chose dark.

import type { Theme } from "@/lib/domain/enums";
import { DEFAULT_PREFERENCES } from "@/lib/identity/preferences";

export const THEME_STORAGE_KEY = "dpp-theme";

/** Whether "system" currently means dark. Always false on the server. */
function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** The concrete theme a preference resolves to right now. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/**
 * Applies `theme` to the document and remembers it for the next boot.
 *
 * The class name is `dark` because that is what `globals.css` keys its palette
 * on (`@custom-variant dark (&:is(.dark *))` plus the `.dark { ... }` token
 * block) and what the shadcn primitives' own `dark:` utilities compile against.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  // The class is the only thing this writes. `color-scheme` rides along with
  // it from globals.css rather than being set here as an inline style — an
  // attribute written onto an element React also renders is a hydration
  // mismatch on every load.
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
  for (const listener of listeners) listener();

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode, or storage disabled. The theme still applies for this
    // page; only the head start on the next load is lost.
  }
}

/**
 * Runs before first paint, as the first thing in <body>. Inline and dependency
 * free by necessity — it executes before any bundle has loaded.
 *
 * It reads the mirrored preference rather than the database, so it is a guess:
 * a correct one for everyone but a user signing in on a new machine, who sees
 * light for one paint and then their real theme. That is the right trade —
 * the alternative is blocking the whole app on a network round trip.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(DEFAULT_PREFERENCES.theme)};
var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',d);
}catch(e){}})();`;

// ---------------------------------------------------------------------------
// Reading the resolved theme back
// ---------------------------------------------------------------------------
//
// For the handful of components that need the concrete answer rather than the
// preference — Sonner takes a "light" | "dark" of its own, because it renders
// into a portal outside the styled tree. The document is the source of truth
// here, not a second copy of the state: the boot script may well have set the
// class before any React code ran.

const listeners = new Set<() => void>();

export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getResolvedTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
