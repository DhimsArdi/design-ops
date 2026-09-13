"use client"

// TEMPORARY debug-only route to reproduce the /projects/new overscroll bug
// without needing an authenticated session. Delete before committing.

import { AppShell } from "@/components/shell/AppShell"
import { ProjectFormWizard } from "../projects/_components/project-form-wizard"

export default function ReproPage() {
  return (
    <AppShell>
      <ProjectFormWizard mode="create" />
    </AppShell>
  )
}
