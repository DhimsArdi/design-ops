"use client"

// First-login gate: an account that hasn't chosen a Design role yet sees this
// instead of the app, until it has one (docs/PRD.MD §6.1). It reuses the exact
// same fields and submit logic as Settings → Profile
// (src/lib/hooks/use-profile-identity-form.ts) — this is that same operation,
// just required once, up front, before the app's own chrome (sidebar, nav)
// ever shows.
//
// Not a route, and not gated on a separate "has onboarded" flag: `needsOnboarding`
// below is the one place that decides, purely from whether `profile.design_role`
// is set, and DataProvider renders this in place of the app when it's true. The
// moment Design role saves, useCurrentUser sees it in the cache on its own and
// this view stops rendering — there is nothing to redirect to or away from.
//
// The claw-machine captcha (ClawCaptcha, `playcaptcha`) is a second screen,
// shown only after the fields above pass the same validation
// `useProfileIdentityForm.handleSubmit` always ran (now split into
// `form.validate()` so this view can call it before switching screens,
// instead of only finding out after the captcha is solved). `step` is local
// state that has nothing to do with the hook itself, so Settings → Profile
// (which reuses that same hook, single-screen, no captcha) is unaffected.
// Static assets the captcha needs live under `public/playcaptcha/` (see
// package README for why the logo path isn't configurable and stays at the
// public root).

import { useState, type FormEvent } from "react"
import { ArrowLeft, LogOut } from "lucide-react"
import { ClawCaptcha } from "playcaptcha"
import "playcaptcha/clawcaptcha.css"

import { ProfileIdentityFields } from "@/components/shared/profile-identity-fields"
import { TeamProfileFields } from "@/components/shared/team-profile-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { useCurrentUser } from "@/lib/identity/current-user"
import { useRepositoryList } from "@/lib/hooks/use-repository-list"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"
import * as departmentRepository from "@/lib/repositories/departmentRepository"
import * as squadRepository from "@/lib/repositories/squadRepository"
import * as profileRepository from "@/lib/repositories/profileRepository"
import { useProfileIdentityForm } from "@/lib/hooks/use-profile-identity-form"
import type { Profile } from "@/lib/domain/types"
import { supabase } from "@/lib/supabase/client"

/** True once this account still needs the gate below — see the module comment. */
export function needsOnboarding(profile: Profile | undefined): boolean {
  return !profile || !profile.design_role
}

export function OnboardingView() {
  const currentUser = useCurrentUser()
  const [step, setStep] = useState<"form" | "captcha">("form")
  const [captchaVerified, setCaptchaVerified] = useState(false)
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
    requireDesignRole: true,
  })

  if (!currentUser) return null

  function handleContinue(event: FormEvent) {
    event.preventDefault()
    if (form.validate()) setStep("captcha")
  }

  return (
    <div className="flex min-h-svh justify-center overflow-y-auto p-6">
      <div className="w-full max-w-lg py-10">
        {step === "form" ? (
          <>
            <div className="mb-8 space-y-1.5 text-center">
              <h1 className="text-xl font-semibold text-foreground">Welcome to DesignOps</h1>
              <p className="text-sm text-muted-foreground">
                A couple of details before you get started.
              </p>
            </div>

            <form onSubmit={handleContinue} className="space-y-8">
              <ProfileIdentityFields form={form} email={currentUser.email} />

              <Separator />

              <TeamProfileFields form={form} />

              <div aria-live="polite">
                {form.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{form.error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="space-y-3">
                <Button type="submit" className="w-full">
                  Continue
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {form.isDesignerRole
                    ? "Department is optional here. A linked designer record isn't — link an existing one or create a new one above."
                    : "Department, and linking or creating a record below, are optional here — finish those later in Settings → Profile if you'd rather."}
                </p>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="mb-8 space-y-1.5 text-center">
              <h1 className="text-xl font-semibold text-foreground">Verify you&apos;re human</h1>
              <p className="text-sm text-muted-foreground">One last step before you get started.</p>
            </div>

            <form onSubmit={form.handleSubmit} className="space-y-8">
              <ClawCaptcha
                onVerify={() => setCaptchaVerified(true)}
                assetBase="/playcaptcha/toys/"
                className="mx-auto"
              />

              <div aria-live="polite">
                {form.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{form.error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="space-y-3">
                <Button type="submit" className="w-full" disabled={form.submitting || !captchaVerified}>
                  {form.submitting ? "Saving…" : captchaVerified ? "Confirm" : "Solve the captcha to continue"}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
              </div>
            </form>
          </>
        )}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
