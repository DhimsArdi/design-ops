// Account profile + preferences (docs/PRD.MD §6.1, §14.10).
//
// Reads come from the same in-memory cache as every other table, so
// `getById(userId)` is synchronous and a Settings form renders already filled
// in (docs/DECISIONS.md "Supabase behind a synchronous in-memory cache").
//
// Writes do NOT go through createRepository. Every other write in this app is
// optimistic and fire-and-forget, which is right for planning data edited a row
// at a time — but Settings has an explicit `Save changes` button that has to
// go busy, then either confirm or explain itself (PRD §14.10). That needs a
// promise, so `save` awaits PostgREST and only then touches the cache. Nothing
// appears saved that wasn't.

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import * as store from "@/lib/store/dataStore";
import type { Designer, Profile, Stakeholder } from "@/lib/domain/types";

const TABLE = "profiles" as const;

/** Columns a user may write to their own row. Mirrors the column-level GRANT in supabase/schema.sql — the database is the enforcement, this is the shape. */
export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "full_name"
    | "avatar_url"
    | "design_role"
    | "department_id"
    | "designer_id"
    | "stakeholder_id"
    | "language"
    | "timezone"
    | "week_starts_on"
    | "default_landing_page"
    | "default_timeline_view"
    | "theme"
  >
>;

export function getAll(): Profile[] {
  return store.getTable<Profile>(TABLE);
}

export function getById(id: string): Profile | undefined {
  return getAll().find((profile) => profile.id === id);
}

/**
 * Turns a PostgREST failure into something worth showing someone. Raw
 * messages are kept only where they say something a user can act on; the
 * constraint violations this table can actually produce are translated, and
 * anything else becomes a plain sentence (PRD §14.10).
 */
function describe(error: PostgrestError): string {
  // profiles_designer_id_key — two accounts cannot be the same person.
  if (error.code === "23505") {
    return "That team profile is already linked to another account.";
  }
  // RLS denial, or an attempt to write a column the GRANT doesn't cover
  // (system_role). Either way the user cannot fix it by retrying.
  if (error.code === "42501" || error.code === "PGRST301") {
    return "You don't have permission to change that.";
  }
  return error.message || "The change could not be saved.";
}

/**
 * Writes `patch` to this profile and returns the stored row. Rejects with a
 * readable Error if the database refuses it; the cache is left untouched in
 * that case, so the form still holds what the user typed.
 */
export async function save(id: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(describe(error));

  const saved = data as Profile;
  store.setLocal(
    TABLE,
    getAll().map((profile) => (profile.id === id ? saved : profile)),
  );
  return saved;
}

/**
 * Guarantees this account has a profile row, and returns it.
 *
 * Normally there is nothing to do: supabase/schema.sql creates one with the
 * account. This covers the gap for accounts that existed before that trigger
 * did and were missed by the backfill — without it those users would reach a
 * Settings page with nothing behind it. Every column has a database default,
 * so the insert only has to name the id.
 */
export async function ensure(id: string, fallbackName: string): Promise<Profile> {
  const existing = getById(id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ id, full_name: fallbackName }, { onConflict: "id", ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (error) throw new Error(describe(error));

  // `ignoreDuplicates` returns no row when one already existed (a second tab
  // won the race) — read it back rather than guessing at its contents.
  const created =
    (data as Profile | null) ??
    ((await supabase.from(TABLE).select().eq("id", id).single()).data as Profile);

  store.setLocal(TABLE, [...getAll().filter((profile) => profile.id !== id), created]);
  return created;
}

/**
 * Saves the identity fields from Settings → Profile, and — when this account
 * is linked to a Designer or a Stakeholder — writes the same name through to
 * that person record. At most one of `linkedDesignerId`/`linkedStakeholderId`
 * is expected to be non-null at a time (docs/DECISIONS.md), matching whichever
 * table `patch.designer_id`/`patch.stakeholder_id` just pointed at.
 *
 * The mirror is deliberate and one-way (docs/DECISIONS.md). `profiles` has to
 * hold the name regardless, because an account with no person record still has
 * one; the Designer/Stakeholder row has to hold it too, because that row is
 * what every planning screen renders — a squad list or a project's stakeholder
 * field showing a name the person themselves has already corrected in Settings
 * is the bug this prevents.
 *
 * Both writes are awaited. If the person-record write fails the profile write
 * stands, and the error surfaces — this is one person editing their own name,
 * not a transaction worth a stored procedure.
 */
export async function saveIdentity(
  id: string,
  patch: ProfilePatch,
  linkedDesignerId: string | null,
  linkedStakeholderId: string | null,
): Promise<Profile> {
  const saved = await save(id, patch);

  const mirrorsName = patch.full_name !== undefined;
  if (!mirrorsName) return saved;

  if (linkedDesignerId) {
    const { data, error } = await supabase
      .from("designers")
      .update({ name: patch.full_name })
      .eq("id", linkedDesignerId)
      .select()
      .single();

    if (error) throw new Error(describe(error));

    const designer = data as Designer;
    store.setLocal(
      "designers",
      store
        .getTable<Designer>("designers")
        .map((row) => (row.id === linkedDesignerId ? designer : row)),
    );
  } else if (linkedStakeholderId) {
    const { data, error } = await supabase
      .from("stakeholders")
      .update({ name: patch.full_name })
      .eq("id", linkedStakeholderId)
      .select()
      .single();

    if (error) throw new Error(describe(error));

    const stakeholder = data as Stakeholder;
    store.setLocal(
      "stakeholders",
      store
        .getTable<Stakeholder>("stakeholders")
        .map((row) => (row.id === linkedStakeholderId ? stakeholder : row)),
    );
  }

  return saved;
}
