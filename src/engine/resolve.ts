import type { CharacterState } from './character'
import { choiceKey, entryPath, stepKey } from './character'
import type { Choice, ChoiceOption, Collection, Effect, Entry, Ruleset, Step } from './types'

/** An effect together with the thing that granted it, for sheet attribution. */
export interface SourcedEffect {
  effect: Effect
  /** Display name of the granting entry or option, e.g. "Fighter". */
  source: string
}

/** A decision the player either has made or still needs to make. */
export interface ResolvedChoice {
  key: string
  prompt: string
  count: number
  allowDuplicates: boolean
  options: ChoiceOption[]
  selected: string[]
  /** Name of whatever offered this choice. */
  source: string
  /** Step this choice belongs to, so the UI can show it in the right place. */
  stepId: string
  satisfied: boolean
}

export interface Resolution {
  effects: SourcedEffect[]
  choices: ResolvedChoice[]
  /** Entries selected at each `pick` step, keyed by step id. */
  picks: Record<string, Entry[]>
}

export function findCollection(ruleset: Ruleset, id: string): Collection | undefined {
  return ruleset.collections.find((collection) => collection.id === id)
}

export function findEntry(ruleset: Ruleset, collectionId: string, entryId: string): Entry | undefined {
  return findCollection(ruleset, collectionId)?.entries.find((entry) => entry.id === entryId)
}

/**
 * Flatten an entry into a selectable option at a given character level.
 *
 * Level grants are folded into the entry's own effects and choices, so
 * everything downstream can treat a level-7 fighter the same way it treats a
 * background: one bundle of effects and one list of open questions.
 */
export function entryToOption(entry: Entry, level: number): ChoiceOption {
  const effects = [...(entry.effects ?? [])]
  const choices = [...(entry.choices ?? [])]

  for (const grant of entry.levels ?? []) {
    if (grant.level > level) continue
    effects.push(...(grant.effects ?? []))
    for (const choice of grant.choices ?? []) {
      // Level grants imply their own minimum level, so a choice unlocked at
      // level 4 never appears on a level-3 character.
      choices.push({ ...choice, minLevel: choice.minLevel ?? grant.level })
    }
  }

  return {
    id: entry.id,
    name: entry.name,
    summary: entry.summary,
    description: entry.description,
    effects,
    choices,
  }
}

/** Build the list of options a choice offers, given the ruleset's content. */
export function optionsForChoice(ruleset: Ruleset, choice: Choice, level: number): ChoiceOption[] {
  const source = choice.source

  switch (source.kind) {
    case 'options':
      return source.options

    case 'skills': {
      const allowed = source.from
      return ruleset.skills
        .filter((skill) => !allowed || allowed.includes(skill.id))
        .map((skill) => ({
          id: skill.id,
          name: skill.name,
          summary: abilityLabel(ruleset, skill.ability),
          effects: [{ type: 'proficiency', category: 'skill', value: skill.id }] as Effect[],
        }))
    }

    case 'abilities': {
      const allowed = source.from
      return ruleset.abilities
        .filter((ability) => !allowed || allowed.includes(ability.id))
        .map((ability) => ({
          id: ability.id,
          name: ability.name,
          summary: `+${source.amount}`,
          effects: [{ type: 'ability', ability: ability.id, amount: source.amount }] as Effect[],
        }))
    }

    case 'proficiencies':
      return source.from.map((value) => ({
        id: value,
        name: value,
        effects: [{ type: 'proficiency', category: source.category, value }] as Effect[],
      }))

    case 'collection': {
      const collection = findCollection(ruleset, source.collection)
      if (!collection) return []
      return collection.entries
        .filter((entry) => !source.tag || (entry.tags ?? []).includes(source.tag))
        .map((entry) => entryToOption(entry, level))
    }
  }
}

function abilityLabel(ruleset: Ruleset, abilityId: string): string {
  return ruleset.abilities.find((ability) => ability.id === abilityId)?.name ?? abilityId
}

interface WalkContext {
  ruleset: Ruleset
  state: CharacterState
  stepId: string
  out: Resolution
}

/**
 * Walk every choice an entry or option opens, recording the choice itself and
 * recursing into whatever the player selected.
 */
function walkChoices(context: WalkContext, choices: Choice[], ownerPath: string, ownerName: string): void {
  const { ruleset, state, out } = context

  for (const choice of choices) {
    if (choice.minLevel && state.level < choice.minLevel) continue

    const key = choiceKey(ownerPath, choice.id)
    const count = choice.count ?? 1
    const options = optionsForChoice(ruleset, choice, state.level)
    const selected = (state.selections[key] ?? []).filter((id) => options.some((option) => option.id === id))

    out.choices.push({
      key,
      prompt: choice.prompt,
      count,
      allowDuplicates: choice.allowDuplicates ?? false,
      options,
      selected,
      source: ownerName,
      stepId: context.stepId,
      satisfied: selected.length >= count,
    })

    for (const optionId of selected) {
      const option = options.find((candidate) => candidate.id === optionId)
      if (!option) continue
      for (const effect of option.effects ?? []) {
        out.effects.push({ effect, source: option.name })
      }
      if (option.choices?.length) {
        walkChoices(context, option.choices, `${key}/opt:${optionId}`, option.name)
      }
    }
  }
}

/**
 * Resolve a character against its ruleset: which entries are picked, which
 * effects are active, and which questions are still open.
 */
export function resolveCharacter(ruleset: Ruleset, state: CharacterState): Resolution {
  const out: Resolution = { effects: [], choices: [], picks: {} }

  for (const step of ruleset.steps) {
    if (step.kind !== 'pick') continue

    const key = stepKey(step.id)
    const selectedIds = state.selections[key] ?? []
    const entries: Entry[] = []

    for (const entryId of selectedIds) {
      const entry = findEntry(ruleset, step.collection, entryId)
      if (!entry) continue
      entries.push(entry)

      const option = entryToOption(entry, state.level)
      for (const effect of option.effects ?? []) {
        out.effects.push({ effect, source: entry.name })
      }

      const path = entryPath(key, entry.id)
      walkChoices({ ruleset, state, stepId: step.id, out }, option.choices ?? [], path, entry.name)
    }

    out.picks[step.id] = entries
  }

  return out
}

/** Choices that still need attention, in wizard order. */
export function pendingChoices(resolution: Resolution): ResolvedChoice[] {
  return resolution.choices.filter((choice) => !choice.satisfied)
}

/** Steps that declare a `collection`, for convenience in the UI. */
export function stepCollection(ruleset: Ruleset, step: Step): Collection | undefined {
  if ('collection' in step && typeof step.collection === 'string') {
    return findCollection(ruleset, step.collection)
  }
  return undefined
}
