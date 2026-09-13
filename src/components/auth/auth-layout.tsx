// The frame every signed-out screen sits in: sign-in, forgot password, reset
// password (docs/PRD.MD §6.2).
//
// Extracted from LoginView when password recovery arrived, rather than copied
// into it — three screens rendering the same split with their own paddings is
// how an auth flow ends up subtly re-laying-out as you move through it.
//
// Layout is shadcn's login-02 block: form left, context panel right. The panel
// shows the BNI Direct login artwork (public/images/bnidirect-login.png).

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
  /** Quiet text under the form — a way back, or a note about how accounts are made. */
  footer?: ReactNode
}

function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center lg:justify-start">
          <span className="text-sm font-semibold tracking-tight text-foreground">DesignOps</span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            </div>

            {children}

            {footer ? <div className="mt-6 text-sm">{footer}</div> : null}
          </div>
        </div>
      </div>

      <div className="relative hidden border-l border-border bg-muted lg:block">
        <Image
          src="/images/bnidirect-login.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
      </div>
    </div>
  )
}

/** "Back to sign in", the way out of every recovery screen. `/` is the sign-in surface — a signed-out visitor to any route lands on it. */
function BackToSignIn({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={
        className ??
        "font-medium text-foreground underline underline-offset-4 hover:text-primary"
      }
    >
      Back to sign in
    </Link>
  )
}

export { AuthLayout, BackToSignIn }
export type { AuthLayoutProps }
