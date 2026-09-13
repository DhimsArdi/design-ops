"use client"

// Sign-in screen. Deliberately has no sign-up path: accounts are created by
// invitation from the Supabase dashboard, and public sign-up is switched off
// there (supabase/schema.sql explains why that matters — the RLS policies grant
// access to any authenticated user, so who can become authenticated is the
// access list).
//
// The block's stock GitHub SSO and "Sign up" links stay omitted rather than
// rendered dead — password is the only configured auth method and there is no
// self-serve signup. "Forgot password?" is no longer among them: it now leads
// somewhere real (docs/PRD.MD §6.2).
//
// The split layout itself lives in AuthLayout, shared with the two recovery
// screens.

import { useState, type FormEvent } from "react"
import Link from "next/link"

import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { AuthLayout } from "./auth-layout"

export function LoginView() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    // On success the auth listener in DataProvider swaps this screen out, so
    // there is nothing to do here and the button stays busy until it does.
    if (error) {
      setError(error.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Use the email your DesignOps account was created with."
      footer={
        <p className="text-xs text-muted-foreground">
          Accounts are created by invitation. Ask an admin if you need access.
        </p>
      }
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
              aria-invalid={error ? true : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field>
            {/* Label and escape hatch on one line: the moment someone needs
                the reset link is the moment they are looking at this field. */}
            <div className="flex items-baseline justify-between gap-3">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={error ? true : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {/* Polite, not assertive: the message lands after the field the
              user was in, and should not interrupt them mid-correction. */}
          <div aria-live="polite">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <Field>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
