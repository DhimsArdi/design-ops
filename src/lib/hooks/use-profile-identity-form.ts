"use client"

// Shared state and submit logic for turning a signed-in account into a person
// the planning data can point at (docs/PRD.MD §6.1, §14.10) — used both by
// Settings → Profile and by the first-login Onboarding gate
// (src/components/auth/onboarding-view.tsx), which are otherwise the exact
// same operation behind two different pieces of chrome.

import { useState, type FormEvent } from "react"

import type { CurrentUser } from "@/lib/identity/current-user"
import * as designerRepository from "@/lib/repositories/designerRepository"
import * as stakeholderRepository from "@/lib/repositories/stakeholderRepository"
import * as profileRepository from "@/lib/repositories/profileRepository"
import { getDesignerUsage } from "@/lib/selectors/designerSelectors"
import { getStakeholderUsage } from "@/lib/selectors/stakeholderSelectors"
import { activeOrSelected, byName } from "@/lib/domain/optionHelpers"
import { DESIGN_ROLES, type DesignRole } from "@/lib/domain/enums"
import type { Department, Designer, Profile, Squad, Stakeholder } from "@/lib/domain/types"

export const NO_DESIGN_ROLE = "__none__"
export const NO_DEPARTMENT = "__none__"
export const NO_STAKEHOLDER = "__none__"
// Sentinel for "no squad chosen yet" in the inline "create a designer record"
// picker — Designer.home_squad_id is required, so this is a validation gate,
// never a persisted value (mirrors master-data/designers/page.tsx).
export const NO_SQUAD_SELECTED = ""

export const DESIGN_ROLE_LABELS: Record<string, string> = {
  [NO_DESIGN_ROLE]: "Not set",
  ...Object.fromEntries(DESIGN_ROLES.map((role) => [role, role])),
}

interface UseProfileIdentityFormArgs {
  currentUser: CurrentUser | null
  designers: Designer[]
  stakeholders: Stakeholder[]
  departments: Department[]
  squads: Squad[]
  profiles: Profile[]
  /** Onboarding cannot let an account through with no Design role at all; Settings never requires one. */
  requireDesignRole?: boolean
  onSaved?: () => void
}

