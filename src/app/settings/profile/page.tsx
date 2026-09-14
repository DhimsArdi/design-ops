"use client"

// Settings → Profile (docs/PRD.MD §6.1, §14.10).
//
// This is where an account stops being an anonymous email and becomes a person
// the planning data can point at. Three groups, in that order of consequence:
//
//   Personal details   name, department, design role — what other people read
//   Team profile       which Designer or Stakeholder record this account is
//   Account            email and system role, both read-only here
//
// The first two groups are shared, field-for-field and behavior-for-behavior,
// with the first-login Onboarding gate (src/components/auth/onboarding-view.tsx)
// — see src/lib/hooks/use-profile-identity-form.ts. This page adds the Account
// group and phrases the submit button as an ongoing edit ("Save changes")
// rather than a one-time setup step.
//
// The last group is the important boundary. Design role is a job and the person
// owns it; system role is authorization and they must not. It is rendered, not
// offered — and the reason it cannot be edited is not that this page declines
// to show a control: the column is outside the UPDATE grant, so the database
// refuses it (supabase/schema.sql).

import { toast } from "sonner"

import { SettingsSection } from "@/components/shared/settings-section"
import { PageHeader } from "@/components/shared/page-header"
import { ProfileIdentityFields } from "@/components/shared/profile-identity-fields"
import { TeamProfileFields } from "@/components/shared/team-profile-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import { useCurrentUser } from "@/lib/identity/current-user"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as profileRepository from "@/lib/repositories/profileRepository"
import { useProfileIdentityForm } from "@/lib/hooks/use-profile-identity-form"

export default function ProfileSettingsPage() {
  const currentUser = useCurrentUser()
  const [designers] = useRepositoryList(designerRepository)
  const [stakeholders] = useRepositoryList(stakeholderRepository)
  const [departments] = useRepositoryList(departmentRepository)
  const [squads] = useRepositoryList(squadRepository)
  const [profiles] = useRepositoryList(profileRepository)

  const form = useProfileIdentityForm({
    currentUser,
    designers,
    stakeholders,
    departments,
    squads,
    profiles,
    onSaved: () => toast.success("Profile updated"),
  })

  if (!currentUser) return null

  return (
    <form onSubmit={form.handleSubmit}>
      <PageHeader
        title="Profile"
        description="Manage your personal information and identity across DesignOps."
      />

      <div className="space-y-8">
      <ProfileIdentityFields form={form} email={currentUser.email} />

      <Separator />

      <TeamProfileFields form={form} />

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
        {form.error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{form.error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!form.isDirty || form.submitting}>
          {form.submitting ? "Saving…" : "Save changes"}
        </Button>
        {form.isDirty && !form.submitting ? (
          <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
        ) : null}
      </div>
      </div>
    </form>
  )
}
