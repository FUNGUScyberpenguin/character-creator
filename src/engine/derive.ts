import type { CharacterState, InventoryItem } from './character'
import { evaluateInt } from './expression'
import type { Resolution, SourcedEffect } from './resolve'
import { findCollection, resolveCharacter } from './resolve'
import type { Entry, Ruleset } from './types'

export interface DerivedSkill {
  id: string
  name: string
  ability: string
  abilityAbbr: string
  proficient: boolean
  expertise: boolean
  modifier: number
}

export interface DerivedSave {
  ability: string
  name: string
  abbr: string
  proficient: boolean
  modifier: number
}

export interface DerivedFeature {
  name: string
  description: string
  uses?: string
  source: string
}

export interface DerivedResource {
  name: string
  value: number
}

export interface DerivedSpellcasting {
  id: string
  label: string
  ability: string
  abilityAbbr: string
  preparation: 'prepared' | 'known'
  list: string
  modifier: number
  saveDC?: number
  attackBonus?: number
  /** Slots by spell level; index 0 is 1st-level. */
  slots: number[]
  maxSpellLevel: number
  cantripsKnown?: number
  spellsKnown?: number
  /** Spells the player has chosen for this source. */
  chosen: Entry[]
}

export interface DerivedStatValue {
  id: string
  label: string
  value: number
  /** What the sheet should print — the value, formatted per the ruleset. */
  display: string
  signed: boolean
  slot: 'primary' | 'secondary' | 'combat'
  description?: string
}

export interface DerivedCharacter {
  state: CharacterState
  resolution: Resolution
  level: number
  proficiencyBonus: number
  abilityScores: Record<string, number>
  abilityModifiers: Record<string, number>
  saves: DerivedSave[]
  skills: DerivedSkill[]
  /** Proficiency category id to the values held in it. */
  proficiencies: Record<string, { value: string; expertise: boolean }[]>
  features: DerivedFeature[]
  resources: DerivedResource[]
  spellcasting: DerivedSpellcasting[]
  inventory: InventoryItem[]
  notes: string[]
  stats: Record<string, number | string>
  derived: DerivedStatValue[]
  /** The variable context every formula was evaluated against. */
  context: Record<string, number>
}

/**
 * The line under a character's name: class and level, then their picks, with
 * any `descriptor` choice standing in for the pick it refines (so an Ironvein
 * Dwarf reads as "Ironvein Dwarf" rather than "Dwarf, Ironvein Dwarf").
 */
