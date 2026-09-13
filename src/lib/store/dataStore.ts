// In-memory cache of every table, and the only thing that talks to Supabase
// (docs/DECISIONS.md "Supabase behind a synchronous in-memory cache").
//
// Why a cache rather than async repositories: the whole app reads data
// synchronously during render (repositories, selectors, 50 client components).
// Making those async would have meant rewriting every one of them. This data
// set is tiny — nine tables, demo-to-small-team scale — so holding all of it in
// memory and reading from there keeps the repository API synchronous and the UI
// untouched.
//
// What that costs, and how it's paid for:
//   - Staleness. Solved by realtime: any change made by anyone refetches that
//     table and re-renders (subscribeRealtime below).
//   - Write feedback. Writes are optimistic — the cache updates immediately and
//     the row goes to Supabase in the background. A failed write refetches the
//     table from the server (which is authoritative) and toasts.

import { toast } from "sonner";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export const TABLES = [
  "squads",
  "designers",
  "departments",
  "stakeholders",
  "epics",
  "projects",
  "project_assignments",
  "project_monthly_targets",
  "project_weekly_focus",
  // Shared (non-home) squad membership — Teams → Squad View (docs/PRD.MD §13.1).
  "squad_designer_memberships",
  // Account rows, cached alongside the planning tables so the signed-in user's
  // identity and preferences are readable synchronously wherever the rest of
  // the data is — which is what lets Settings render filled-in on first paint
  // instead of flashing defaults (docs/PRD.MD §14.10).
  "profiles",
] as const;

export type TableName = (typeof TABLES)[number];

// Shared frozen empty array: a table that hasn't loaded yet must hand out the
// same reference every time, or useSyncExternalStore re-renders forever.
const EMPTY: readonly never[] = Object.freeze([]);

const cache = new Map<TableName, readonly unknown[]>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Subscribes to any change in any table. Returns the unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The current rows of `table`, synchronously. The array reference only changes
 * when that table changes, so a component subscribed to one table doesn't
 * re-render because another one did.
 */
export function getTable<T>(table: TableName): T[] {
  return (cache.get(table) ?? EMPTY) as T[];
}

/**
 * Replaces a table's rows in the cache only, with nothing sent to Supabase.
 * For rows the database removes on its own: deleting a project cascades to its
 * assignments, monthly targets and weekly focus server-side, and this is how
 * those disappear from the screen without nine redundant DELETE requests.
 */
export function setLocal<T>(table: TableName, rows: readonly T[]): void {
  cache.set(table, rows);
  notify();
}

async function fetchTable(table: TableName): Promise<void> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;
  cache.set(table, data ?? []);
}

/**
 * Fills the cache from Supabase. Must finish before any page renders — pages
 * that read once on mount would otherwise see empty tables (see DataProvider).
 */
export async function loadAll(): Promise<void> {
  await Promise.all(TABLES.map(fetchTable));
  notify();
}

// A write triggers a realtime event of its own, and the project form reconciles
// assignments, monthly targets and weekly focus in one go — so a single save can
// fire well over a dozen events. Coalescing per table turns that into one
// refetch each.
const pendingReloads = new Map<TableName, ReturnType<typeof setTimeout>>();

// Writes this browser has sent but not yet heard back about, per table. A
// refetch that overtakes one of these would answer without it and wipe an edit
// the user just made from the screen — it would come back a moment later when
// that write's own realtime event arrived, but the flicker is real and shows up
// exactly when edits come fastest (dragging a Timeline bar, saving the project
// form's dozen-odd rows at once).
const inFlight = new Map<TableName, number>();

function reload(table: TableName): void {
  const existing = pendingReloads.get(table);
  if (existing) clearTimeout(existing);
  pendingReloads.set(
    table,
    setTimeout(() => {
      pendingReloads.delete(table);
      // Wait out our own unacknowledged writes; each one schedules a fresh
      // realtime event of its own, so nothing is lost by deferring here.
      if ((inFlight.get(table) ?? 0) > 0) {
        reload(table);
        return;
      }
      void fetchTable(table).then(notify, () => {
        // Offline or a dropped connection — the next realtime event or a reload
        // recovers. Nothing useful to show the user here.
      });
    }, 150),
  );
}

/**
 * Applies a write optimistically: `nextRows` becomes the cache immediately so
 * the UI updates in the same tick (which is what lets create/update/remove stay
 * synchronous), and `run` sends it to Supabase in the background. If the server
 * rejects it — an RLS denial, a constraint the UI didn't catch, a lost
 * connection — the table is refetched so what's on screen goes back to matching
 * what's actually stored.
 *
 * `alsoReloadOnError` names tables the caller already pruned with setLocal on
 * the strength of this write succeeding, so a failure restores those too.
 */
export function write<T>(
  table: TableName,
  nextRows: readonly T[],
  run: (
    from: ReturnType<typeof supabase.from>,
  ) => PromiseLike<{ error: PostgrestError | null }>,
  alsoReloadOnError: readonly TableName[] = [],
): void {
  setLocal(table, nextRows);
  inFlight.set(table, (inFlight.get(table) ?? 0) + 1);

  const settle = (error: PostgrestError | null, thrown?: unknown) => {
    inFlight.set(table, Math.max(0, (inFlight.get(table) ?? 1) - 1));
    if (!error && !thrown) return;
    toast.error("Couldn't save that change", {
      description:
        error?.message ??
        (thrown instanceof Error ? thrown.message : "The change was not saved."),
    });
    reload(table);
    for (const other of alsoReloadOnError) reload(other);
  };

  void Promise.resolve(run(supabase.from(table))).then(
    ({ error }) => settle(error),
    // A rejected promise rather than an `error` field means the request never
    // reached PostgREST at all (offline, DNS, a CORS failure).
    (thrown: unknown) => settle(null, thrown),
  );
}

/**
 * Keeps the cache in step with everyone else's edits. One subscription covers
 * the whole `public` schema; each event refetches just the table it names.
 * Refetching the whole table rather than patching the changed row keeps this
 * correct with no merge logic, and these tables are small enough that it costs
 * nothing.
 *
 * Requires the tables to be in the `supabase_realtime` publication — the last
 * section of supabase/schema.sql does that.
 */
export function subscribeRealtime(): () => void {
  const channel = supabase
    .channel("dpp-data")
    .on(
      "postgres_changes",
      { event: "*", schema: "public" },
      (payload: { table: string }) => {
        const table = payload.table as TableName;
        if (TABLES.includes(table)) reload(table);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
