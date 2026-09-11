// Add Project (PRD §20-24). Thin wrapper around the shared 4-step wizard —
// see ../_components/project-form-wizard.tsx for the actual flow, shared
// with /projects/[id]/edit in "edit mode".

import { ProjectFormWizard } from "../_components/project-form-wizard"

export default function NewProjectPage() {
  return <ProjectFormWizard mode="create" />
}