export function useProfileIdentityForm({
  currentUser,
  designers,
  stakeholders,
  departments,
  squads,
  profiles,
  requireDesignRole = false,
  onSaved,
}: UseProfileIdentityFormArgs) {
  const [fullName, setFullName] = useState(currentUser?.fullName ?? "")
  const [departmentId, setDepartmentId] = useState<string | null>(
    currentUser?.profile?.department_id ?? null,
  )
  const [designRole, setDesignRole] = useState<string>(
    currentUser?.profile?.design_role ?? NO_DESIGN_ROLE,
  )
  const [designerId, setDesignerId] = useState<string | null>(currentUser?.designerId ?? null)
  const [stakeholderId, setStakeholderId] = useState<string | null>(
    currentUser?.profile?.stakeholder_id ?? null,
  )
  const [newDesignerSquadId, setNewDesignerSquadId] = useState(NO_SQUAD_SELECTED)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNameError, setShowNameError] = useState(false)

  const trimmedName = fullName.trim()
  const nameIsMissing = trimmedName.length === 0

  // "Department Head" is the one design_role that makes this account a
  // Stakeholder instead of a Designer (docs/DECISIONS.md).
  const isDepartmentHeadRole = designRole === "Department Head"
  const isDesignerRole = designRole !== NO_DESIGN_ROLE && !isDepartmentHeadRole

  const savedDesignRole = currentUser?.profile?.design_role ?? NO_DESIGN_ROLE
  const savedDepartmentId = currentUser?.profile?.department_id ?? null
  const savedStakeholderId = currentUser?.profile?.stakeholder_id ?? null
  const isDirty =
    trimmedName !== (currentUser?.fullName ?? "") ||
    departmentId !== savedDepartmentId ||
    designRole !== savedDesignRole ||
    designerId !== (currentUser?.designerId ?? null) ||
    stakeholderId !== savedStakeholderId ||
    (isDesignerRole && designerId === null && newDesignerSquadId !== NO_SQUAD_SELECTED)

  // Every designer, minus the ones another account has already claimed. The
  // unique constraint on profiles.designer_id would reject those anyway; not
  // offering them is the difference between a rule and an error message.
  const claimedDesignersByOthers = new Set(
    profiles
      .filter((profile) => profile.id !== currentUser?.id && profile.designer_id)
      .map((profile) => profile.designer_id as string),
  )
  const linkableDesigners = designers
    .filter(
      (designer) =>
        !claimedDesignersByOthers.has(designer.id) &&
        (designer.status === "Active" || designer.id === currentUser?.designerId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Same rule, mirrored for Stakeholders — and narrowed to Department Head
  // rows, since that's the only kind an account can be here.
  const claimedStakeholdersByOthers = new Set(
    profiles
      .filter((profile) => profile.id !== currentUser?.id && profile.stakeholder_id)
      .map((profile) => profile.stakeholder_id as string),
  )
  const linkableStakeholders = stakeholders
    .filter(
      (stakeholder) =>
        stakeholder.stakeholder_type === "Department Head" &&
        !claimedStakeholdersByOthers.has(stakeholder.id) &&
        (stakeholder.status === "Active" || stakeholder.id === savedStakeholderId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const departmentOptions = activeOrSelected(
    departments,
    departmentId ? [departmentId] : [],
  ).sort(byName)

  const squadOptions = activeOrSelected(squads, []).sort(byName)

  /**
   * The guard clauses `handleSubmit` used to run inline, split out so
   * Onboarding can check them before switching to its captcha screen instead
   * of only finding out after that screen's Confirm is pressed
   * (src/components/auth/onboarding-view.tsx). Same checks, same error
   * state — Settings still gets them exactly as before via `handleSubmit`.
   */
  function validate(): boolean {
    if (!currentUser || submitting) return false
    if (!requireDesignRole && !isDirty) return false

    if (nameIsMissing) {
      setShowNameError(true)
      return false
    }
    if (requireDesignRole && designRole === NO_DESIGN_ROLE) {
      setError("Choose what you do before continuing.")
      return false
    }
    // Onboarding only: a designer-type role has to actually end up linked to a
    // Designer record before the account can continue — otherwise it's easy to
    // finish onboarding as "a UI Designer" who still doesn't appear anywhere a
    // designer is picked from. Settings never enforces this: an existing
    // account is free to leave itself unlinked (docs/DECISIONS.md).
    if (requireDesignRole && isDesignerRole && designerId === null && newDesignerSquadId === NO_SQUAD_SELECTED) {
      setError(
        "Link an existing designer, or choose a home squad to create one, to finish setting up as a designer.",
      )
      return false
    }

    // Leaving a role behind: block if the record it's tied to is still in use
    // elsewhere, the same guard Master Data's own Delete uses (docs/DECISIONS.md).
    const droppingDesigner = !isDesignerRole && designerId !== null
    if (droppingDesigner && designerId) {
      const usage = getDesignerUsage(designerId)
      if (usage.assignmentCount > 0 || usage.squadLeadCount > 0) {
        setError(
          `You still have ${usage.assignmentCount} project assignment(s) and lead ${usage.squadLeadCount} squad(s) as a designer. Reassign those in Master Data before changing your role away from a designer role.`,
        )
        return false
      }
    }

    const droppingStakeholder = !isDepartmentHeadRole && stakeholderId !== null
    if (droppingStakeholder && stakeholderId) {
      const usage = getStakeholderUsage(stakeholderId)
      if (usage.departmentHeadCount > 0 || usage.projectCount > 0) {
        setError(
          `You still head ${usage.departmentHeadCount} department(s) and are referenced on ${usage.projectCount} project(s). Reassign those in Master Data before changing your role away from Department Head.`,
        )
        return false
      }
    }

    setError(null)
    return true
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validate() || !currentUser) return

    const droppingDesigner = !isDesignerRole && designerId !== null
    const droppingStakeholder = !isDepartmentHeadRole && stakeholderId !== null

    setSubmitting(true)
    setError(null)
    try {
      let finalDesignerId = droppingDesigner ? null : designerId
      let finalStakeholderId = droppingStakeholder ? null : stakeholderId

      // Creating a linked record is always opt-in — picking a Design role never
      // by itself requires a squad or a department. It only happens once the
      // person has actually chosen one (docs/DECISIONS.md).
      //
      // `createAwaited`, not `create`: the next step points profiles.designer_id
      // / .stakeholder_id — a real foreign key — at this row's id, and that
      // write is itself awaited and checked against the actual database. Using
      // the optimistic `create` here raced the two requests and could fail with
      // a foreign-key violation if the profile update reached Postgres before
      // the insert did.
      if (isDesignerRole && finalDesignerId === null && newDesignerSquadId !== NO_SQUAD_SELECTED) {
        finalDesignerId = (
          await designerRepository.createAwaited({
            name: trimmedName,
            job_title: designRole,
            seniority: "Mid",
            home_squad_id: newDesignerSquadId,
            avatar: "",
            status: "Active",
          })
        ).id
      }

      if (isDepartmentHeadRole && finalStakeholderId === null && departmentId) {
        finalStakeholderId = (
          await stakeholderRepository.createAwaited({
            name: trimmedName,
            title: "Department Head",
            department_id: departmentId,
            stakeholder_type: "Department Head",
            status: "Active",
          })
        ).id
      }

      await profileRepository.saveIdentity(
        currentUser.id,
        {
          full_name: trimmedName,
          design_role: designRole === NO_DESIGN_ROLE ? null : (designRole as DesignRole),
          department_id: departmentId,
          designer_id: finalDesignerId,
          stakeholder_id: finalStakeholderId,
        },
        // The links as they will be AFTER this save: changing both a link and
        // the name in one go should write the name to the record just linked,
        // not to the one being left behind.
        finalDesignerId,
        finalStakeholderId,
      )

      // Only reached once the account no longer needs it — a designer/
      // stakeholder record that only existed to be this account's own is
      // removed rather than left behind unlinked and stale.
      if (droppingDesigner && designerId) designerRepository.remove(designerId)
      if (droppingStakeholder && stakeholderId) stakeholderRepository.remove(stakeholderId)

      setDesignerId(finalDesignerId)
      setStakeholderId(finalStakeholderId)
      setNewDesignerSquadId(NO_SQUAD_SELECTED)
      onSaved?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The change could not be saved.")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    fullName,
    setFullName,
    departmentId,
    setDepartmentId,
    designRole,
    setDesignRole,
    designerId,
    setDesignerId,
    stakeholderId,
    setStakeholderId,
    newDesignerSquadId,
    setNewDesignerSquadId,
    submitting,
    error,
    showNameError,
    setShowNameError,
    trimmedName,
    nameIsMissing,
    isDepartmentHeadRole,
    isDesignerRole,
    isDirty,
    requireDesignRole,
    currentDesignerId: currentUser?.designerId ?? null,
    savedStakeholderId,
    linkableDesigners,
    linkableStakeholders,
    departmentOptions,
    squadOptions,
    validate,
    handleSubmit,
  }
}

export type ProfileIdentityForm = ReturnType<typeof useProfileIdentityForm>
