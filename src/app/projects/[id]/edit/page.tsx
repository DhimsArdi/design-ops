// Edit Project (PRD §20-25). Thin server wrapper only — params are async
// per the App Router (Next 16), matching the pattern in ../page.tsx. Renders
// the same shared 4-step wizard as /projects/new in "edit mode", prefilled
// from the existing Project + its assignments + monthly targets.

import { ProjectFormWizard } from "../../_components/project-form-wizard"

interface EditProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params
  return <ProjectFormWizard mode="edit" projectId={id} />
}
