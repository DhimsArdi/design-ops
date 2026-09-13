// Day-level date helpers for Project scheduling (docs/PRD.MD §8.2, §14.2).
//
// Project stores inclusive "YYYY-MM-DD" strings; the Timeline Gantt lays out
// with real Date instants over half-open ranges (end exclusive). This module is
// the only place those two representations meet — weekUtils.ts and everything
// above it stay string-in/string-out (docs/DECISIONS.md).
//
// Every Date built here is LOCAL midnight, because the Gantt measures and
// renders with local Date methods. `new Date("2026-09-01")` parses as UTC
// midnight, which renders a day early in any negative-offset zone — so it is
// never used. (weekUtils.ts is UTC-anchored internally and never hands a Date
// out, so the two conventions cannot collide.)

/** "2026-09-01" -> local midnight on that day. */
export function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/** Local-midnight Date -> "YYYY-MM-DD". */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `date` shifted by `delta` days. setDate() rather than ms arithmetic, so a 23h/25h DST day still counts as one day. */
export function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

/** An inclusive stored end date -> the exclusive instant the Gantt expects. */
export function toExclusiveEnd(end: string): Date {
  return addDays(parseDate(end), 1);
}

/** The Gantt's exclusive end instant -> an inclusive stored end date. */
export function fromExclusiveEnd(end: Date): string {
  return formatDate(addDays(end, -1));
}

/** "2026-09-14" -> "2026-09". The bridge for everything that still works per month (monthly targets, Person Timeline). */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** "2026-09" -> "2026-09-30". */
export function lastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  if (!year || !monthNum) return month;
  // Day 0 of the following month is the last day of this one.
  return formatDate(new Date(year, monthNum, 0));
}
