"use client"

// Step one of password recovery (docs/PRD.MD §6.2).
//
// Renders outside DataProvider — a person who needs this cannot sign in, so it
// cannot sit behind the sign-in gate (see AppFrame).
//
// The confirmation deliberately says nothing about whether that address has an
// account. Supabase answers the same way either way; showing "no account with
// that email" here would turn the form into a way to test whether a colleague
// works here, and would be the only place in the product that leaked it.

import { useState, type FormEvent } from "react"

import { AuthLayout, BackToSignIn } from "@/components/auth/auth-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authRedirectUrl } from "@/lib/auth/redirect"
import { supabase } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendResetLink(): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectUrl("/reset-password"),
    })

    if (!error) return true

    // Rate limiting is the one failure worth naming: it is temporary, and the
    // user's next move (wait, then retry) depends on knowing that. Everything
    // else is reported without detail, for the same reason the success state
    // is vague.
    setError(
      /rate limit|too many|after \d+ seconds/i.test(error.message)
        ? "Too many requests. Wait a minute before trying again."
        : "We couldn't send the email just now. Try again in a moment.",
    )
    return false
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)
    if (await sendResetLink()) setSent(true)
    setSubmitting(false)
  }

  async function handleResend() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    await sendResetLink()
    setSubmitting(false)
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        description={`If an account exists for ${email.trim()}, a password reset link is on its way. The link is valid for one hour.`}
        footer={<BackToSignIn />}
      >
        <div className="space-y-4">
          <div aria-live="polite">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Didn&apos;t receive it?</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0"
              disabled={submitting}
              onClick={handleResend}
            >
              {submitting ? "Sending…" : "Resend email"}
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot password?"
      description="Enter your email address and we'll send you a link to reset your password."
      footer={<BackToSignIn />}
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@bni.co.id"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <div aria-live="polite">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <Field>
            <Button type="submit" disabled={submitting || email.trim() === ""}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
