"use client"

// The "Team profile" section shared by Settings → Profile and the first-login
// Onboarding gate: which Designer or Stakeholder record this account is, and —
// when neither is linked yet — how to create one (docs/PRD.MD §6.1,
// docs/DECISIONS.md "Department replaces Job title; Department Head becomes a
// second linkable person type").
//
// "Create new" vs "Link existing" is a real fork, not two fields that happen
// to sit near each other — most accounts here have never had a Designer or
// Stakeholder row before, so a Tabs switcher makes that the explicit choice
// it is, defaulting to Create new (docs/DECISIONS.md).
//
// Everything here is optional in Settings. On Onboarding
// (`form.requireDesignRole`), ending up linked to a Designer record is
// required once the role is a designer-type one — otherwise it's easy to
// finish onboarding as "a UI Designer" who still doesn't show up anywhere a
// designer is picked from. The Home Squad field is never itself required,
// even then: it's what the Create new tab needs, not a requirement of its own
// — linking an existing Designer via the Link existing tab satisfies the same
// requirement.

import { useState } from "react"

import { SettingsSection } from "@/components/shared/settings-section"
import { Optional, Required } from "@/components/shared/field-requirement"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PersonSelect } from "@/components/shared/person-select"

import { isCurrentPerson } from "@/lib/identity/person-display"
import {
  NO_SQUAD_SELECTED,
  NO_STAKEHOLDER,
  type ProfileIdentityForm,
} from "@/lib/hooks/use-profile-identity-form"

interface TeamProfileFieldsProps {
  form: ProfileIdentityForm
}

type LinkMode = "create" | "link"

