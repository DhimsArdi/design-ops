"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Alert02Icon,
  MultiplicationSignCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"

import { getResolvedTheme, subscribeToTheme } from "@/lib/theme/theme"

// Toasts render into a portal outside the styled tree, so they are the one
// place that needs the resolved theme as a value rather than inheriting it
// through CSS. It comes from the document class the theme preference sets
// (src/lib/theme/theme.ts) — not from next-themes, which this project
// deliberately does not have (docs/DECISIONS.md), and not from the OS, which
// would flip toasts dark under a user who chose light.
const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSyncExternalStore(subscribeToTheme, getResolvedTheme, () => "light" as const)

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
        ),
        warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />,
        error: (
          <HugeiconsIcon
            icon={MultiplicationSignCircleIcon}
            strokeWidth={2}
            className="size-4"
          />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
