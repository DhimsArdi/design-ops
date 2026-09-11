// Small, generic, SSR-safe wrapper around localStorage. UI components and
// pages must never call localStorage directly — always go through this
// (per docs/DECISIONS.md / docs/PRD.MD §34).
//
// Next.js renders on the server too, where `window`/`localStorage` don't
// exist, so every function guards on `typeof window !== "undefined"`.

const KEY_PREFIX = "dpp:v1:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

/** Reads and JSON-parses `key`, or returns `fallback` if absent, on the server, or on error. */
export function get<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** JSON-serializes and writes `value` under `key`. No-op on the server or on error (e.g. quota exceeded). */
export function set<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Ignore — localStorage can throw (quota exceeded, private browsing).
  }
}

/** Removes `key`. No-op on the server or on error. */
export function remove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    // Ignore.
  }
}

/** True if `key` already has a stored value — use before writing seed data so a refresh never overwrites existing data. */
export function hasSeeded(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(storageKey(key)) !== null;
  } catch {
    return false;
  }
}
