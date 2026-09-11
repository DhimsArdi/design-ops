// Generic localStorage-backed repository factory (docs/PRD.MD §34, §35).
//
// One instance of this per entity gives it getAll/getById/create/update on
// top of localStorageClient, seeded from that entity's seed array on first
// access only — never re-seeded once the storage key already holds data, so
// a page refresh never overwrites edits made through the UI.
//
// Deliberately minimal: no query builder, no caching, plain arrays held in
// localStorage and re-read on every call. This data set is small (single
// admin, single browser, demo-scale) so that is enough.

import * as storage from "@/lib/storage/localStorageClient";

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
  key: string,
  seedData: T[],
): Repository<T> {
  function ensureSeeded(): void {
    if (!storage.hasSeeded(key)) {
      storage.set(key, seedData);
    }
  }

  function getAll(): T[] {
    ensureSeeded();
    return storage.get<T[]>(key, seedData);
  }

  function getById(id: string): T | undefined {
    return getAll().find((item) => item.id === id);
  }

  function create(data: Omit<T, "id">): T {
    const record = { ...data, id: crypto.randomUUID() } as T;
    storage.set(key, [...getAll(), record]);
    return record;
  }

  function update(id: string, patch: Partial<Omit<T, "id">>): T | undefined {
    let updated: T | undefined;
    const next = getAll().map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch };
      return updated;
    });
    if (updated) storage.set(key, next);
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
  key: string,
  seedData: T[],
): RemovableRepository<T> {
  const base = createRepository<T>(key, seedData);

  function remove(id: string): T | undefined {
    const removed = base.getById(id);
    if (!removed) return undefined;
    storage.set(
      key,
      base.getAll().filter((item) => item.id !== id),
    );
    return removed;
  }

  return { ...base, remove };
}
