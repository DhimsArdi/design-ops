"use client"

// Settings → General (docs/PRD.MD §14.10).
//
// Every field here is a preference, not data: nothing on this page changes what
// the team's plan says, only how this one account sees it. They are stored on
// the account's profile row rather than in localStorage so they follow the
// person to their next machine (docs/DECISIONS.md).
//
// Explicit save, matching every other form in the app (PRD §29.2): the button
// is inert until something actually differs, goes busy while the write is in
// flight, and confirms with a toast. Auto-save would be the wrong pattern for a
// screen where "default landing page" quietly changes where the app opens.

import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SettingsSection } from "@/components/shared/settings-section"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCurrentUser } from "@/lib/identity/current-user"
import * as profileRepository from "@/lib/repositories/profileRepository"
import {
  LANDING_PAGES,
  THEMES,
  TIMELINE_VIEWS,
  TIMEZONES,
  WEEK_START_DAYS,
  type LandingPage,
  type Theme,
  type TimelineView,
  type WeekStartDay,
} from "@/lib/domain/enums"

// Labels, kept beside the values they name so no screen invents its own
// wording for the same preference. The stored value is always the code.
const LANDING_PAGE_LABELS: Record<LandingPage, string> = {
  overview: "Overview",
  projects: "Projects",
  timeline: "Timeline",
}

const TIMELINE_VIEW_LABELS: Record<TimelineView, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
}

const WEEK_START_LABELS: Record<WeekStartDay, string> = {
  monday: "Monday",
  sunday: "Sunday",
}

const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
}

/**
 * "Asia/Jakarta" -> "Jakarta (GMT+7)". The offset is read from Intl rather than
 * written down, so a zone that observes daylight saving is labelled correctly
 * at both ends of the year instead of being wrong for half of it.
 */
function timezoneLabel(zone: string): string {
  const city = zone.split("/").pop()?.replace(/_/g, " ") ?? zone
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date())
    const offset = parts.find((part) => part.type === "timeZoneName")?.value
    return offset && offset !== city ? `${city} (${offset})` : city
  } catch {
    return city
  }
}

// Base UI's Select.Value renders the raw value unless the root is told how each
// one reads, so every Select on this page is given its label map.
const TIMEZONE_LABELS: Record<string, string> = Object.fromEntries(
  TIMEZONES.map((zone) => [zone, timezoneLabel(zone)]),
)

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  id: "Bahasa Indonesia",
}

export default function GeneralSettingsPage() {
  const currentUser = useCurrentUser()
  const saved = currentUser?.preferences

  // Seeded once from the cache, which DataProvider has already filled before
  // anything here renders — so the form opens on the real values rather than
  // showing defaults and correcting itself a moment later (task §49).
  const [timezone, setTimezone] = useState(saved?.timezone ?? "Asia/Jakarta")
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartDay>(saved?.weekStartsOn ?? "monday")
  const [landingPage, setLandingPage] = useState<LandingPage>(saved?.defaultLandingPage ?? "overview")
  const [timelineView, setTimelineView] = useState<TimelineView>(saved?.defaultTimelineView ?? "month")
  const [theme, setTheme] = useState<Theme>(saved?.theme ?? "light")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty =
    saved !== undefined &&
    (timezone !== saved.timezone ||
      weekStartsOn !== saved.weekStartsOn ||
      landingPage !== saved.defaultLandingPage ||
      timelineView !== saved.defaultTimelineView ||
      theme !== saved.theme)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentUser || !isDirty || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await profileRepository.save(currentUser.id, {
        timezone,
        week_starts_on: weekStartsOn,
        default_landing_page: landingPage,
        default_timeline_view: timelineView,
        theme,
      })
      // The theme change takes effect from here: ThemeSync is watching the
      // profile in the cache that save() just updated.
      toast.success("Preferences saved")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The change could not be saved.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title="General"
        description="Manage your default preferences across DesignOps."
      />

      <div className="space-y-8">
      <SettingsSection
        title="Regional"
        description="How dates and times are presented for your account."
      >
        <Field>
          <FieldLabel htmlFor="language">Language</FieldLabel>
          {/* English is the only value the app can render, so it is the only
              selectable one. Bahasa Indonesia stays visible and disabled rather
              than hidden: "not yet" is useful information, and removing it
              would make the field look like it had no reason to exist
              (PRD §14.10). Muted, not a warning colour — nothing is wrong. */}
          <Select value="en" onValueChange={() => {}} items={LANGUAGE_LABELS}>
            <SelectTrigger id="language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="id" disabled>
                <span className="flex w-full items-center justify-between gap-3">
                  <span>Bahasa Indonesia</span>
                  <span className="text-xs text-muted-foreground">Coming soon</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>
            DesignOps is available in English only. Bahasa Indonesia is not ready yet.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <Select
            value={timezone}
            onValueChange={(next) => setTimezone(next as string)}
            items={TIMEZONE_LABELS}
          >
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {TIMEZONE_LABELS[zone]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Used for the Timeline&apos;s day boundaries and its Today marker.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="week-starts-on">Week starts on</FieldLabel>
          <Select
            value={weekStartsOn}
            onValueChange={(next) => setWeekStartsOn(next as WeekStartDay)}
            items={WEEK_START_LABELS}
          >
            <SelectTrigger id="week-starts-on" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_START_DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {WEEK_START_LABELS[day]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Sets the first column of every date picker. Weekly Focus is always recorded against
            a Monday, so the Timeline&apos;s week columns stay Monday-based.
          </FieldDescription>
        </Field>
      </SettingsSection>

      <Separator />

      <SettingsSection title="Workspace defaults">
        <Field>
          <FieldLabel htmlFor="landing-page">Default landing page</FieldLabel>
          <Select
            value={landingPage}
            onValueChange={(next) => setLandingPage(next as LandingPage)}
            items={LANDING_PAGE_LABELS}
          >
            <SelectTrigger id="landing-page" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANDING_PAGES.map((page) => (
                <SelectItem key={page} value={page}>
                  {LANDING_PAGE_LABELS[page]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Where DesignOps opens after you sign in.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="timeline-view">Default timeline view</FieldLabel>
          <Select
            value={timelineView}
            onValueChange={(next) => setTimelineView(next as TimelineView)}
            items={TIMELINE_VIEW_LABELS}
          >
            <SelectTrigger id="timeline-view" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMELINE_VIEWS.map((view) => (
                <SelectItem key={view} value={view}>
                  {TIMELINE_VIEW_LABELS[view]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            The scale the Timeline opens on. Switching scale while you are there still wins for
            the rest of that visit.
          </FieldDescription>
        </Field>
      </SettingsSection>

      <Separator />

      <SettingsSection title="Appearance">
        <Field>
          <FieldLabel htmlFor="theme">Theme</FieldLabel>
          <Select value={theme} onValueChange={(next) => setTheme(next as Theme)} items={THEME_LABELS}>
            <SelectTrigger id="theme" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((value) => (
                <SelectItem key={value} value={value}>
                  {THEME_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            DesignOps is designed light first. Dark mode is available, and Match system follows
            your operating system.
          </FieldDescription>
        </Field>
      </SettingsSection>

      <Separator />

      {/* Polite: the message lands after the field the user was in and should
          not interrupt a correction in progress — same treatment as the
          sign-in form. */}
      <div aria-live="polite">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isDirty || submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
        {isDirty && !submitting ? (
          <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
        ) : null}
      </div>
      </div>
    </form>
  )
}
