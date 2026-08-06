import { describe, expect, it } from 'vitest'

import { createCharacter, stepKey } from '../../engine/character'
import { deriveCharacter } from '../../engine/derive'
import { findCollection, resolveCharacter } from '../../engine/resolve'
import type { Choice, Entry } from '../../engine/types'
import { dnd5e } from '../dnd5e'
import { MASTERY_PROPERTIES } from './equipment'
import { dnd5e2024 } from './index'

/**
 * Checks specific to SRD 5.2.
 *
 * The generic suite in `rulesets.test.ts` already proves this ruleset holds
 * together. What it cannot know is whether it is the *2024* rules — so this
 * file asserts the handful of things that make the edition what it is. Each one
 * is a claim the app makes to the player, and each would be silently wrong if
 * the data drifted back towards the 5.1 module it sits beside.
 */

const classes = findCollection(dnd5e2024, 'classes')!
const species = findCollection(dnd5e2024, 'species')!
const backgrounds = findCollection(dnd5e2024, 'backgrounds')!
const feats = findCollection(dnd5e2024, 'feats')!
const masteries = findCollection(dnd5e2024, 'masteries')!
const equipment = findCollection(dnd5e2024, 'equipment')!

function choicesOf(entry: Entry): { choice: Choice; level: number }[] {
  const out: { choice: Choice; level: number }[] = []
  for (const choice of entry.choices ?? []) out.push({ choice, level: 1 })
  for (const grant of entry.levels ?? []) {
    for (const choice of grant.choices ?? []) out.push({ choice, level: grant.level })
  }
  return out
}

function effectsOf(entry: Entry) {
  return [...(entry.effects ?? []), ...(entry.levels ?? []).flatMap((grant) => grant.effects ?? [])]
}

