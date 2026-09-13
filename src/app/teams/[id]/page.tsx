// Squad Detail (PRD §14.8). Thin server wrapper only — params are async per
// the App Router (Next 16), the repository layer is browser-only
// (the Supabase cache), so all data reading and rendering lives in the client
// component below (mirrors app/projects/[id]/page.tsx).

import { SquadDetailView } from "./_components/squad-detail-view"

interface SquadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SquadDetailPage({ params }: SquadDetailPageProps) {
  const { id } = await params
  return <SquadDetailView squadId={id} />
}
