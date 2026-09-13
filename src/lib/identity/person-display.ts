// How a person's name is written when one of them is you (docs/PRD.MD §14.11).
//
// The rule is one line long, which is exactly why it lives in one place: it is
// applied in five different pickers, and five copies of `person.id === me ? ...`
// is how the label ends up reading "Me" in one of them and "(you)" in another.
//
// "(Me)" is a suffix, never a replacement. The list still has to say who the
// row is — a squad lead called "Me" is unreadable to the next person who opens
// the record, and the value written is always the real designer id, never a
// sentinel (docs/DECISIONS.md).

interface NamedPerson {
  id: string;
  name: string;
}

/**
 * True when this person record is the signed-in user's own.
 *
 * `currentDesignerId` is `Profile.designer_id` — null for an account with no
 * person record, in which case nothing matches and every name renders plainly.
 */
export function isCurrentPerson(
  personId: string,
  currentDesignerId: string | null | undefined,
): boolean {
  return Boolean(currentDesignerId) && personId === currentDesignerId;
}

/** "Dimas Aditya (Me)" for the signed-in user, "Sarah Putri" for everyone else. */
export function personDisplayName(
  person: NamedPerson,
  currentDesignerId: string | null | undefined,
): string {
  return isCurrentPerson(person.id, currentDesignerId)
    ? `${person.name} (Me)`
    : person.name;
}

/**
 * Two initials from a name, for an avatar with no image: "Dimas Aditya" -> DA,
 * "Sarah" -> SA. Matches what PersonAvatar derives for a Designer, so the same
 * human gets the same initials in Settings and in a squad list.
 */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
