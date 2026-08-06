import { describe, expect, it } from 'vitest'

import { createCharacter, stepKey } from '../../engine/character'
import { deriveCharacter } from '../../engine/derive'
import { findCollection, optionsForChoice, resolveCharacter } from '../../engine/resolve'
import type { Choice, Entry } from '../../engine/types'
import { dnd5e } from './index'

/**
 * Integrity checks for the bundled ruleset.
 *
 * These are the cheap, mechanical mistakes that data of this size invites — a
 * skill id that does not exist, a class whose spell slots drift from the table,
 * an ability score improvement on the wrong level. Point them at a new ruleset
 * and they do the same job for it.
 */

const skillIds = new Set(dnd5e.skills.map((s) => s.id))
const abilityIds = new Set(dnd5e.abilities.map((a) => a.id))
const categoryIds = new Set(dnd5e.proficiencyCategories.map((c) => c.id))
const collectionIds = new Set(dnd5e.collections.map((c) => c.id))

const classes = findCollection(dnd5e, 'classes')!
const spells = findCollection(dnd5e, 'spells')!

const CLASS_LISTS = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard']

/** Every choice in the ruleset, with a readable path for failure messages. */
function allChoices(): { choice: Choice; where: string }[] {
  const out: { choice: Choice; where: string }[] = []

  const walk = (choices: Choice[] | undefined, where: string) => {
    for (const choice of choices ?? []) {
      out.push({ choice, where })
      if (choice.source.kind === 'options') {
        for (const option of choice.source.options) walk(option.choices, `${where} > ${choice.id}:${option.id}`)
      }
    }
  }

  for (const collection of dnd5e.collections) {
    for (const entry of collection.entries) {
      const where = `${collection.id}/${entry.id}`
      walk(entry.choices, where)
      for (const grant of entry.levels ?? []) walk(grant.choices, `${where}@L${grant.level}`)
    }
  }
  return out
}

function allEffects(): { effect: NonNullable<Entry['effects']>[number]; where: string }[] {
  const out: { effect: NonNullable<Entry['effects']>[number]; where: string }[] = []
  for (const collection of dnd5e.collections) {
    for (const entry of collection.entries) {
      const where = `${collection.id}/${entry.id}`
      for (const effect of entry.effects ?? []) out.push({ effect, where })
      for (const grant of entry.levels ?? []) {
        for (const effect of grant.effects ?? []) out.push({ effect, where: `${where}@L${grant.level}` })
      }
    }
  }
  return out
}

describe('references resolve', () => {
  it('only names skills, abilities and categories that exist', () => {
    for (const { choice, where } of allChoices()) {
      const source = choice.source
      if (source.kind === 'skills') {
        for (const id of source.from ?? []) expect(skillIds.has(id), `${where}/${choice.id}: skill "${id}"`).toBe(true)
      }
      if (source.kind === 'abilities') {
        for (const id of source.from ?? []) expect(abilityIds.has(id), `${where}/${choice.id}: ability "${id}"`).toBe(true)
      }
      if (source.kind === 'proficiencies') {
        expect(categoryIds.has(source.category), `${where}/${choice.id}: category "${source.category}"`).toBe(true)
      }
      if (source.kind === 'collection') {
        expect(collectionIds.has(source.collection), `${where}/${choice.id}: collection "${source.collection}"`).toBe(true)
      }
    }

    for (const { effect, where } of allEffects()) {
      if (effect.type === 'proficiency') {
        expect(categoryIds.has(effect.category), `${where}: category "${effect.category}"`).toBe(true)
        if (effect.category === 'skill') expect(skillIds.has(effect.value), `${where}: skill "${effect.value}"`).toBe(true)
        if (effect.category === 'save') expect(abilityIds.has(effect.value), `${where}: save "${effect.value}"`).toBe(true)
      }
      if (effect.type === 'ability') expect(abilityIds.has(effect.ability), `${where}: ability "${effect.ability}"`).toBe(true)
      if (effect.type === 'spellcasting') {
        expect(abilityIds.has(effect.ability), `${where}: casting ability`).toBe(true)
        if (effect.slots) expect(dnd5e.spellSlotTables?.[effect.slots], `${where}: slot table "${effect.slots}"`).toBeDefined()
      }
    }
  })

  it('never offers a choice with too few options to satisfy it', () => {
    for (const { choice, where } of allChoices()) {
      if (choice.source.kind !== 'collection') continue
      const options = optionsForChoice(dnd5e, choice, dnd5e.maxLevel)
      expect(options.length, `${where}/${choice.id} offers nothing`).toBeGreaterThan(0)
      expect(options.length, `${where}/${choice.id} needs ${choice.count ?? 1}`).toBeGreaterThanOrEqual(choice.count ?? 1)
    }
  })

  it('gives every choice a unique id within its owner', () => {
    for (const collection of dnd5e.collections) {
      for (const entry of collection.entries) {
        const ids = [
          ...(entry.choices ?? []).map((c) => c.id),
          ...(entry.levels ?? []).flatMap((l) => (l.choices ?? []).map((c) => c.id)),
        ]
        expect(new Set(ids).size, `${collection.id}/${entry.id}: ${ids.join(', ')}`).toBe(ids.length)
      }
    }
  })
})