export function describeCharacter(derived: DerivedCharacter): string[] {
  const descriptors = derived.resolution.choices
    .filter((choice) => choice.descriptor)
    .flatMap((choice) => choice.selected.map((id) => choice.options.find((o) => o.id === id)?.name))
    .filter((name): name is string => !!name)

  const parts: string[] = []
  for (const [stepId, entries] of Object.entries(derived.resolution.picks)) {
    for (const entry of entries) {
      const refinement = descriptors.find((d) => d.toLowerCase().includes(entry.name.toLowerCase()))
      parts.push(refinement ?? entry.name)
      if (stepId === 'class') parts[parts.length - 1] += ` ${derived.level}`
    }
  }
  // Descriptors that did not fold into a pick still belong on the sheet.
  for (const d of descriptors) if (!parts.includes(d)) parts.push(d)
  return parts
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Turn a resolved character into the numbers and lists a sheet needs.
 *
 * Effects are applied in a fixed order — scores, then stats, then everything
 * that reads them — so a formula never sees a half-built character.
 */
export function deriveCharacter(ruleset: Ruleset, state: CharacterState): DerivedCharacter {
  const resolution = resolveCharacter(ruleset, state)
  const effects = resolution.effects

  const level = Math.min(Math.max(state.level, 1), ruleset.maxLevel)

  // 1. Ability scores: base assignment plus every increase granted.
  const abilityScores: Record<string, number> = {}
  for (const ability of ruleset.abilities) {
    abilityScores[ability.id] = state.baseAbilityScores[ability.id] ?? 10
  }
  for (const { effect } of effects) {
    if (effect.type !== 'ability') continue
    abilityScores[effect.ability] = (abilityScores[effect.ability] ?? 10) + effect.amount
  }
  if (typeof ruleset.abilityScoreMax === 'number') {
    for (const key of Object.keys(abilityScores)) {
      abilityScores[key] = Math.min(abilityScores[key]!, ruleset.abilityScoreMax)
    }
  }

  const abilityModifiers: Record<string, number> = {}
  for (const [id, score] of Object.entries(abilityScores)) {
    abilityModifiers[id] = abilityModifier(score)
  }

  // 2. The stat bag: ruleset defaults, then `set`, then `bonus`.
  const stats: Record<string, number | string> = { ...(ruleset.baseStats ?? {}) }
  for (const { effect } of effects) {
    if (effect.type === 'set') stats[effect.stat] = effect.value
  }
  for (const { effect } of effects) {
    if (effect.type !== 'bonus') continue
    const current = stats[effect.stat]
    stats[effect.stat] = (typeof current === 'number' ? current : 0) + effect.amount
  }

  // 3. Build the formula context now that scores and stats are settled.
  const proficiencyBonus = evaluateInt(ruleset.proficiencyBonus, { level })
  const context: Record<string, number> = { level, prof: proficiencyBonus, proficiencyBonus }
  for (const ability of ruleset.abilities) {
    context[ability.id] = abilityScores[ability.id] ?? 10
    context[`${ability.id}.mod`] = abilityModifiers[ability.id] ?? 0
  }
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value !== 'number') continue
    context[`stat.${key}`] = value
    if (context[key] === undefined) context[key] = value
  }

  // 4. Proficiencies, grouped by the categories the ruleset declares.
  const proficiencies: Record<string, { value: string; expertise: boolean }[]> = {}
  for (const category of ruleset.proficiencyCategories) proficiencies[category.id] = []
  for (const { effect } of effects) {
    if (effect.type !== 'proficiency') continue
    const bucket = (proficiencies[effect.category] ??= [])
    const existing = bucket.find((item) => item.value === effect.value)
    if (existing) {
      // Picking the same proficiency twice upgrades it rather than duplicating.
      existing.expertise = existing.expertise || !!effect.expertise
    } else {
      bucket.push({ value: effect.value, expertise: !!effect.expertise })
    }
  }
  for (const bucket of Object.values(proficiencies)) {
    bucket.sort((a, b) => a.value.localeCompare(b.value))
  }

  const skillProficiencies = proficiencies['skill'] ?? []
  const saveProficiencies = proficiencies['save'] ?? []

  const skills: DerivedSkill[] = ruleset.skills.map((skill) => {
    const held = skillProficiencies.find((item) => item.value === skill.id)
    const ability = ruleset.abilities.find((candidate) => candidate.id === skill.ability)
    const base = abilityModifiers[skill.ability] ?? 0
    const bonus = held ? (held.expertise ? proficiencyBonus * 2 : proficiencyBonus) : 0
    return {
      id: skill.id,
      name: skill.name,
      ability: skill.ability,
      abilityAbbr: ability?.abbr ?? skill.ability.toUpperCase(),
      proficient: !!held,
      expertise: !!held?.expertise,
      modifier: base + bonus,
    }
  })

  const saves: DerivedSave[] = ruleset.abilities.map((ability) => {
    const proficient = saveProficiencies.some((item) => item.value === ability.id)
    return {
      ability: ability.id,
      name: ability.name,
      abbr: ability.abbr,
      proficient,
      modifier: (abilityModifiers[ability.id] ?? 0) + (proficient ? proficiencyBonus : 0),
    }
  })

  // Skill and save totals join the context so sheet formulas can build on them
  // (a passive score, for instance, is just 10 + the skill modifier).
  for (const skill of skills) context[`skill.${skill.id}`] = skill.modifier
  for (const save of saves) context[`save.${save.ability}`] = save.modifier

  // 5. Descriptive output.
  const features: DerivedFeature[] = []
  const resources: DerivedResource[] = []
  const notes: string[] = []
  const granted: InventoryItem[] = []

  for (const { effect, source } of effects) {
    switch (effect.type) {
      case 'feature':
        features.push({ name: effect.name, description: effect.description, uses: effect.uses, source })
        break
      case 'resource':
        resources.push({ name: effect.name, value: evaluateInt(effect.formula, context) })
        break
      case 'note':
        notes.push(effect.text)
        break
      case 'item':
        addItem(granted, effect.item, effect.quantity ?? 1)
        break
      default:
        break
    }
  }

  const inventory = [...granted]
  for (const item of state.inventory) addItem(inventory, item.name, item.quantity)

  const spellcasting = deriveSpellcasting(ruleset, state, effects, context, level, abilityModifiers)

  const derived: DerivedStatValue[] = ruleset.derived.map((stat) => {
    const value = evaluateInt(stat.formula, context)
    const plain = stat.signed ? (value >= 0 ? `+${value}` : `${value}`) : String(value)
    return {
      id: stat.id,
      label: stat.label,
      value,
      display: stat.format ? formatStat(stat.format, value, plain, context, stats) : plain,
      signed: !!stat.signed,
      slot: stat.slot ?? 'secondary',
      description: stat.description,
    }
  })

  // Derived values feed back into the context so later formulas — and the PDF —
  // can refer to them by id (e.g. a "passive perception" that reads `ac`).
  for (const stat of derived) context[stat.id] = stat.value

  return {
    state,
    resolution,
    level,
    proficiencyBonus,
    abilityScores,
    abilityModifiers,
    saves,
    skills,
    proficiencies,
    features,
    resources,
    spellcasting,
    inventory,
    notes,
    stats,
    derived,
    context,
  }
}

