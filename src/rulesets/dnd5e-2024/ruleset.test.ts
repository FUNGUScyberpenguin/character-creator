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
 * file asserts the things that make the edition what it is, and the per-level
 * numbers that are invisible until someone plays a character to 16th level and
 * finds their rage damage is wrong.
 *
 * **Every number below is transcribed from the class tables in SRD 5.2.** When
 * one of these fails, the document is right and the data is wrong.
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

/** Read a stat's value at each level 1–20, the way the sheet will. */
function statByLevel(classId: string, stat: string): number[] {
  return Array.from({ length: 20 }, (_, index) => {
    const state = createCharacter(dnd5e2024)
    state.level = index + 1
    state.selections[stepKey('class')] = [classId]
    return deriveCharacter(dnd5e2024, state).stats[stat] as number
  })
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
        const total = (option.effects ?? []).reduce((sum, effect) => sum + (effect.type === 'ability' ? effect.amount : 0), 0)
        expect(total, `${entry.name}/${option.id} spends ${total} points`).toBe(3)
      }
    }
  })

  it('publishes exactly what the SRD publishes, and no more', () => {
    // The Player's Handbook has sixteen backgrounds and a long feat list. The
    // SRD has four backgrounds, nine species and four Origin feats. Reproducing
    // the rest would be reproducing content this project has no licence for, so
    // the counts are pinned.
    expect(backgrounds.entries.map((entry) => entry.id).sort()).toEqual(['acolyte', 'criminal', 'sage', 'soldier'])
    expect(species.entries.map((entry) => entry.id).sort()).toEqual([
      'dragonborn',
      'dwarf',
      'elf',
      'gnome',
      'goliath',
      'halfling',
      'human',
      'orc',
      'tiefling',
    ])
    expect(feats.entries.filter((entry) => (entry.tags ?? []).includes('origin')).map((entry) => entry.id).sort()).toEqual([
      'alert',
      'magic-initiate',
      'savage-attacker',
      'skilled',
    ])
    expect(findCollection(dnd5e2024, 'fighting-styles')!.entries.map((entry) => entry.id).sort()).toEqual([
      'archery',
      'defense',
      'great-weapon',
      'two-weapon',
    ])
    expect(findCollection(dnd5e2024, 'epic-boons')!.entries.length).toBe(7)
    expect(findCollection(dnd5e2024, 'metamagic')!.entries.length).toBe(10)
    expect(findCollection(dnd5e2024, 'invocations')!.entries.length).toBe(28)
    expect(findCollection(dnd5e2024, 'subclasses')!.entries.length).toBe(12)
  })

  it('gives every background an origin feat drawn from the ones that exist', () => {
    const originFeats = new Set(feats.entries.filter((f) => (f.tags ?? []).includes('origin')).map((f) => f.name))

    for (const entry of backgrounds.entries) {
      const choice = (entry.choices ?? []).find((candidate) => candidate.id === 'feat')
      expect(choice, `${entry.name} has no origin feat`).toBeDefined()
      expect(choice!.source).toEqual({ kind: 'collection', collection: 'feats', tag: 'origin' })

      // The card advertises the feat the SRD assigns, so that name has to be real.
      expect(originFeats.has(String(entry.meta?.['Feat'])), `${entry.name} advertises "${entry.meta?.['Feat']}"`).toBe(true)
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

  it('gives weapon mastery to exactly the five classes that have it, and grows it where it grows', () => {
    // Only the barbarian and the fighter gain more masteries with level; the
    // paladin, ranger and rogue keep two for twenty levels.
    const expected: Record<string, Record<number, number>> = {
      barbarian: { 1: 2, 4: 3, 10: 4 },
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

  it('leaves the 5.1 equipment list alone', () => {
    // The two editions share this data at runtime. If 5.2 mutated it in place
    // instead of copying, longswords would sprout a Sap property in 2014 and
    // the 2014 trident would silently become a d8.
    for (const entry of findCollection(dnd5e, 'equipment')!.entries) {
      expect(entry.meta?.['Mastery'], `5.1 ${entry.name}`).toBeUndefined()
    }
    const trident51 = findCollection(dnd5e, 'equipment')!.entries.find((entry) => entry.id === 'trident')!
    expect(trident51.meta?.['Damage']).toBe('1d6 piercing')
  })

  it('carries the 2024 weapon table where it differs from 2014', () => {
    const find = (id: string) => equipment.entries.find((entry) => entry.id === id)!
    expect(find('trident').meta?.['Damage']).toBe('1d8 piercing')
    expect(find('war-pick').meta?.['Properties']).toBe('Versatile (1d10)')
    expect(find('warhammer').meta?.['Weight']).toBe('5 lb.')
    // The net is adventuring gear in 2024, not a weapon.
    expect(find('net').tags ?? []).not.toContain('weapon')
  })

  it('lets paladins and rangers cast from 1st level', () => {
    for (const id of ['paladin', 'ranger']) {
      const state = createCharacter(dnd5e2024)
      state.selections[stepKey('class')] = [id]
      const source = deriveCharacter(dnd5e2024, state).spellcasting[0]
      expect(source, `${id} at level 1`).toBeDefined()
      expect(source!.slots?.[0], `${id} level 1 slots`).toBe(2)
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

describe('the class tables, level by level', () => {
  it('matches the barbarian table', () => {
    expect(statByLevel('barbarian', 'rages')).toEqual([2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6])
    // Rage Damage reaches +4 at level 16, not 17.
    expect(statByLevel('barbarian', 'rageDamage')).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4])
  })

  it('matches the monk table', () => {
    // d8 from level 5, d10 from 11, d12 from 17.
    expect(statByLevel('monk', 'martialArts')).toEqual([6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12])
    // Unarmored Movement: +10 at 2, +15 at 6, +20 at 10, +25 at 14, +30 at 18.
    expect(statByLevel('monk', 'monkSpeed')).toEqual([0, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20, 20, 25, 25, 25, 25, 30, 30, 30])
  })

  it('matches the druid, cleric and paladin resource tables', () => {
    // Wild Shape: 2 at level 2, 3 at 6, 4 at 17.
    expect(statByLevel('druid', 'wildShape')).toEqual([0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4])
    expect(statByLevel('cleric', 'channelDivinity')).toEqual([0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4])
    expect(statByLevel('paladin', 'channelDivinity')).toEqual([0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
    expect(statByLevel('fighter', 'secondWind')).toEqual([2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4])
  })

  it('matches the ranger and rogue tables', () => {
    expect(statByLevel('ranger', 'favoredEnemy')).toEqual([2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6])
    expect(statByLevel('rogue', 'sneakAttack')).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10])
  })

  it('matches the prepared-spell tables', () => {
    // The sorcerer's is its own progression, not the half-caster one.
    expect(statByLevel('sorcerer', 'spellsPrepared')).toEqual([2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22])
    expect(statByLevel('wizard', 'spellsPrepared')).toEqual([4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22])
    expect(statByLevel('warlock', 'spellsPrepared')).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15])
    expect(statByLevel('ranger', 'spellsPrepared')).toEqual([2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15])
  })

  it('matches the warlock’s Pact Magic slots', () => {
    const table = dnd5e2024.spellSlotTables!['warlock']!
    // Slot count: 1, 2 from level 2, 3 from 11, 4 from 17.
    expect(table.map((row) => row.reduce((sum, n) => sum + n, 0))).toEqual([1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4])
    // Slot level: 1, 2 from level 3, 3 from 5, 4 from 7, 5 from 9 onwards.
    expect(table.map((row) => row.length)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5])
  })

  it('gives the warlock its invocations on the right levels', () => {
    const warlock = classes.entries.find((entry) => entry.id === 'warlock')!
    const found: Record<number, number> = {}
    for (const { choice, level } of choicesOf(warlock)) {
      if (choice.id.startsWith('invocations-')) found[level] = choice.count ?? 1
    }
    expect(found).toEqual({ 1: 1, 2: 3, 5: 5, 7: 6, 9: 7, 12: 8, 15: 9, 18: 10 })
  })

  it('gives the sorcerer Metamagic at 2, 10 and 17 — not at 7', () => {
    const sorcerer = classes.entries.find((entry) => entry.id === 'sorcerer')!
    const levels = choicesOf(sorcerer)
      .filter(({ choice }) => choice.id.startsWith('metamagic-'))
      .map(({ level }) => level)
    expect(levels.sort((a, b) => a - b)).toEqual([2, 10, 17])
  })

  it('gives the rogue Expertise at 1 and 6', () => {
    const rogue = classes.entries.find((entry) => entry.id === 'rogue')!
    const levels = choicesOf(rogue)
      .filter(({ choice }) => choice.id.startsWith('expertise-'))
      .map(({ level }) => level)
    expect(levels.sort((a, b) => a - b)).toEqual([1, 6])
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

  it('gives a draconic sorcerer one extra hit point per character level', () => {
    const state = createCharacter(dnd5e2024)
    state.level = 6
    state.baseAbilityScores = { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 }
    state.selections[stepKey('class')] = ['sorcerer']

    const plain = deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'hp')!.value
    state.selections['step:class#sorcerer/choice:subclass'] = ['draconic-sorcery']
    const draconic = deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'hp')!.value

    // "+3, then +1 per sorcerer level after 3rd" is +6 at character level 6.
    expect(draconic - plain).toBe(6)
  })

  it('reads Armor Class from what is actually worn', () => {
    const state = createCharacter(dnd5e2024)
    state.baseAbilityScores = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }
    state.selections[stepKey('class')] = ['fighter']

    expect(deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'ac')!.value).toBe(12)

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

  it('gives each species the speed the document gives it', () => {
    const expected: Record<string, number> = {
      dragonborn: 30,
      dwarf: 30,
      elf: 30,
      gnome: 30,
      goliath: 35,
      halfling: 30,
      human: 30,
      orc: 30,
      tiefling: 30,
    }

    for (const entry of species.entries) {
      const state = createCharacter(dnd5e2024)
      state.selections[stepKey('species')] = [entry.id]
      const speed = deriveCharacter(dnd5e2024, state).derived.find((s) => s.id === 'speed')!.value
      expect(speed, entry.name).toBe(expected[entry.id])
    }
  })

  it('gives dwarves and orcs 120 feet of darkvision, and halflings none', () => {
    const darkvision = (id: string) => {
      const state = createCharacter(dnd5e2024)
      state.selections[stepKey('species')] = [id]
      return deriveCharacter(dnd5e2024, state).stats['darkvision']
    }
    expect(darkvision('dwarf')).toBe(120)
    expect(darkvision('orc')).toBe(120)
    expect(darkvision('elf')).toBe(60)
    expect(darkvision('halfling')).toBe(0)
  })
})

describe('the spell list', () => {
  const spells = findCollection(dnd5e2024, 'spells')!
  const atLevel = (level: number) => spells.entries.filter((entry) => Number(entry.meta?.['level']) === level)
  const forClass = (id: string) => spells.entries.filter((entry) => (entry.tags ?? []).includes(id))

  it('has the number of spells the document has, at every level', () => {
    // Counted from the spell chapter of SRD 5.2. A parser change that silently
    // dropped or duplicated entries would show up here first.
    const expected = [27, 57, 57, 42, 34, 38, 31, 20, 17, 16]
    expect(spells.entries.length).toBe(339)
    expect(expected.map((_, level) => atLevel(level).length)).toEqual(expected)
  })

  it('gives every class the list the document gives it', () => {
    const expected: Record<string, number> = {
      bard: 130,
      cleric: 109,
      druid: 124,
      paladin: 38,
      ranger: 48,
      sorcerer: 140,
      warlock: 72,
      wizard: 218,
    }
    for (const [id, count] of Object.entries(expected)) {
      expect(forClass(id).length, `${id} spell list`).toBe(count)
    }
  })

  it('follows the spell entries where the document contradicts itself', () => {
    // SRD 5.2 states each class list twice, and disagrees with itself twice.
    // Both cases are pinned here so the resolution is a decision on the record
    // rather than an accident of whichever source was read last. See the note
    // at the top of `spells.ts`.
    const tags = (id: string) => findCollection(dnd5e2024, 'spells')!.entries.find((e) => e.id === id)!.tags ?? []

    // Named by its own entry for all three; listed in none of their tables.
    expect(tags('phantasmal-force')).toEqual(expect.arrayContaining(['bard', 'sorcerer', 'wizard']))
    // Named by its own entry for all three; missing from the sorcerer's table.
    expect(tags('mind-spike')).toEqual(expect.arrayContaining(['sorcerer', 'warlock', 'wizard']))
  })

  it('carries the spells that are new in 2024', () => {
    const ids = new Set(spells.entries.map((entry) => entry.id))
    for (const id of ['elementalism', 'sorcerous-burst', 'starry-wisp', 'true-strike']) {
      expect(ids.has(id), `${id} is missing`).toBe(true)
    }
    // True Strike exists in both editions but is a different spell: in 2024 it
    // is an attack you make with your weapon, not a buff on your next roll.
    const trueStrike = spells.entries.find((entry) => entry.id === 'true-strike')!
    expect(trueStrike.summary).toContain('attack')
    expect(trueStrike.meta?.['Range']).toBe('Self')
  })

  it('drops the wizards’ names from the spells that carried them', () => {
    // 2024 renamed the eponymous spells. Both names must not coexist, or a
    // player searching for one finds two entries for the same spell.
    const ids = new Set(spells.entries.map((entry) => entry.id))
    const renamed: [string, string][] = [
      ['tensers-floating-disk', 'floating-disk'],
      ['leomunds-tiny-hut', 'tiny-hut'],
      ['evards-black-tentacles', 'black-tentacles'],
      ['bigbys-hand', 'arcane-hand'],
      ['rarys-telepathic-bond', 'telepathic-bond'],
      ['nystuls-magic-aura', 'arcanists-magic-aura'],
    ]
    for (const [old, current] of renamed) {
      expect(ids.has(current), `${current} is missing`).toBe(true)
      expect(ids.has(old), `${old} should have been renamed`).toBe(false)
    }
  })

  it('fills in every field on every spell', () => {
    for (const entry of spells.entries) {
      for (const key of ['School', 'Casting Time', 'Range', 'Components', 'Duration']) {
        expect(String(entry.meta?.[key] ?? ''), `${entry.name}: ${key}`).not.toBe('')
      }
      expect((entry.summary ?? '').length, `${entry.name} has no description`).toBeGreaterThan(30)
      expect(entry.tags ?? [], `${entry.name} has no level tag`).toContain(`level-${entry.meta?.['level']}`)
      // Every spell belongs to at least one class list, or nothing can take it.
      const classes = (entry.tags ?? []).filter((tag) =>
        ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'].includes(tag),
      )
      expect(classes.length, `${entry.name} is on no class list`).toBeGreaterThan(0)
    }
  })

  it('is a different list from 5.1, not a copy of it', () => {
    const srd51 = findCollection(dnd5e, 'spells')!
    expect(spells).not.toBe(srd51)

    const ids51 = new Set(srd51.entries.map((entry) => entry.id))
    const ids52 = new Set(spells.entries.map((entry) => entry.id))
    const onlyIn52 = [...ids52].filter((id) => !ids51.has(id))
    const onlyIn51 = [...ids51].filter((id) => !ids52.has(id))
    expect(onlyIn52.length, '2024 adds spells 2014 does not have').toBeGreaterThan(5)
    expect(onlyIn51.length, '2024 drops spells 2014 had').toBeGreaterThan(5)

    // Acid Splash moved school between editions, which is the cheapest proof
    // that these are two transcriptions rather than one shared object.
    expect(srd51.entries.find((entry) => entry.id === 'acid-splash')!.meta?.['School']).toBe('Conjuration')
    expect(spells.entries.find((entry) => entry.id === 'acid-splash')!.meta?.['School']).toBe('Evocation')
  })

  it('offers every caster enough spells to fill its level 1 quota', () => {
    for (const entry of classes.entries) {
      const state = createCharacter(dnd5e2024)
      state.baseAbilityScores = { str: 10, dex: 10, con: 10, int: 16, wis: 16, cha: 16 }
      state.selections[stepKey('class')] = [entry.id]

      for (const source of deriveCharacter(dnd5e2024, state).spellcasting) {
        const list = forClass(source.list)
        const cantrips = list.filter((spell) => Number(spell.meta?.['level']) === 0).length
        const firstLevel = list.filter((spell) => Number(spell.meta?.['level']) === 1).length

        expect(cantrips, `${entry.id} cantrips`).toBeGreaterThanOrEqual(source.cantripsKnown ?? 0)
        expect(firstLevel, `${entry.id} prepared spells`).toBeGreaterThanOrEqual(source.spellsKnown ?? 0)
      }
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
