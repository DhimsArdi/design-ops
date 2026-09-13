// Person Detail (PRD §14.6). Thin server wrapper only — params are async per
// the App Router (Next 16), the repository layer is browser-only
// (the Supabase cache), so all data reading and rendering lives in the client
// component below (same split as app/projects/[id]/page.tsx).

import { PersonDetailView } from "./_components/person-detail-view"

interface PersonDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const { id } = await params
  return <PersonDetailView designerId={id} />
}
