// The signed-in user's preferences, resolved (docs/PRD.MD §14.10).
//
// One place decides what each preference falls back to, so no screen invents
// its own default and none of them can drift apart. The values here are the
// same ones the database columns default to (supabase/schema.sql) — a profile
// that has never been saved and a profile saved with everything untouched
// behave identically.
//
// Framework-agnostic on purpose: the inline theme script in the document head
// runs before React exists and reads DEFAULT_PREFERENCES.theme from here too.

import type {
  LandingPage,
  Language,
  Theme,
  TimelineView,
  WeekStartDay,
} from "@/lib/domain/enums";
import type { Profile } from "@/lib/domain/types";

export interface UserPreferences {
  language: Language;
  /** IANA zone name. */
  timezone: string;
  weekStartsOn: WeekStartDay;
  defaultLandingPage: LandingPage;
  defaultTimelineView: TimelineView;
  theme: Theme;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: "en",
  timezone: "Asia/Jakarta",
  weekStartsOn: "monday",
  defaultLandingPage: "overview",
  defaultTimelineView: "month",
  theme: "light",
};

/** `profile` is undefined while the account has no row yet — the defaults are what the app runs on until it does. */
export function preferencesOf(profile: Profile | undefined): UserPreferences {
  if (!profile) return DEFAULT_PREFERENCES;
  return {
    language: profile.language,
    timezone: profile.timezone,
    weekStartsOn: profile.week_starts_on,
    defaultLandingPage: profile.default_landing_page,
    defaultTimelineView: profile.default_timeline_view,
    theme: profile.theme,
  };
}

/**
 * `week_starts_on` as the 0-6 index every date library in the tree wants
 * (react-day-picker's `weekStartsOn`, date-fns' locale option). The one place
 * that translation happens — no screen hardcodes a 0 or a 1 of its own.
 */
export function weekStartIndex(weekStartsOn: WeekStartDay): 0 | 1 {
  return weekStartsOn === "sunday" ? 0 : 1;
}
