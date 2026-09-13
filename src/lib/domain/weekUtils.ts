// Monday-start ISO week utilities for Project Weekly Focus (docs/PRD.MD
// §8.9, §14.2 Week View). Framework-agnostic — shared by selectors, the
// Add/Edit Project form, and the Timeline Week View presentation component.
//
// A "week" is always identified by its Monday, as a "YYYY-MM-DD" string —
// the same representation ProjectWeeklyFocus.week_start_date uses. No date
// library: domain code stays string-first (see docs/PRD.MD §35), and week
// arithmetic is simple enough to do directly. date-fns entered the tree with
// the vendored Timeline Gantt and stays confined to it (docs/DECISIONS.md).
//
// Internally UTC-anchored, and it never hands a Date out — so it cannot
// collide with dateUtils.ts, which is local-midnight by design.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function toISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDate(date: Date, delta: number): Date {
  return new Date(date.getTime() + delta * MS_PER_DAY);
}

/** The Monday (as a Date) of the week containing `date`. */
function mondayOf(date: Date): Date {
  const day = date.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const shift = day === 0 ? -6 : 1 - day;
  return addDaysToDate(date, shift);
}

/** `weekStart` shifted by `delta` weeks (may be negative). */
export function addWeeks(weekStart: string, delta: number): string {
  return toISODate(addDaysToDate(parseISODate(weekStart), delta * 7));
}

/** The Monday ("YYYY-MM-DD") that starts today's week. */
export function currentWeekStart(): string {
  // Read today's calendar date in the LOCAL zone, then re-anchor it to UTC so
  // mondayOf's getUTCDay() reads the weekday the user actually sees. Passing a
  // bare `new Date()` mixes the two: east of Greenwich, Monday 00:30 local is
  // still Sunday in UTC, which returned the *previous* week's Monday.
  const now = new Date();
  return toISODate(mondayOf(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))));
}

/** The Monday ("YYYY-MM-DD") of the week containing `date` ("YYYY-MM-DD"). */
export function weekStartOf(date: string): string {
  return toISODate(mondayOf(parseISODate(date)));
}

/** Inclusive list of Monday "YYYY-MM-DD" week-starts from range.start to range.end. */
export function listWeeks(range: { start: string; end: string }): string[] {
  const weeks: string[] = [];
  let cursor = range.start;
  let iterations = 0;
  while (cursor <= range.end && iterations < 1000) {
    weeks.push(cursor);
    cursor = addWeeks(cursor, 1);
    iterations += 1;
  }
  return weeks;
}

/**
 * The "YYYY-MM" month that owns this week, for grouping the Week View header
 * and for looking up that month's ProjectMonthlyTarget phase. Convention: a
 * week belongs to the month its Monday falls in (docs/DECISIONS.md) — a week
 * that spans a month boundary is not split across two groups.
 */
export function monthOfWeek(weekStart: string): string {
  return weekStart.slice(0, 7);
}

/** ISO-8601 week-of-year number (1-53) for a Monday-start week. */
export function isoWeekNumber(weekStart: string): number {
  const monday = parseISODate(weekStart);
  const thursday = addDaysToDate(monday, 3);
  const firstJanOfThatYear = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const diffDays = Math.round((thursday.getTime() - firstJanOfThatYear.getTime()) / MS_PER_DAY);
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Every Monday that falls on or after the 1st of `startMonth` and on or
 * before the last day of `endMonth` ("YYYY-MM" each) — the week options a
 * project's Timeline & Planning step offers, bounded to its own date range.
 */
export function mondaysInMonthRange(startMonth: string, endMonth: string): string[] {
  const [startYear, startMon] = startMonth.split("-").map(Number);
  const [endYear, endMon] = endMonth.split("-").map(Number);
  if (!startYear || !startMon || !endYear || !endMon) return [];

  const firstOfStart = new Date(Date.UTC(startYear, startMon - 1, 1));
  const lastOfEnd = new Date(Date.UTC(endYear, endMon, 0));
  if (lastOfEnd.getTime() < firstOfStart.getTime()) return [];

  let cursor = mondayOf(firstOfStart);
  if (cursor.getTime() < firstOfStart.getTime()) cursor = addDaysToDate(cursor, 7);

  const weeks: string[] = [];
  let iterations = 0;
  while (cursor.getTime() <= lastOfEnd.getTime() && iterations < 1000) {
    weeks.push(toISODate(cursor));
    cursor = addDaysToDate(cursor, 7);
    iterations += 1;
  }
  return weeks;
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-09-07" -> "Sep 7". */
export function formatWeekShortLabel(weekStart: string): string {
  return SHORT_DATE_FORMATTER.format(parseISODate(weekStart));
}

/** "2026-09-07" -> "Sep 7 – 13, 2026" (the Sunday that ends the week; spells out the month again if the week crosses a month boundary). */
export function formatWeekRangeLabel(weekStart: string): string {
  const monday = parseISODate(weekStart);
  const sunday = addDaysToDate(monday, 6);
  const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
  const start = SHORT_DATE_FORMATTER.format(monday);
  const end = sameMonth ? DAY_FORMATTER.format(sunday) : SHORT_DATE_FORMATTER.format(sunday);
  const year = sunday.getUTCFullYear();
  return `${start} – ${end}, ${year}`;
}

/** "2026-09" -> "SEP 2026" (Week View month/year group header). */
export function formatWeekGroupMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  if (!year || !monthNum) return month;
  return MONTH_YEAR_FORMATTER.format(new Date(Date.UTC(year, monthNum - 1, 1))).toUpperCase();
}