/**
 * Fill a `{placeholder}` template. `{value}` is the formatted number; anything
 * else is looked up in the formula context, then the stat bag (which is how a
 * non-numeric stat such as a size or a damage type can appear on the sheet).
 */
function formatStat(
  template: string,
  value: number,
  plain: string,
  context: Record<string, number>,
  stats: Record<string, number | string>,
): string {
  return template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    if (name === 'value') return plain
    if (name === 'raw') return String(value)
    const fromContext = context[name]
    if (fromContext !== undefined) return String(fromContext)
    const key = name.startsWith('stat.') ? name.slice(5) : name
    const fromStats = stats[key]
    return fromStats === undefined ? '' : String(fromStats)
  })
}

function addItem(list: InventoryItem[], name: string, quantity: number): void {
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = list.find((item) => item.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) existing.quantity += quantity
  else list.push({ name: trimmed, quantity })
}

function deriveSpellcasting(
  ruleset: Ruleset,
  state: CharacterState,
  effects: SourcedEffect[],
  context: Record<string, number>,
  level: number,
  abilityModifiers: Record<string, number>,
): DerivedSpellcasting[] {
  const sources: DerivedSpellcasting[] = []
  const spellCollection = findSpellCollection(ruleset)

  for (const { effect } of effects) {
    if (effect.type !== 'spellcasting') continue

    const modifier = abilityModifiers[effect.ability] ?? 0
    const localContext = { ...context, castingMod: modifier }
    const slots = effect.slots ? (ruleset.spellSlotTables?.[effect.slots]?.[level - 1] ?? []) : []
    const maxSpellLevel = slots.reduce((max, count, index) => (count > 0 ? index + 1 : max), 0)
    const ability = ruleset.abilities.find((candidate) => candidate.id === effect.ability)

    const chosenIds = state.spells[effect.id] ?? []
    const chosen = spellCollection
      ? chosenIds
          .map((id) => spellCollection.entries.find((entry) => entry.id === id))
          .filter((entry): entry is Entry => !!entry)
      : []

    const formulas = ruleset.spellcastingFormulas

    sources.push({
      id: effect.id,
      label: effect.label,
      ability: effect.ability,
      abilityAbbr: ability?.abbr ?? effect.ability.toUpperCase(),
      preparation: effect.preparation,
      list: effect.list,
      modifier,
      saveDC: formulas?.saveDC ? evaluateInt(formulas.saveDC, localContext) : undefined,
      attackBonus: formulas?.attackBonus ? evaluateInt(formulas.attackBonus, localContext) : undefined,
      slots,
      maxSpellLevel,
      cantripsKnown: effect.cantripsKnown ? Math.max(0, evaluateInt(effect.cantripsKnown, localContext)) : undefined,
      spellsKnown: effect.spellsKnown ? Math.max(0, evaluateInt(effect.spellsKnown, localContext)) : undefined,
      chosen,
    })
  }

  return sources
}

/** The collection a `spells` step draws from, if the ruleset has one. */
export function findSpellCollection(ruleset: Ruleset) {
  const step = ruleset.steps.find((candidate) => candidate.kind === 'spells')
  return step && 'collection' in step ? findCollection(ruleset, step.collection) : undefined
}

/** Spells a source may pick from, filtered by list membership and slot level. */
export function availableSpells(
  ruleset: Ruleset,
  collectionId: string,
  source: DerivedSpellcasting,
): Entry[] {
  const collection = findCollection(ruleset, collectionId)
  if (!collection) return []
  return collection.entries.filter((entry) => {
    if (!(entry.tags ?? []).includes(source.list)) return false
    const spellLevel = Number(entry.meta?.['level'] ?? 0)
    return spellLevel <= source.maxSpellLevel
  })
}
