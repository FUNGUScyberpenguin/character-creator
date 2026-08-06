import { describe, expect, it } from 'vitest'

import { createCharacter, stepKey } from '../engine/character'
import { deriveCharacter } from '../engine/derive'
import { findCollection, optionsForChoice } from '../engine/resolve'
import type { Choice, Entry, Ruleset } from '../engine/types'
import { rulesets } from './index'

/**
 * Invariants every ruleset must satisfy, run against all of them.
 *
 * The 5e-specific checks live alongside that ruleset; these are the ones that
 * hold for any system, and they are what a new ruleset gets for free the moment
 * it is registered.
 */

function everyChoice(ruleset: Ruleset): { choice: Choice; where: string }[] {
  const out: { choice: Choice; where: string }[] = []
  const walk = (choices: Choice[] | undefined, where: string) => {
    for (const choice of choices ?? []) {
      out.push({ choice, where })
      if (choice.source.kind === 'options') {
        for (const option of choice.source.options) walk(option.choices, `${where} > ${choice.id}:${option.id}`)
      }
    }
  }
  for (const collection of ruleset.collections) {
    for (const entry of collection.entries) {
      walk(entry.choices, `${collection.id}/${entry.id}`)
      for (const grant of entry.levels ?? []) walk(grant.choices, `${collection.id}/${entry.id}@L${grant.level}`)
    }
  }
  return out
}

function everyEffect(ruleset: Ruleset): NonNullable<Entry['effects']> {
  const out: NonNullable<Entry['effects']> = []
  for (const collection of ruleset.collections) {
    for (const entry of collection.entries) {
      out.push(...(entry.effects ?? []))
      for (const grant of entry.levels ?? []) out.push(...(grant.effects ?? []))
      for (const { choice } of everyChoice(ruleset)) {
        if (choice.source.kind === 'options') {
          for (const option of choice.source.options) out.push(...(option.effects ?? []))
        }
      }
    }
  }
  return out
}

/** Every `stat.x` name a formula reads. */
function statsRead(ruleset: Ruleset): Set<string> {
  const names = new Set<string>()
  const scan = (formula?: string) => {
    for (const match of (formula ?? '').matchAll(/stat\.([A-Za-z0-9_]+)/g)) names.add(match[1]!)
  }
  for (const stat of ruleset.derived) {
    scan(stat.formula)
    scan(stat.format)
  }
  scan(ruleset.spellcastingFormulas?.saveDC)
  scan(ruleset.spellcastingFormulas?.attackBonus)
  scan(ruleset.weapons?.attackFormula)
  scan(ruleset.weapons?.damageBonusFormula)
  return names
}