describe('class progressions', () => {
  const HIT_DICE: Record<string, number> = {
    barbarian: 12, bard: 8, cleric: 8, druid: 8, fighter: 10, monk: 8,
    paladin: 10, ranger: 10, rogue: 8, sorcerer: 6, warlock: 8, wizard: 6,
  }

  it.each(classes.entries.map((entry) => [entry.id] as const))('%s has the right hit points at every level', (id) => {
    for (const level of [1, 2, 5, 11, 20]) {
      const state = createCharacter(dnd5e)
      state.level = level
      state.baseAbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
      state.selections[stepKey('class')] = [id]

      const derived = deriveCharacter(dnd5e, state)
      const die = HIT_DICE[id]!
      // Read CON back rather than assuming 10: the barbarian's Primal Champion
      // raises it at 20th level, which lifts hit points retroactively.
      const con = derived.abilityModifiers['con'] ?? 0
      const expected = die + con + (level - 1) * (Math.floor(die / 2) + 1 + con)

      expect(derived.derived.find((s) => s.id === 'hp')!.value, `${id} at level ${level}`).toBe(expected)
    }
  })

  it('matches the published spell slot tables', () => {
    const full = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']
    const half = ['paladin', 'ranger']

    for (const id of [...full, ...half]) {
      for (let level = 1; level <= 20; level += 1) {
        const state = createCharacter(dnd5e)
        state.level = level
        state.selections[stepKey('class')] = [id]
        const source = deriveCharacter(dnd5e, state).spellcasting[0]

        if (half.includes(id) && level === 1) {
          expect(source, `${id} should not cast at level 1`).toBeUndefined()
          continue
        }
        const table = full.includes(id) ? 'full' : 'half'
        expect(source?.slots, `${id} at level ${level}`).toEqual(dnd5e.spellSlotTables![table]![level - 1])
      }
    }
  })

  it('grants ability score improvements on the correct levels', () => {
    const expected: Record<string, number[]> = {
      fighter: [4, 6, 8, 12, 14, 16, 19],
      rogue: [4, 8, 10, 12, 16, 19],
    }

    for (const entry of classes.entries) {
      const state = createCharacter(dnd5e)
      state.level = 20
      state.selections[stepKey('class')] = [entry.id]

      const levels = resolveCharacter(dnd5e, state)
        .choices.filter((c) => c.key.includes('/choice:asi-'))
        .map((c) => Number(c.key.split('asi-')[1]))

      expect([...new Set(levels)].sort((a, b) => a - b), entry.id).toEqual(expected[entry.id] ?? [4, 8, 12, 16, 19])
    }
  })
})

