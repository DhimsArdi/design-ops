"use client"

// Step two of password recovery — where the emailed link lands
// (docs/PRD.MD §6.2).
//
// The link carries a one-time recovery token. supabase-js exchanges it for a
// session on its own as soon as the page loads (`detectSessionInUrl`, on by
// default), so this screen never touches the token: it asks whether a session
// exists and works from the answer. That also makes the expiry case correct for
// free — an expired link produces no session, which is exactly the state this
// page has to handle.
//
// Renders outside DataProvider (see AppFrame): the recovery session is real,
// but sending someone straight into the app with a password they have just
// admitted to not knowing is not the flow.

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"

import { AuthLayout, BackToSignIn } from "@/components/auth/auth-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MIN_PASSWORD_LENGTH, describePasswordError } from "@/lib/auth/password"
import { supabase } from "@/lib/supabase/client"

type Phase = "checking" | "ready" | "invalid" | "done"

/**
 * Supabase reports a refused link in the URL fragment rather than as a query
 * string. Only used to choose between "expired" and "invalid" wording — whether
 * the reset can proceed is decided by the session, not by this.
 */
function readLinkError(): string | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  return params.get("error_code") ?? params.get("error")
}

export default function ResetPasswordPage() {
  // Read on the first render: supabase-js clears the fragment once it has
  // consumed it.
  const [linkError] = useState(readLinkError)
  const [phase, setPhase] = useState<Phase>("checking")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ next?: string; confirm?: string }>({})

  useEffect(() => {
    let cancelled = false
    // getSession() waits for the client's own initialization, which is what
    // parses the link — so by the time this resolves the exchange has either
    // happened or definitively failed.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setPhase(data.session ? "ready" : "invalid")
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setFormError(null)
    setFieldErrors({})

    const nextErrors: { next?: string; confirm?: string } = {}
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (password !== confirmPassword) {
      nextErrors.confirm = "Passwords do not match."
    }
    if (nextErrors.next || nextErrors.confirm) {
      setFieldErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setFormError(describePasswordError(error.message))
        return
      }
      // Signed out on purpose: finishing at the sign-in screen proves the new
      // password works, and leaves no recovery session open on what may well
      // be a shared or borrowed machine.
      await supabase.auth.signOut()
      setPhase("done")
    } catch {
      setFormError("Couldn't reach DesignOps. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === "checking") {
    return (
      <AuthLayout title="Reset password" description="Checking your reset link…">
        <div className="h-9" aria-busy="true" />
      </AuthLayout>
    )
  }

  if (phase === "invalid") {
    return (
      <AuthLayout
        title="This link has expired"
        description={
          linkError === "otp_expired"
            ? "Password reset links are valid for one hour and can only be used once. Request a new one to continue."
            : "This password reset link is no longer valid. Request a new one to continue."
        }
        footer={<BackToSignIn />}
      >
        <Button render={<Link href="/forgot-password" />} nativeButton={false}>
          Request a new link
        </Button>
      </AuthLayout>
    )
  }

  if (phase === "done") {
    return (
      <AuthLayout
        title="Password updated"
        description="Your password has been successfully changed. Sign in with it to continue."
      >
        <Button render={<Link href="/" />} nativeButton={false}>
          Back to sign in
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a password you don't use anywhere else."
      footer={<BackToSignIn />}
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field data-invalid={fieldErrors.next ? true : undefined}>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              autoFocus
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
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
              required
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

          <Field>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating…" : "Reset password"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
