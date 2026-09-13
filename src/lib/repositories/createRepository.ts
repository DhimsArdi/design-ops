// Generic repository factory over the Supabase-backed cache (docs/PRD.MD §34).
//
// One instance of this per entity gives it getAll/getById/create/update on top
// of dataStore. The API is deliberately unchanged from the localStorage version
// it replaced — still synchronous, still plain arrays — which is why moving to
// a real database touched none of the selectors and almost none of the UI.
//
// Synchronous writes over an asynchronous database work because they are
// optimistic: the cache updates in this tick and the row goes to Supabase in
// the background, with a failed write refetching the table (see dataStore).
// That is the right trade for this app — every mutation here is one person
// editing one row of their own team's planning data, not something where a
// silently-lost write would be dangerous.

import * as store from "@/lib/store/dataStore";
import type { TableName } from "@/lib/store/dataStore";

interface Entity {
  id: string;
}

export interface Repository<T extends Entity> {
  getAll(): T[];
  getById(id: string): T | undefined;
  create(data: Omit<T, "id">): T;
  update(id: string, patch: Partial<Omit<T, "id">>): T | undefined;
}

export function createRepository<T extends Entity>(
  table: TableName,
): Repository<T> {
  function getAll(): T[] {
    return store.getTable<T>(table);
  }

  function getById(id: string): T | undefined {
    return getAll().find((item) => item.id === id);
  }

  function create(data: Omit<T, "id">): T {
    // The id is generated here, not by the database's default, so create() can
    // return a complete record synchronously — callers use that id immediately
    // (the project form creates a project then its assignments in one submit).
    const record = { ...data, id: crypto.randomUUID() } as T;
    store.write(table, [...getAll(), record], (from) => from.insert(record));
    return record;
  }

  function update(id: string, patch: Partial<Omit<T, "id">>): T | undefined {
    let updated: T | undefined;
    const next = getAll().map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch };
      return updated;
    });
    if (!updated) return undefined;
    // Cast because this factory is generic over T while `table` is just a
    // name — TypeScript can't tie the two together, so it can't check the patch
    // against that table's columns. The pairing is fixed one line at a time in
    // each entity repository (createRepository<Squad>("squads")) and the column
    // names are identical to the interface's fields by design.
    store.write(table, next, (from) =>
      from.update(patch as Record<string, unknown>).eq("id", id),
    );
    return updated;
  }

  return { getAll, getById, create, update };
}

// Opt-in hard-removal capability, layered on top of createRepository rather
// than added to Repository<T> itself — master-data entities and Project use
// plain createRepository and must stay hard-delete-free (docs/DECISIONS.md).
// Only child relationship rows with no historical-identity requirement of
// their own (ProjectAssignment, ProjectMonthlyTarget — PRD §25) use this.
export interface RemovableRepository<T extends Entity> extends Repository<T> {
  /** Deletes the record with this id. Returns the removed record, or undefined if no record had this id. */
  remove(id: string): T | undefined;
}

export function createRemovableRepository<T extends Entity>(
  table: TableName,
): RemovableRepository<T> {
  const base = createRepository<T>(table);

  function remove(id: string): T | undefined {
    const removed = base.getById(id);
    if (!removed) return undefined;
    store.write(
      table,
      base.getAll().filter((item) => item.id !== id),
      (from) => from.delete().eq("id", id),
    );
    return removed;
  }

  return { ...base, remove };
}
