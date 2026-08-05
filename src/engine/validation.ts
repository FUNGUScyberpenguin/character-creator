import type { CharacterState } from './character'
import { stepKey } from './character'
import type { DerivedCharacter } from './derive'
import { findMethod, validateAbilities } from './abilities'
import type { Resolution } from './resolve'
import type { Ruleset, Step } from './types'

export interface StepStatus {
  stepId: string
  /** Nothing left to do here. */
  complete: boolean
  /** Whether the wizard should stop the player moving past this step. */
  blocking: boolean
  issues: string[]
}

/**
 * Work out what a step still needs.
 *
 * Only genuinely unfinished choices block progress. Optional flavour — a
 * backstory, a shopping list — is reported as incomplete but never traps the
 * player, because half the point of a visual builder is being able to skip
 * ahead and come back.
 */
export function validateStep(
  ruleset: Ruleset,
  state: CharacterState,
  step: Step,
  resolution: Resolution,
  derived: DerivedCharacter,
): StepStatus {
  const issues: string[] = []
  let blocking = false

  switch (step.kind) {
    case 'intro':
    case 'level':
    case 'review':
      break

    case 'identity': {
      if (!state.name.trim()) issues.push('Your character needs a name.')
      for (const field of step.fields) {
        if (field.required && !state.identity[field.id]?.trim()) {
          issues.push(`${field.label} is required.`)
        }
      }
      break
    }

    case 'pick': {
      const count = step.count ?? 1
      const selected = state.selections[stepKey(step.id)] ?? []
      if (selected.length < count) {
        issues.push(count === 1 ? 'Make a selection to continue.' : `Choose ${count} options.`)
        blocking = true
      }
      for (const choice of resolution.choices) {
        if (choice.stepId !== step.id || choice.satisfied) continue
        const remaining = choice.count - choice.selected.length
        issues.push(`${choice.source}: ${remaining} more for "${choice.prompt}".`)
        blocking = true
      }
      break
    }

    case 'abilities': {
      const method = findMethod(ruleset, state.abilityMethod)
      const result = validateAbilities(ruleset, method, state.baseAbilityScores)
      issues.push(...result.issues)
      if (!result.valid) blocking = true
      break
    }

    case 'choices': {
      for (const choice of resolution.choices) {
        if (choice.satisfied) continue
        const remaining = choice.count - choice.selected.length
        issues.push(`${choice.source}: ${remaining} more for "${choice.prompt}".`)
        blocking = true
      }
      break
    }

    case 'equipment':
      break

    case 'spells': {
      for (const source of derived.spellcasting) {
        const chosen = state.spells[source.id] ?? []
        const cantrips = chosen.filter((id) => spellLevelOf(derived, id) === 0).length
        const leveled = chosen.length - cantrips

        if (source.cantripsKnown !== undefined && cantrips !== source.cantripsKnown) {
          issues.push(`${source.label}: choose ${source.cantripsKnown} cantrip(s), currently ${cantrips}.`)
        }
        if (source.spellsKnown !== undefined && leveled !== source.spellsKnown) {
          const word = source.preparation === 'prepared' ? 'prepared spell' : 'spell'
          issues.push(`${source.label}: choose ${source.spellsKnown} ${word}(s), currently ${leveled}.`)
        }
      }
      break
    }
  }

  return { stepId: step.id, complete: issues.length === 0, blocking, issues }
}

function spellLevelOf(derived: DerivedCharacter, spellId: string): number {
  for (const source of derived.spellcasting) {
    const entry = source.chosen.find((candidate) => candidate.id === spellId)
    if (entry) return Number(entry.meta?.['level'] ?? 0)
  }
  return 0
}

export interface CharacterValidation {
  steps: Record<string, StepStatus>
  /** Every step is finished. */
  complete: boolean
  /** Steps that must be resolved before the sheet is trustworthy. */
  blockingSteps: string[]
}

export function validateCharacter(
  ruleset: Ruleset,
  state: CharacterState,
  derived: DerivedCharacter,
): CharacterValidation {
  const steps: Record<string, StepStatus> = {}
  const blockingSteps: string[] = []
  let complete = true

  for (const step of ruleset.steps) {
    const status = validateStep(ruleset, state, step, derived.resolution, derived)
    steps[step.id] = status
    if (!status.complete) complete = false
    if (status.blocking) blockingSteps.push(step.id)
  }

  return { steps, complete, blockingSteps }
}
