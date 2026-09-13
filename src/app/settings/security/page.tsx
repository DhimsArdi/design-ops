"use client"

// Settings → Security (docs/PRD.MD §14.10, §6.2).
//
// One thing: changing your password. 2FA, passkeys, active sessions and login
// history are all real features and none of them are this product's — a
// planning tool for one internal design team, behind an invitation-only
// Supabase project (PRD §6).
//
// The current password is checked by actually signing in with it, not by
// trusting the form. Supabase's updateUser() will change a password on the
// strength of a valid session alone, which means a borrowed unlocked laptop is
// enough — re-authenticating first is what makes "current password" mean
// something. No password value is stored, logged, or sent anywhere but
// Supabase Auth.
//
// No visibility toggle: the sign-in form doesn't have one, and this screen is
// not the place to introduce a second convention for password fields.

import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SettingsSection } from "../_components/settings-section"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useCurrentUser } from "@/lib/identity/current-user"
import { MIN_PASSWORD_LENGTH, describePasswordError } from "@/lib/auth/password"
import { supabase } from "@/lib/supabase/client"

export default function SecuritySettingsPage() {
  const currentUser = useCurrentUser()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // Field-level messages appear on submit, not while typing: telling someone
  // their password is too short on the third keystroke is noise, not help.
  const [fieldErrors, setFieldErrors] = useState<{ next?: string; confirm?: string }>({})

  const canSubmit =
    currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0

  function clearErrors() {
    setFormError(null)
    setFieldErrors({})
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentUser || !canSubmit || submitting) return

    clearErrors()

    const nextErrors: { next?: string; confirm?: string } = {}
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (newPassword !== confirmPassword) {
      nextErrors.confirm = "Passwords do not match."
    }
    if (nextErrors.next || nextErrors.confirm) {
      setFieldErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      // Step 1 — prove it is them. Succeeding here reissues the same user's
      // session, so nothing about who is signed in changes.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      })
      if (reauthError) {
        setFormError("The current password you entered is incorrect.")
        return
      }

      // Step 2 — the actual change.
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setFormError(describePasswordError(updateError.message))
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password changed")
    } catch {
      setFormError("Couldn't reach DesignOps. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PageHeader title="Security" description="Manage your password and account security." />

      <SettingsSection
        title="Password"
        description="Choose a password you don't use anywhere else."
      >
        {/* Present but hidden: password managers need the account this form
            belongs to in order to update the right saved entry. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={currentUser?.email ?? ""}
          readOnly
          hidden
        />

        <Field>
          <FieldLabel htmlFor="current-password">Current password</FieldLabel>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              if (formError) setFormError(null)
            }}
            aria-invalid={formError ? true : undefined}
          />
        </Field>

        <Field data-invalid={fieldErrors.next ? true : undefined}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value)
              if (fieldErrors.next) setFieldErrors((prev) => ({ ...prev, next: undefined }))
            }}
            aria-invalid={fieldErrors.next ? true : undefined}
            aria-describedby="new-password-hint"
          />
          {fieldErrors.next ? (
            <FieldError id="new-password-hint">{fieldErrors.next}</FieldError>
          ) : (
            <FieldDescription id="new-password-hint">
              At least {MIN_PASSWORD_LENGTH} characters.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={fieldErrors.confirm ? true : undefined}>
          <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              if (fieldErrors.confirm) setFieldErrors((prev) => ({ ...prev, confirm: undefined }))
            }}
            aria-invalid={fieldErrors.confirm ? true : undefined}
            aria-describedby={fieldErrors.confirm ? "confirm-password-error" : undefined}
          />
          {fieldErrors.confirm ? (
            <FieldError id="confirm-password-error">{fieldErrors.confirm}</FieldError>
          ) : null}
        </Field>

        <div aria-live="polite">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div>
          <Button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Updating…" : "Change password"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  )
}
