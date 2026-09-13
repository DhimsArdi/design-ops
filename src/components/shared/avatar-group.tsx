// Stacked-avatars summary for a small set of people (Board cards, List rows,
// Table's Designers column — Projects page revamp). Built on the existing
// AvatarGroup/AvatarGroupCount primitives in components/ui/avatar.tsx (they
// already carry the overlap/ring/size styling — this just turns a list of
// people into PersonAvatars inside them, the same "thin convenience layer"
// PersonAvatar itself already is over the base Avatar primitives).

import {
  AvatarGroup as AvatarGroupPrimitive,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { PersonAvatar, type PersonAvatarInput } from "@/components/shared/person-avatar"
import { cn } from "cn"

interface AvatarGroupProps {
  people: PersonAvatarInput[]
  /** How many avatars to show before collapsing the rest into a "+N" circle. */
  max?: number
  size?: "default" | "sm" | "lg"
  /** Shown in place of avatars when `people` is empty. */
  emptyLabel?: string
  className?: string
}

function AvatarGroup({ people, max = 3, size = "sm", emptyLabel = "Unassigned", className }: AvatarGroupProps) {
  if (people.length === 0) {
    return <span className={cn("text-sm text-muted-foreground", className)}>{emptyLabel}</span>
  }

  const visible = people.slice(0, max)
  const overflow = people.length - visible.length

  return (
    // AvatarGroupCount's size follows its sibling Avatars' own data-size
    // (see components/ui/avatar.tsx's group-has-data-[size=…] selectors) —
    // nothing else needs to know the size here.
    <AvatarGroupPrimitive className={className}>
      {visible.map((person) => (
        <PersonAvatar key={person.id} person={person} size={size} />
      ))}
      {overflow > 0 ? <AvatarGroupCount>+{overflow}</AvatarGroupCount> : null}
    </AvatarGroupPrimitive>
  )
}

export { AvatarGroup }
export type { AvatarGroupProps }
