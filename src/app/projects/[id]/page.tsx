// Project Detail (PRD §14.4). Thin server wrapper only — params are async
// per the App Router (Next 16), the repository layer is browser-only
// (the Supabase cache), so all data reading and rendering lives in the client
// component below.

import { ProjectDetailView } from "./_components/project-detail-view"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  return <ProjectDetailView projectId={id} />
}
