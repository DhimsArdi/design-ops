// Shared password rules and error wording (docs/PRD.MD §6.2).
//
// Three screens set a password — Settings → Security, /reset-password, and any
// future invitation flow — and they have to agree on the minimum and on what a
// refusal reads like, or the app tells the same user two different stories
// about the same rule.

/**
 * Supabase's own default. Deliberately not stricter: a rule the project does
 * not enforce would be a rule this form invents, and complexity requirements
 * push people towards reused passwords more reliably than they push them
 * towards strong ones. Raise the project's policy first if this needs to go up.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Turns a Supabase Auth message into one worth reading.
 *
 * Only the cases a user can act on are translated. Anything else falls through
 * to a plain sentence rather than a raw API string — "AuthApiError: New
 * password should be different from the old password." tells them what to do;
 * "Unexpected failure, please check server logs" does not.
 */
export function describePasswordError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("should be different")) {
    return "Your new password must be different from your current one.";
  }
  if (normalized.includes("at least") || normalized.includes("password should be")) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (normalized.includes("weak") || normalized.includes("pwned") || normalized.includes("compromis")) {
    return "That password has appeared in a known data breach. Choose a different one.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (normalized.includes("expired") || normalized.includes("invalid") || normalized.includes("session")) {
    return "Your session has expired. Sign in again and retry.";
  }
  return "Your password couldn't be updated. Try again.";
}
