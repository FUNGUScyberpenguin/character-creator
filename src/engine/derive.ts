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

/** One row of "what do I roll" for a weapon the character is carrying. */
export interface DerivedAttack {
  name: string
  /** Ability the attack uses, e.g. "DEX". */
  abilityAbbr: string
  attackBonus: number
  /** Damage dice plus the ability bonus, e.g. "1d8 + 3 slashing". */
  damage: string
  properties?: string
  proficient: boolean
}

/** What the character is wearing, and what it does for them. */
export interface DerivedArmor {
  /** Body armour being worn, if any. */
  worn?: { name: string; base: number; dexApplied: number; dexMax?: number }
  /** Shields being held. */
  shields: { name: string; bonus: number }[]
  /** Total Armor Class contributed by worn gear, before class features. */
  armorClass?: number
  /** Problems worth telling the player about, in plain language. */
  warnings: string[]
}

/** Something the character can do, grouped by when they can do it. */
export interface DerivedAction {
  name: string
  timing: string
  timingLabel: string
  description: string
  uses?: string
  source: string
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
  /** Set when the player replaced the computed value by hand. */
  override?: { value: number; note?: string }
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
  armor: DerivedArmor
  attacks: DerivedAttack[]
  actions: DerivedAction[]
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

/** The d20 default, used when a ruleset does not declare its own. */
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
    abilityModifiers[id] = ruleset.abilityModifier
      ? evaluateInt(ruleset.abilityModifier, { score })
      : abilityModifier(score)
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
  for (const custom of state.customProficiencies) {
    const bucket = (proficiencies[custom.category] ??= [])
    if (!bucket.some((item) => item.value === custom.value)) bucket.push({ value: custom.value, expertise: false })
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

  const actions: DerivedAction[] = []
  const timingLabel = (id: string) =>
    ruleset.actionTimings?.find((timing) => timing.id === id)?.label ?? id

  for (const { effect, source } of effects) {
    switch (effect.type) {
      case 'feature':
        features.push({ name: effect.name, description: effect.description, uses: effect.uses, source })
        if (effect.action) {
          actions.push({
            name: effect.name,
            timing: effect.action,
            timingLabel: timingLabel(effect.action),
            description: effect.description,
            uses: effect.uses,
            source,
          })
        }
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

  for (const custom of state.customFeatures) {
    features.push({ name: custom.name, description: custom.description, uses: custom.uses, source: 'Custom' })
    if (custom.action) {
      actions.push({
        name: custom.name,
        timing: custom.action,
        timingLabel: timingLabel(custom.action),
        description: custom.description,
        uses: custom.uses,
        source: 'Custom',
      })
    }
  }

  const inventory = [...granted]
  for (const item of state.inventory) addItem(inventory, item.name, item.quantity)

  const armor = deriveArmor(ruleset, state, inventory, proficiencies, abilityScores, abilityModifiers)

  // Worn gear reaches the sheet through the stat bag, so the ruleset's own
  // Armor Class formula decides what to do with it.
  stats['armorAC'] = armor.armorClass ?? 0
  stats['shieldBonus'] = armor.shields.reduce((total, shield) => total + shield.bonus, 0)
  stats['wearingArmor'] = armor.worn ? 1 : 0
  context['stat.armorAC'] = Number(stats['armorAC'])
  context['stat.shieldBonus'] = Number(stats['shieldBonus'])
  context['stat.wearingArmor'] = Number(stats['wearingArmor'])

  notes.push(...armor.warnings)

  const attacks = deriveAttacks(ruleset, inventory, proficiencies, abilityModifiers, context)

  // Sort actions into the order the ruleset declares its timings.
  const order = (ruleset.actionTimings ?? []).map((timing) => timing.id)
  actions.sort((a, b) => {
    const ai = order.indexOf(a.timing)
    const bi = order.indexOf(b.timing)
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi)
  })

  const spellcasting = deriveSpellcasting(ruleset, state, effects, context, level, abilityModifiers)

  // Evaluated in order, each result folded into the context before the next is
  // computed, so a stat may build on one declared above it — a Defence that
  // reads a proficiency bonus, say. Referencing one declared *later* yields 0,
  // which is the same rule as any other unknown name.
  const derived: DerivedStatValue[] = []
  for (const stat of ruleset.derived) {
    const override = state.overrides[stat.id]
    const value = override ? override.value : evaluateInt(stat.formula, context)
    const plain = stat.signed ? (value >= 0 ? `+${value}` : `${value}`) : String(value)

    context[stat.id] = value

    derived.push({
      id: stat.id,
      label: stat.label,
      value,
      display: stat.format ? formatStat(stat.format, value, plain, context, stats) : plain,
      signed: !!stat.signed,
      slot: stat.slot ?? 'secondary',
      description: stat.description,
      override,
    })
  }

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
    armor,
    attacks,
    actions,
    notes,
    stats,
    derived,
    context,
  }
}

/**
 * Work out what worn armour does.
 *
 * Only equipped items count: a breastplate in your pack protects nothing. When
 * several pieces of body armour are worn — which the rules do not allow but a
 * half-finished character often has — the best one is used and the rest ignored.
 */
function deriveArmor(
  ruleset: Ruleset,
  state: CharacterState,
  inventory: InventoryItem[],
  proficiencies: Record<string, { value: string; expertise: boolean }[]>,
  abilityScores: Record<string, number>,
  abilityModifiers: Record<string, number>,
): DerivedArmor {
  const result: DerivedArmor = { shields: [], warnings: [] }
  const rules = ruleset.armor
  const collection = rules ? findCollection(ruleset, rules.collection) : undefined
  if (!rules || !collection) return result

  const baseKey = rules.baseKey ?? 'acBase'
  const dexMaxKey = rules.dexMaxKey ?? 'acDexMax'
  const bonusKey = rules.bonusKey ?? 'acBonus'
  const strengthKey = rules.strengthKey ?? 'strengthMin'
  const dexMod = abilityModifiers[rules.ability ?? 'dex'] ?? 0
  const held = (proficiencies[rules.proficiencyCategory ?? 'armor'] ?? []).map((item) => item.value.toLowerCase())

  const equipped = new Set(state.equipped.map((name) => name.toLowerCase()))
  const worn = inventory
    .filter((item) => equipped.has(item.name.toLowerCase()))
    .map((item) => collection.entries.find((entry) => entry.name.toLowerCase() === item.name.toLowerCase()))
    .filter((entry): entry is Entry => !!entry && (entry.tags ?? []).includes(rules.tag))

  const bodyArmor = worn.filter((entry) => !rules.shieldTag || !(entry.tags ?? []).includes(rules.shieldTag))
  const shields = worn.filter((entry) => rules.shieldTag && (entry.tags ?? []).includes(rules.shieldTag))

  for (const entry of shields) {
    result.shields.push({ name: entry.name, bonus: Number(entry.meta?.[bonusKey] ?? 0) })
  }

  // Pick whichever worn armour actually protects best.
  let best: DerivedArmor['worn']
  for (const entry of bodyArmor) {
    const base = Number(entry.meta?.[baseKey] ?? 0)
    if (!base) continue
    const rawMax = entry.meta?.[dexMaxKey]
    const dexMax = rawMax === undefined ? undefined : Number(rawMax)
    const dexApplied = dexMax === undefined ? dexMod : Math.min(dexMod, dexMax)
    const total = base + dexApplied
    if (!best || total > best.base + best.dexApplied) {
      best = { name: entry.name, base, dexApplied, ...(dexMax === undefined ? {} : { dexMax }) }
    }
  }

  if (bodyArmor.length > 1) {
    result.warnings.push(`You have more than one set of armor equipped; only ${best?.name ?? 'one'} is counted.`)
  }

  if (best) {
    result.worn = best
    result.armorClass = best.base + best.dexApplied
  }

  // Requirements and penalties the player should know about, not be blocked by.
  for (const entry of [...bodyArmor, ...shields]) {
    const required = Number(entry.meta?.[strengthKey] ?? 0)
    const strength = abilityScores[rules.strengthAbility ?? 'str'] ?? 10
    if (required && strength < required) {
      result.warnings.push(`${entry.name} requires Strength ${required}; yours is ${strength}, so your speed drops by 10 feet.`)
    }

    const categories = (entry.tags ?? []).filter((tag) => tag !== rules.tag)
    const covering = categories.flatMap((tag) => rules.blanketProficiencies?.[tag] ?? [])
    const proficient =
      held.includes(entry.name.toLowerCase()) || covering.some((value) => held.includes(value.toLowerCase()))
    if (!proficient) {
      result.warnings.push(
        `You are not proficient with ${entry.name}: disadvantage on ability checks, saves and attacks using Strength or Dexterity, and you cannot cast spells.`,
      )
    }
  }

  return result
}

/**
 * Work out what each carried weapon rolls.
 *
 * Everything system-specific — which ability applies, what counts as
 * proficiency, how the bonus is assembled — comes from `ruleset.weapons`, so a
 * game where axes key off Willpower needs no code here.
 */
function deriveAttacks(
  ruleset: Ruleset,
  inventory: InventoryItem[],
  proficiencies: Record<string, { value: string; expertise: boolean }[]>,
  abilityModifiers: Record<string, number>,
  context: Record<string, number>,
): DerivedAttack[] {
  const rules = ruleset.weapons
  if (!rules) return []

  const collection = findCollection(ruleset, rules.collection)
  if (!collection) return []

  const held = (proficiencies[rules.proficiencyCategory] ?? []).map((item) => item.value.toLowerCase())
  const damageKey = rules.damageKey ?? 'Damage'
  const propertiesKey = rules.propertiesKey ?? 'Properties'
  const attacks: DerivedAttack[] = []

  for (const item of inventory) {
    const entry = collection.entries.find((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase())
    if (!entry || !(entry.tags ?? []).includes(rules.tag)) continue

    const properties = String(entry.meta?.[propertiesKey] ?? '')
    const tags = entry.tags ?? []

    // First matching rule decides which ability applies; several abilities
    // means take the best, which is how a finesse weapon behaves.
    let abilities = [ruleset.abilities[0]?.id ?? 'str']
    for (const rule of rules.abilityRules) {
      const matchesProperty = rule.property ? properties.toLowerCase().includes(rule.property.toLowerCase()) : true
      const matchesTag = rule.tag ? tags.includes(rule.tag) : true
      if (matchesProperty && matchesTag) {
        abilities = rule.abilities
        break
      }
    }
    const best = abilities.reduce((chosen, id) =>
      (abilityModifiers[id] ?? 0) > (abilityModifiers[chosen] ?? 0) ? id : chosen,
    )
    const weaponMod = abilityModifiers[best] ?? 0

    const blanket = Object.entries(rules.blanketProficiencies ?? {})
      .filter(([tag]) => tags.includes(tag))
      .map(([, value]) => value.toLowerCase())
    const proficient = held.includes(entry.name.toLowerCase()) || blanket.some((value) => held.includes(value))

    const local = { ...context, weaponMod, proficient: proficient ? 1 : 0 }
    const attackBonus = evaluateInt(rules.attackFormula ?? 'weaponMod + if(proficient, prof, 0)', local)
    const damageBonus = evaluateInt(rules.damageBonusFormula ?? 'weaponMod', local)

    const dice = String(entry.meta?.[damageKey] ?? '').trim()
    const damage = dice
      ? dice.replace(/^(\S+)/, (match) => (damageBonus === 0 ? match : `${match} ${damageBonus > 0 ? '+' : '-'} ${Math.abs(damageBonus)}`))
      : '—'

    attacks.push({
      name: item.quantity > 1 ? `${entry.name} (x${item.quantity})` : entry.name,
      abilityAbbr: ruleset.abilities.find((a) => a.id === best)?.abbr ?? best.toUpperCase(),
      attackBonus,
      damage,
      properties: properties && properties !== '—' ? properties : undefined,
      proficient,
    })
  }

  return attacks
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