describe('what makes these the 2024 rules', () => {
  it('gives no species an ability score increase', () => {
    // The headline change, and the one the intro screen promises. A single
    // stray `ability` effect here would make the app lie on its first screen.
    for (const entry of species.entries) {
      for (const effect of effectsOf(entry)) {
        expect(effect.type, `${entry.name} raises an ability score`).not.toBe('ability')
      }
      for (const { choice } of choicesOf(entry)) {
        expect(choice.source.kind, `${entry.name} offers an ability choice`).not.toBe('abilities')
      }
    }
  })

  it('moves the ability increases onto every background, as three points', () => {
    for (const entry of backgrounds.entries) {
      const choice = (entry.choices ?? []).find((candidate) => candidate.id === 'ability-increase')
      expect(choice, `${entry.name} has no ability increase`).toBeDefined()
      expect(choice!.source.kind).toBe('options')

      const options = choice!.source.kind === 'options' ? choice!.source.options : []
      // Seven ways to spend it: six ordered +2/+1 pairs, plus +1/+1/+1.
      expect(options.length, entry.name).toBe(7)

      for (const option of options) {
        const total = (option.effects ?? []).reduce(
          (sum, effect) => sum + (effect.type === 'ability' ? effect.amount : 0),
          0,
        )
        expect(total, `${entry.name}/${option.id} spends ${total} points`).toBe(3)
      }
    }
  })

  it('gives every background an origin feat that exists', () => {
    const originFeats = new Set(feats.entries.filter((f) => (f.tags ?? []).includes('origin')).map((f) => f.id))
    expect(originFeats.size).toBeGreaterThan(0)

    for (const entry of backgrounds.entries) {
      const choice = (entry.choices ?? []).find((candidate) => candidate.id === 'feat')
      expect(choice, `${entry.name} has no origin feat`).toBeDefined()
      expect(choice!.source).toEqual({ kind: 'collection', collection: 'feats', tag: 'origin' })

      // The card advertises a specific feat, so that name has to be real.
      const advertised = String(entry.meta?.['Feat'] ?? '').replace(/ /g, '-')
      expect(originFeats.has(advertised), `${entry.name} advertises "${advertised}"`).toBe(true)
    }
  })

  it('puts every class’s subclass at 3rd level', () => {
    for (const entry of classes.entries) {
      const subclass = choicesOf(entry).filter(({ choice }) => choice.id === 'subclass')
      expect(subclass.length, `${entry.name} subclass choices`).toBe(1)
      expect(subclass[0]!.level, `${entry.name} chooses its subclass at level ${subclass[0]!.level}`).toBe(3)
    }
  })

  it('gives every class an Epic Boon at 19th level, and no ability improvement there', () => {
    for (const entry of classes.entries) {
      const at19 = choicesOf(entry).filter(({ level }) => level === 19)
      expect(at19.map(({ choice }) => choice.id), entry.name).toEqual(['epic-boon'])
    }
  })

  it('gives ability score improvements on the 2024 levels', () => {
    const expected: Record<string, number[]> = {
      fighter: [4, 6, 8, 12, 14, 16],
      rogue: [4, 8, 10, 12, 16],
    }

    for (const entry of classes.entries) {
      const state = createCharacter(dnd5e2024)
      state.level = 20
      state.selections[stepKey('class')] = [entry.id]

      const levels = resolveCharacter(dnd5e2024, state)
        .choices.filter((c) => c.key.includes('/choice:asi-'))
        .map((c) => Number(c.key.split('asi-')[1]))

      expect([...new Set(levels)].sort((a, b) => a - b), entry.id).toEqual(expected[entry.id] ?? [4, 8, 12, 16])
    }
  })

  it('gives weapon mastery to exactly the five classes that have it, in the right amounts', () => {
    const expected: Record<string, Record<number, number>> = {
      barbarian: { 1: 2 },
      fighter: { 1: 3, 4: 4, 10: 5, 16: 6 },
      paladin: { 1: 2 },
      ranger: { 1: 2 },
      rogue: { 1: 2 },
    }

    for (const entry of classes.entries) {
      const found: Record<number, number> = {}
      for (const { choice, level } of choicesOf(entry)) {
        if (!choice.id.startsWith('mastery-')) continue
        found[level] = choice.count ?? 1
      }
      expect(found, entry.name).toEqual(expected[entry.id] ?? {})
    }
  })

  it('offers a mastery for every weapon that has one, and describes the property', () => {
    const weapons = equipment.entries.filter((entry) => (entry.tags ?? []).includes('weapon'))
    const withMastery = weapons.filter((entry) => entry.meta?.['Mastery'])
    expect(withMastery.length, 'weapons carrying a mastery property').toBeGreaterThan(30)
    expect(masteries.entries.length).toBe(withMastery.length)

    for (const entry of masteries.entries) {
      const property = String(entry.meta?.['Mastery'])
      expect(Object.keys(MASTERY_PROPERTIES), `${entry.name}: "${property}"`).toContain(property)
      expect(entry.summary).toContain(MASTERY_PROPERTIES[property]!)
    }
  })

  it('leaves the 5.1 equipment list free of mastery properties', () => {
    // The two editions share this data at runtime. If 5.2 mutated it in place
    // instead of copying, longswords would sprout a Sap property in 2014.
    for (const entry of findCollection(dnd5e, 'equipment')!.entries) {
      expect(entry.meta?.['Mastery'], `5.1 ${entry.name}`).toBeUndefined()
    }
  })

  it('lets paladins and rangers cast from 1st level', () => {
    for (const id of ['paladin', 'ranger']) {
      const state = createCharacter(dnd5e2024)
      state.selections[stepKey('class')] = [id]
      const source = deriveCharacter(dnd5e2024, state).spellcasting[0]
      expect(source, `${id} at level 1`).toBeDefined()
      expect(source!.slots?.[0], `${id} 1st-level slots`).toBe(2)
    }
  })

  it('has every caster prepare rather than know', () => {
    for (const entry of classes.entries) {
      for (const effect of effectsOf(entry)) {
        if (effect.type !== 'spellcasting') continue
        expect(effect.preparation, `${entry.name} still uses "spells known"`).toBe('prepared')
      }
    }
  })
})

