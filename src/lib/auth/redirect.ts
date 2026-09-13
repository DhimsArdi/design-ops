// Where a Supabase Auth email should send someone back to (docs/PRD.MD §6.2).
//
// Built from the origin the browser is actually on, so the same build works on
// localhost, on a preview deployment and in production without an environment
// variable to forget. No hostname is written down anywhere in this codebase.
//
// Supabase still has to allow the resulting URL: the project's
// Authentication → URL Configuration must list each origin (a wildcard such as
// https://*.vercel.app covers previews). A URL that is not on that list is
// silently replaced with the project's Site URL — the email still arrives, it
// just lands somewhere else.

/** Absolute URL for `path` on the current origin, e.g. "/reset-password" -> "https://designops.example.com/reset-password". */
export function authRedirectUrl(path: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URL(path, window.location.origin).toString();
}