function TeamProfileFields({ form }: TeamProfileFieldsProps) {
  // Defaults to Create new: almost every account reaching this screen has
  // never had a Designer/Stakeholder row before, so that's the common case,
  // not linking one an admin happened to add earlier. Flips to Link existing
  // on its own once a link actually exists — right after this account just
  // created one, or (in Settings) on every later visit to an already-linked
  // account.
  const [designerMode, setDesignerMode] = useState<LinkMode>(
    form.designerId ? "link" : "create",
  )
  const [stakeholderMode, setStakeholderMode] = useState<LinkMode>(
    form.stakeholderId ? "link" : "create",
  )

  // Adjusting state during render (React's documented alternative to an
  // effect for this exact case), not in a useEffect: a newly-created or
  // newly-linked record should flip its tab to Link existing on its own,
  // without waiting an extra render for an effect to run.
  const [prevDesignerId, setPrevDesignerId] = useState(form.designerId)
  if (form.designerId !== prevDesignerId) {
    setPrevDesignerId(form.designerId)
    if (form.designerId) setDesignerMode("link")
  }
  const [prevStakeholderId, setPrevStakeholderId] = useState(form.stakeholderId)
  if (form.stakeholderId !== prevStakeholderId) {
    setPrevStakeholderId(form.stakeholderId)
    if (form.stakeholderId) setStakeholderMode("link")
  }

  function handleDesignerModeChange(next: LinkMode) {
    setDesignerMode(next)
    // Switching tabs is switching intent, not just which control shows —
    // "Create new" with a stale link still selected would submit as linking
    // it, not creating anything.
    if (next === "create") form.setDesignerId(null)
    else form.setNewDesignerSquadId(NO_SQUAD_SELECTED)
  }

  function handleStakeholderModeChange(next: LinkMode) {
    setStakeholderMode(next)
    // Switching to Create new is switching intent — a stale link left
    // selected would submit as linking it, not creating anything.
    if (next === "create") form.setStakeholderId(null)
  }

  return (
    <SettingsSection
      title="Team profile"
      description={
        form.isDepartmentHeadRole
          ? "Optional. The stakeholder record this account is — link or create one to become selectable as a project's Department Head, Product Owner, or Project Admin / PIC. Skip it and finish later in Settings → Profile."
          : form.isDesignerRole
            ? form.requireDesignRole
              ? "The designer record this account is — required to continue."
              : "Optional. The designer record this account is — link or create one to become selectable as a Squad Lead or supporting designer. Skip it and finish later in Settings → Profile."
            : "Choose a design role above to link — or create — your record in Master Data."
      }
    >
      {form.isDepartmentHeadRole ? (
        <Field>
          <FieldLabel>
            Stakeholder record <Optional />
          </FieldLabel>

          <Tabs value={stakeholderMode} onValueChange={(next) => handleStakeholderModeChange(next as LinkMode)}>
            <TabsList>
              <TabsTrigger value="create">Create new</TabsTrigger>
              <TabsTrigger value="link">Link existing</TabsTrigger>
            </TabsList>
          </Tabs>

          {stakeholderMode === "create" ? (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                {form.departmentId ? (
                  <>
                    Creates a new stakeholder record named{" "}
                    <span className="font-medium text-foreground">
                      {form.trimmedName || "…"}
                    </span>{" "}
                    in your department above, and links it — no separate Master Data step
                    needed.
                  </>
                ) : (
                  "Choose your department above first — a new stakeholder record needs one."
                )}
              </p>
            </div>
          ) : (
            <>
              <Select
                value={form.stakeholderId ?? NO_STAKEHOLDER}
                onValueChange={(next) =>
                  form.setStakeholderId(next === NO_STAKEHOLDER ? null : (next ?? null))
                }
              >
                <SelectTrigger id="linked-stakeholder" className="w-full">
                  <SelectValue placeholder="Not linked">
                    {(value: string) =>
                      value === NO_STAKEHOLDER
                        ? "Not linked"
                        : (form.linkableStakeholders.find(
                            (stakeholder) => stakeholder.id === value,
                          )?.name ?? "Not linked")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STAKEHOLDER}>
                    <span className="text-muted-foreground">Not linked</span>
                  </SelectItem>
                  {form.linkableStakeholders.map((stakeholder) => (
                    <SelectItem key={stakeholder.id} value={stakeholder.id}>
                      {stakeholder.name}
                      {isCurrentPerson(stakeholder.id, form.savedStakeholderId) ? " (Me)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {form.stakeholderId
                  ? "Your name is kept in step with this record."
                  : form.linkableStakeholders.length > 0
                    ? "Pick the stakeholder record an admin already added for you."
                    : "No unclaimed stakeholder records exist yet — use Create new instead."}
              </FieldDescription>
            </>
          )}
        </Field>
      ) : form.isDesignerRole ? (
        <Field>
          <FieldLabel>
            Designer record {form.requireDesignRole ? <Required /> : <Optional />}
          </FieldLabel>

          <Tabs value={designerMode} onValueChange={(next) => handleDesignerModeChange(next as LinkMode)}>
            <TabsList>
              <TabsTrigger value="create">Create new</TabsTrigger>
              <TabsTrigger value="link">Link existing</TabsTrigger>
            </TabsList>
          </Tabs>

          {designerMode === "create" ? (
            <>
              <Select
                value={form.newDesignerSquadId}
                onValueChange={(next) => form.setNewDesignerSquadId(next ?? NO_SQUAD_SELECTED)}
              >
                <SelectTrigger id="new-designer-squad" className="w-full">
                  <SelectValue placeholder="Select your home squad">
                    {(squadId: string) =>
                      form.squadOptions.find((squad) => squad.id === squadId)?.name ?? ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {form.squadOptions.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {form.newDesignerSquadId ? (
                  <>
                    Creates a new designer record named{" "}
                    <span className="font-medium text-foreground">
                      {form.trimmedName || "…"}
                    </span>{" "}
                    in this squad, and links it.
                  </>
                ) : (
                  "Pick your home squad — every designer needs one."
                )}
              </FieldDescription>
            </>
          ) : (
            <>
              <PersonSelect
                id="linked-designer"
                value={form.designerId}
                onChange={form.setDesignerId}
                people={form.linkableDesigners}
                currentDesignerId={form.currentDesignerId}
                emptyOption="Not linked"
                aria-label="Designer record linked to this account"
              />
              <FieldDescription>
                {form.designerId
                  ? "Your name is kept in step with this record."
                  : form.linkableDesigners.length > 0
                    ? "Pick the designer record an admin already added for you."
                    : "No unclaimed designer records exist yet — use Create new instead."}
              </FieldDescription>
            </>
          )}
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not linked to a designer or stakeholder record.
        </p>
      )}
    </SettingsSection>
  )
}

export { TeamProfileFields }
export type { TeamProfileFieldsProps }
