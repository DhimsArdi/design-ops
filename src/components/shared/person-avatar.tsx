// Thin convenience layer over the existing shadcn Avatar primitives
// (src/components/ui/avatar.tsx). Turns a {id, name, avatar} entry
// (Designer.avatar per PRD §8.1 is either initials text or an image URL — no
// upload flow in MVP) into a rendered avatar with the right fallback.
// Generic over any person-like entity, not just Designer.

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type AvatarSize = "default" | "sm" | "lg"

interface PersonAvatarInput {
  id: string
  name: string
  avatar?: string
}

function isImageSrc(avatar: string) {
  return avatar.startsWith("http") || avatar.startsWith("/") || avatar.startsWith("data:")
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function fallbackText(person: PersonAvatarInput) {
  if (person.avatar && !isImageSrc(person.avatar)) return person.avatar
  return initialsFromName(person.name)
}

interface PersonAvatarProps {
  person: PersonAvatarInput
  size?: AvatarSize
  className?: string
}

function PersonAvatar({ person, size = "default", className }: PersonAvatarProps) {
  const hasImage = Boolean(person.avatar && isImageSrc(person.avatar))

  return (
    <Avatar size={size} className={className} title={person.name}>
      {hasImage ? <AvatarImage src={person.avatar} alt={person.name} /> : null}
      <AvatarFallback>{fallbackText(person)}</AvatarFallback>
    </Avatar>
  )
}

export { PersonAvatar }
export type { PersonAvatarInput, PersonAvatarProps }
