"use client"

// The identity fields shared by Settings → Profile and the first-login
// Onboarding gate: name, department, design role (docs/PRD.MD §6.1, §14.10).
// One component so the two contexts can never drift on what these fields say
// or how they behave — see src/lib/hooks/use-profile-identity-form.ts.

import { SettingsSection } from "@/components/shared/settings-section"
import { Optional, Required } from "@/components/shared/field-requirement"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { initialsFromName } from "@/lib/identity/person-display"
import { DESIGN_ROLES } from "@/lib/domain/enums"
import {
  DESIGN_ROLE_LABELS,
  NO_DEPARTMENT,
  NO_DESIGN_ROLE,
  type ProfileIdentityForm,
} from "@/lib/hooks/use-profile-identity-form"

interface ProfileIdentityFieldsProps {
  form: ProfileIdentityForm
  email: string
}

function ProfileIdentityFields({ form, email }: ProfileIdentityFieldsProps) {
  const initials = initialsFromName(form.trimmedName || email)

  return (
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

      <Field data-invalid={form.showNameError && form.nameIsMissing ? true : undefined}>
        <FieldLabel htmlFor="full-name">
          Full name <Required />
        </FieldLabel>
        <Input
          id="full-name"
          value={form.fullName}
          onChange={(event) => {
            form.setFullName(event.target.value)
            if (form.showNameError) form.setShowNameError(false)
          }}
          autoComplete="name"
          required
          aria-invalid={form.showNameError && form.nameIsMissing ? true : undefined}
          aria-describedby={
            form.showNameError && form.nameIsMissing ? "full-name-error" : undefined
          }
        />
        {form.showNameError && form.nameIsMissing ? (
          <FieldError id="full-name-error">Enter your full name.</FieldError>
        ) : (
          <FieldDescription>
            How you appear everywhere in DesignOps — squads, projects and assignments.
          </FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="department">
          Department <Optional />
        </FieldLabel>
        <Select
          value={form.departmentId ?? NO_DEPARTMENT}
          onValueChange={(next) =>
            form.setDepartmentId(next === NO_DEPARTMENT ? null : (next ?? null))
          }
        >
          <SelectTrigger id="department" className="w-full">
            <SelectValue placeholder="Not set">
              {(value: string) =>
                value === NO_DEPARTMENT
                  ? "Not set"
                  : (form.departmentOptions.find((department) => department.id === value)
                      ?.name ?? "Not set")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_DEPARTMENT}>
              <span className="text-muted-foreground">Not set</span>
            </SelectItem>
            {form.departmentOptions.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
                {department.status === "Inactive" ? " (Inactive)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          Set it whenever you know it. Needed only if you create a Department Head record below.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="design-role">
          Design role {form.requireDesignRole ? <Required /> : <Optional />}
        </FieldLabel>
        <Select
          value={form.designRole}
          onValueChange={(next) => form.setDesignRole(next as string)}
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
  )
}

export { ProfileIdentityFields }
export type { ProfileIdentityFieldsProps }