describe.each(rulesets.map((ruleset) => [ruleset.name, ruleset] as const))('%s', (_name, ruleset) => {
  it('has unique ids within every collection', () => {
    for (const collection of ruleset.collections) {
      const ids = collection.entries.map((entry) => entry.id)
      expect(new Set(ids).size, `duplicate id in ${collection.id}`).toBe(ids.length)
    }
    const collectionIds = ruleset.collections.map((c) => c.id)
    expect(new Set(collectionIds).size).toBe(collectionIds.length)
  })

  it('points every step at a collection that exists', () => {
    for (const step of ruleset.steps) {
      if (!('collection' in step)) continue
      expect(findCollection(ruleset, step.collection), `step "${step.id}"`).toBeDefined()
    }
    const stepIds = ruleset.steps.map((step) => step.id)
    expect(new Set(stepIds).size).toBe(stepIds.length)
  })

  it('resolves every reference a choice makes', () => {
    const skills = new Set(ruleset.skills.map((s) => s.id))
    const abilities = new Set(ruleset.abilities.map((a) => a.id))
    const categories = new Set(ruleset.proficiencyCategories.map((c) => c.id))

    for (const { choice, where } of everyChoice(ruleset)) {
      const source = choice.source
      if (source.kind === 'skills') {
        for (const id of source.from ?? []) expect(skills.has(id), `${where}: skill "${id}"`).toBe(true)
      }
      if (source.kind === 'abilities') {
        for (const id of source.from ?? []) expect(abilities.has(id), `${where}: ability "${id}"`).toBe(true)
      }
      if (source.kind === 'proficiencies') expect(categories.has(source.category), `${where}`).toBe(true)
      if (source.kind === 'collection') {
        const options = optionsForChoice(ruleset, choice, ruleset.maxLevel)
        expect(options.length, `${where}/${choice.id} offers nothing`).toBeGreaterThanOrEqual(choice.count ?? 1)
      }
    }
  })

  it('only grants proficiencies in categories it declares', () => {
    const categories = new Set(ruleset.proficiencyCategories.map((c) => c.id))
    const skills = new Set(ruleset.skills.map((s) => s.id))
    for (const effect of everyEffect(ruleset)) {
      if (effect.type !== 'proficiency') continue
      expect(categories.has(effect.category), `category "${effect.category}"`).toBe(true)
      if (effect.category === 'skill') expect(skills.has(effect.value), `skill "${effect.value}"`).toBe(true)
    }
  })

  it('provides a starting value for every stat its formulas read', () => {
    // A formula reading an unset stat silently yields 0, which looks like a
    // working sheet with a wrong number on it. Either seed it in `baseStats` or
    // have something set it.
    //
    // These three are written by the engine from worn equipment, so a ruleset
    // may read them without declaring them anywhere.
    const engineProvided = new Set(['armorAC', 'shieldBonus', 'wearingArmor'])
    const seeded = new Set([...Object.keys(ruleset.baseStats ?? {}), ...engineProvided])
    const written = new Set<string>()
    for (const effect of everyEffect(ruleset)) {
      if (effect.type === 'set' || effect.type === 'bonus') written.add(effect.stat)
    }
    for (const name of statsRead(ruleset)) {
      expect(seeded.has(name) || written.has(name), `nothing ever sets "stat.${name}"`).toBe(true)
    }
  })

  it('gives its ability-score methods the right shape', () => {
    for (const method of ruleset.abilityMethods) {
      if (method.kind !== 'array') continue
      expect(method.array?.length, `"${method.name}" must have one number per ability`).toBe(ruleset.abilities.length)
    }
    expect(ruleset.abilityMethods.length).toBeGreaterThan(0)
  })

  it('produces finite numbers for a character with nothing chosen', () => {
    const derived = deriveCharacter(ruleset, createCharacter(ruleset))
    for (const stat of derived.derived) {
      expect(Number.isFinite(stat.value), `${stat.id}`).toBe(true)
      expect(stat.display.length, `${stat.id} has no display value`).toBeGreaterThan(0)
    }
  })

  it('produces finite numbers for every single pick, at first and last level', () => {
    for (const step of ruleset.steps) {
      if (step.kind !== 'pick') continue
      const collection = findCollection(ruleset, step.collection)!

      for (const entry of collection.entries) {
        for (const level of [1, ruleset.maxLevel]) {
          const state = createCharacter(ruleset)
          state.level = level
          state.selections[stepKey(step.id)] = [entry.id]

          const derived = deriveCharacter(ruleset, state)
          for (const stat of derived.derived) {
            expect(Number.isFinite(stat.value), `${entry.name} at level ${level}: ${stat.id}`).toBe(true)
          }
          for (const resource of derived.resources) {
            expect(Number.isFinite(resource.value), `${entry.name}: ${resource.name}`).toBe(true)
          }
        }
      }
    }
  })

  it('offers enough spells to fill any quota it sets', () => {
    const step = ruleset.steps.find((candidate) => candidate.kind === 'spells')
    if (!step || !('collection' in step)) return

    const spells = findCollection(ruleset, step.collection)!
    expect(spells.entries.length).toBeGreaterThan(0)

    for (const pickStep of ruleset.steps) {
      if (pickStep.kind !== 'pick') continue
      for (const entry of findCollection(ruleset, pickStep.collection)!.entries) {
        const state = createCharacter(ruleset)
        state.level = ruleset.maxLevel
        state.selections[stepKey(pickStep.id)] = [entry.id]

        for (const source of deriveCharacter(ruleset, state).spellcasting) {
          const available = spells.entries.filter((spell) => (spell.tags ?? []).includes(source.list))
          expect(available.length, `${entry.name}: list "${source.list}" is empty`).toBeGreaterThan(0)
          const atLevelZero = available.filter((spell) => Number(spell.meta?.['level'] ?? 0) === 0).length
          if (source.cantripsKnown) {
            expect(atLevelZero, `${entry.name} needs ${source.cantripsKnown}`).toBeGreaterThanOrEqual(source.cantripsKnown)
          }
        }
      }
    }
  })

  it('reproduces its licence notice, which the exported sheet carries', () => {
    expect(ruleset.license.name.length).toBeGreaterThan(0)
    expect(ruleset.license.notice.length).toBeGreaterThan(20)
    expect(ruleset.summary.length).toBeGreaterThan(40)
  })
})

describe('the registry', () => {
  it('gives every ruleset a unique id', () => {
    const ids = rulesets.map((ruleset) => ruleset.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('offers more than one system, so the picker is a real choice', () => {
    expect(rulesets.length).toBeGreaterThan(1)
  })

  it('keeps characters from different systems apart', () => {
    const [first, second] = rulesets
    const character = createCharacter(first!)
    expect(character.rulesetId).toBe(first!.id)
    expect(createCharacter(second!).rulesetId).toBe(second!.id)
  })
})
