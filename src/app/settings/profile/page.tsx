"use client"

// Settings → Profile (docs/PRD.MD §6.1, §14.10).
//
// This is where an account stops being an anonymous email and becomes a person
// the planning data can point at. Three groups, in that order of consequence:
//
//   Personal details   name, job title, design role — what other people read
//   Team profile       which Designer record this account is (PRD §6.1)
//   Account            email and system role, both read-only here
//
// The last group is the important boundary. Design role is a job and the person
// owns it; system role is authorization and they must not. It is rendered, not
// offered — and the reason it cannot be edited is not that this page declines
// to show a control: the column is outside the UPDATE grant, so the database
// refuses it (supabase/schema.sql).

import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SettingsSection } from "../_components/settings-section"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PersonSelect } from "@/components/shared/person-select"

import { useCurrentUser } from "@/lib/identity/current-user"
import { initialsFromName } from "@/lib/identity/person-display"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as profileRepository from "@/lib/repositories/profileRepository"
import { DESIGN_ROLES, type DesignRole } from "@/lib/domain/enums"

const NO_DESIGN_ROLE = "__none__"

const DESIGN_ROLE_LABELS: Record<string, string> = {
  [NO_DESIGN_ROLE]: "Not set",
  ...Object.fromEntries(DESIGN_ROLES.map((role) => [role, role])),
}

export default function ProfileSettingsPage() {
  const currentUser = useCurrentUser()
  const [designers] = useRepositoryList(designerRepository)
  const [profiles] = useRepositoryList(profileRepository)

  const [fullName, setFullName] = useState(currentUser?.fullName ?? "")
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle ?? "")
  const [designRole, setDesignRole] = useState<string>(
    currentUser?.profile?.design_role ?? NO_DESIGN_ROLE,
  )
  const [designerId, setDesignerId] = useState<string | null>(currentUser?.designerId ?? null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNameError, setShowNameError] = useState(false)

  if (!currentUser) return null

  const trimmedName = fullName.trim()
  const nameIsMissing = trimmedName.length === 0

  const savedDesignRole = currentUser.profile?.design_role ?? NO_DESIGN_ROLE
  const isDirty =
    trimmedName !== currentUser.fullName ||
    jobTitle.trim() !== currentUser.jobTitle ||
    designRole !== savedDesignRole ||
    designerId !== currentUser.designerId

  // Every designer, minus the ones another account has already claimed. The
  // unique constraint on profiles.designer_id would reject those anyway; not
  // offering them is the difference between a rule and an error message.
  const claimedByOthers = new Set(
    profiles
      .filter((profile) => profile.id !== currentUser.id && profile.designer_id)
      .map((profile) => profile.designer_id as string),
  )
  const linkableDesigners = designers
    .filter(
      (designer) =>
        !claimedByOthers.has(designer.id) &&
        (designer.status === "Active" || designer.id === currentUser.designerId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentUser || !isDirty || submitting) return

    if (nameIsMissing) {
      setShowNameError(true)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await profileRepository.saveIdentity(
        currentUser.id,
        {
          full_name: trimmedName,
          job_title: jobTitle.trim(),
          design_role: designRole === NO_DESIGN_ROLE ? null : (designRole as DesignRole),
          designer_id: designerId,
        },
        // The link as it will be AFTER this save: changing both the link and
        // the name in one go should write the name to the record just linked,
        // not to the one being left behind.
        designerId,
      )
      toast.success("Profile updated")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The change could not be saved.")
    } finally {
      setSubmitting(false)
    }
  }

  const initials = initialsFromName(trimmedName || currentUser.email)

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PageHeader
        title="Profile"
        description="Manage your personal information and identity across DesignOps."
      />

      <SettingsSection title="Personal details">
        {/* Initials, not an upload control. Designer.avatar has worked this way
            since the MVP (PRD §8.1) and adding Storage buckets, upload policies
            and image resizing for one field would be a subsystem in service of
            a decoration. `avatar_url` exists on the row for when that changes
            (docs/DECISIONS.md). A plain row rather than a Field: there is no
            input here to label. */}
        <div className="flex items-center gap-4">
          <Avatar size="lg" aria-hidden>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Profile photo</p>
            <p className="text-sm text-muted-foreground">
              Your initials are used across DesignOps. Photo uploads aren&apos;t available yet.
            </p>
          </div>
        </div>

        <Field data-invalid={showNameError && nameIsMissing ? true : undefined}>
          <FieldLabel htmlFor="full-name">Full name</FieldLabel>
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value)
              if (showNameError) setShowNameError(false)
            }}
            autoComplete="name"
            required
            aria-invalid={showNameError && nameIsMissing ? true : undefined}
            aria-describedby={showNameError && nameIsMissing ? "full-name-error" : undefined}
          />
          {showNameError && nameIsMissing ? (
            <FieldError id="full-name-error">Enter your full name.</FieldError>
          ) : (
            <FieldDescription>
              How you appear everywhere in DesignOps — squads, projects and assignments.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="job-title">Job title</FieldLabel>
          <Input
            id="job-title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="e.g. Senior Product Designer"
            autoComplete="organization-title"
          />
          <FieldDescription>Optional. Shown beside your name in people pickers.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="design-role">Design role</FieldLabel>
          <Select
            value={designRole}
            onValueChange={(next) => setDesignRole(next as string)}
            items={DESIGN_ROLE_LABELS}
          >
            <SelectTrigger id="design-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DESIGN_ROLE}>
                <span className="text-muted-foreground">Not set</span>
              </SelectItem>
              {DESIGN_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            What you do. Separate from your access level, which you can&apos;t change yourself.
          </FieldDescription>
        </Field>
      </SettingsSection>

      <Separator />

      <SettingsSection
        title="Team profile"
        description="The designer record this account is. Linking one makes you selectable as a Squad Lead or supporting designer."
      >
        <Field>
          <FieldLabel htmlFor="linked-designer">Designer record</FieldLabel>
          <PersonSelect
            id="linked-designer"
            value={designerId}
            onChange={setDesignerId}
            people={linkableDesigners}
            currentDesignerId={currentUser.designerId}
            emptyOption="Not linked"
            aria-label="Designer record linked to this account"
          />
          <FieldDescription>
            {designerId
              ? "Your name and job title are kept in step with this record."
              : "Until this is set you won't appear in the Squad Lead or supporting designer pickers. Designers already linked to another account aren't listed."}
          </FieldDescription>
        </Field>
      </SettingsSection>

      <Separator />

      <SettingsSection title="Account">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" value={currentUser.email} readOnly disabled />
          <FieldDescription>
            Your email address is used to sign in to DesignOps. Ask an admin if it needs to change.
          </FieldDescription>
        </Field>

        {/* Deliberately not a disabled <Select>: a greyed-out dropdown reads as
            "temporarily unavailable", which invites someone to look for the way
            to enable it. This is a fact about the account, so it is written as
            one — and there is no input here, so no Field and no label. */}
        <div className="space-y-2">
          <p className="text-sm leading-snug font-medium text-foreground">Access level</p>
          <div>
            <Badge variant="secondary">{currentUser.profile?.system_role ?? "Admin"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            What you can do in DesignOps. Only an administrator can change this.
          </p>
        </div>
      </SettingsSection>

      <Separator />

      <div aria-live="polite">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isDirty || submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
        {isDirty && !submitting ? (
          <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
        ) : null}
      </div>
    </form>
  )
}