describe('the numbers a player will check first', () => {
  it('adds a background’s increases on top of the assigned scores', () => {
    const state = createCharacter(dnd5e2024)
    state.baseAbilityScores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
    state.selections[stepKey('background')] = ['soldier']
    // Soldier offers STR, DEX and CON. Take +2 STR and +1 CON.
    state.selections['step:background#soldier/choice:ability-increase'] = ['str2-con1']

    const scores = deriveCharacter(dnd5e2024, state).abilityScores
    expect(scores['str']).toBe(17)
    expect(scores['con']).toBe(14)
    expect(scores['dex']).toBe(14)
  })

  it('works out hit points for a plain 5th-level fighter', () => {
    const state = createCharacter(dnd5e2024)
    state.level = 5
    state.baseAbilityScores = { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 }
    state.selections[stepKey('class')] = ['fighter']

    // d10 at first level, then the fixed average of 6, plus +2 CON each level.
    expect(deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'hp')!.value).toBe(44)
  })

  it('reads Armor Class from what is actually worn', () => {
    const state = createCharacter(dnd5e2024)
    state.baseAbilityScores = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }
    state.selections[stepKey('class')] = ['fighter']

    const unarmoured = deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'ac')!.value
    expect(unarmoured).toBe(12)

    state.inventory = [{ name: 'Chain mail', quantity: 1 }, { name: 'Shield', quantity: 1 }]
    state.equipped = ['Chain mail', 'Shield']
    // Chain mail is a flat 16 and ignores Dexterity; a shield adds 2.
    expect(deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'ac')!.value).toBe(18)
  })

  it('shows the rogue’s sneak attack and the monk’s die as dice, not bare numbers', () => {
    const rogue = createCharacter(dnd5e2024)
    rogue.level = 9
    rogue.selections[stepKey('class')] = ['rogue']
    expect(deriveCharacter(dnd5e2024, rogue).derived.find((s) => s.id === 'sneak-attack')!.display).toBe('5d6')

    const monk = createCharacter(dnd5e2024)
    monk.level = 12
    monk.selections[stepKey('class')] = ['monk']
    expect(deriveCharacter(dnd5e2024, monk).derived.find((s) => s.id === 'martial-arts')!.display).toBe('d10')
  })

  it('never prints a sentinel in place of a resource value', () => {
    for (const entry of classes.entries) {
      for (const level of [1, 20]) {
        const state = createCharacter(dnd5e2024)
        state.level = level
        state.selections[stepKey('class')] = [entry.id]
        for (const resource of deriveCharacter(dnd5e2024, state).resources) {
          expect(resource.value, `${entry.id} L${level}: ${resource.name}`).toBeGreaterThanOrEqual(0)
          expect(resource.value, `${entry.id} L${level}: ${resource.name}`).toBeLessThan(200)
        }
      }
    }
  })

  it('keeps every species’ speed in a believable range', () => {
    for (const entry of species.entries) {
      const state = createCharacter(dnd5e2024)
      state.selections[stepKey('species')] = [entry.id]
      const speed = deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'speed')!.value
      expect(speed, entry.name).toBeGreaterThanOrEqual(25)
      expect(speed, entry.name).toBeLessThanOrEqual(40)
    }
  })
})

describe('the two editions stay distinct', () => {
  it('does not share a ruleset id, so saved characters cannot cross over', () => {
    expect(dnd5e2024.id).not.toBe(dnd5e.id)
    expect(createCharacter(dnd5e2024).rulesetId).toBe(dnd5e2024.id)
  })

  it('names its own licence, since SRD 5.2 is a separate document', () => {
    expect(dnd5e2024.license.notice).toContain('5.2')
    expect(dnd5e.license.notice).toContain('5.1')
  })

  it('asks for a species where 5.1 asks for a race', () => {
    expect(dnd5e2024.steps.map((step) => step.id)).toContain('species')
    expect(dnd5e.steps.map((step) => step.id)).toContain('race')
  })
})
