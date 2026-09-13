import { redirect } from "next/navigation"

// Same shape as /master-data: the section's landing route resolves to its first
// page rather than being a page of its own (docs/PRD.MD §14.10).
export default function SettingsPage() {
  redirect("/settings/general")
}