describe('spells', () => {
  it('gives every spell a valid level and a matching tag', () => {
    for (const spell of spells.entries) {
      const level = Number(spell.meta?.['level'])
      expect(Number.isInteger(level) && level >= 0 && level <= 9, `${spell.name}: level ${level}`).toBe(true)
      expect(spell.tags ?? [], spell.name).toContain(`level-${level}`)
    }
  })

  it('leaves no class list empty', () => {
    for (const list of CLASS_LISTS) {
      const count = spells.entries.filter((s) => (s.tags ?? []).includes(list)).length
      expect(count, `${list} spell list`).toBeGreaterThan(0)
    }
  })

  it('offers each caster enough spells to fill its level-1 quota', () => {
    for (const entry of classes.entries) {
      const state = createCharacter(dnd5e)
      state.baseAbilityScores = { str: 10, dex: 10, con: 10, int: 16, wis: 16, cha: 16 }
      state.selections[stepKey('class')] = [entry.id]

      for (const source of deriveCharacter(dnd5e, state).spellcasting) {
        const list = spells.entries.filter((s) => (s.tags ?? []).includes(source.list))
        const cantrips = list.filter((s) => Number(s.meta?.['level']) === 0).length
        const firstLevel = list.filter((s) => Number(s.meta?.['level']) === 1).length

        expect(cantrips, `${entry.id} cantrips`).toBeGreaterThanOrEqual(source.cantripsKnown ?? 0)
        expect(firstLevel, `${entry.id} spells`).toBeGreaterThanOrEqual(source.spellsKnown ?? 0)
      }
    }
  })
})

describe('sheet output', () => {
  it('produces finite, sensibly bounded numbers for every race', () => {
    for (const race of findCollection(dnd5e, 'races')!.entries) {
      const state = createCharacter(dnd5e)
      state.selections[stepKey('race')] = [race.id]
      const derived = deriveCharacter(dnd5e, state)

      for (const stat of derived.derived) {
        expect(Number.isFinite(stat.value), `${race.id}: ${stat.id}`).toBe(true)
        expect(stat.display.length, `${race.id}: ${stat.id} has no display value`).toBeGreaterThan(0)
      }
      const speed = derived.derived.find((s) => s.id === 'speed')!.value
      expect(speed, race.id).toBeGreaterThanOrEqual(20)
      expect(speed, race.id).toBeLessThanOrEqual(40)
    }
  })

  it('shows hit dice as a count and a die size', () => {
    const state = createCharacter(dnd5e)
    state.level = 5
    state.selections[stepKey('class')] = ['fighter']
    expect(deriveCharacter(dnd5e, state).derived.find((s) => s.id === 'hit-dice')!.display).toBe('5d10')
  })

  it('never prints a sentinel in place of a resource value', () => {
    for (const entry of classes.entries) {
      const state = createCharacter(dnd5e)
      state.level = 20
      state.selections[stepKey('class')] = [entry.id]
      for (const resource of deriveCharacter(dnd5e, state).resources) {
        expect(resource.value, `${entry.id}: ${resource.name}`).toBeLessThan(200)
        expect(resource.value, `${entry.id}: ${resource.name}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('adds granted equipment under one name rather than two spellings', () => {
    const shop = new Set(findCollection(dnd5e, 'equipment')!.entries.map((e) => e.name.toLowerCase()))
    // Anything generic ("a martial weapon") or purely narrative is not stocked.
    const notStocked = /martial|simple|any |ritual|shadows|focus|pouch|gold pieces|prayer book|incense|vestments|belaying|blank journal|costume|pedigree|small knife|spellbook/i

    for (const { effect, where } of allEffects()) {
      if (effect.type !== 'item' || notStocked.test(effect.item)) continue
      expect(shop.has(effect.item.toLowerCase()), `${where} grants "${effect.item}", which no shop entry matches`).toBe(true)
    }
  })
})
