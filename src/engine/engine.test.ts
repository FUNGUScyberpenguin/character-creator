import { describe, expect, it } from 'vitest'

import { dnd5e } from '../rulesets/dnd5e'
import { rollDice } from './abilities'
import { createCharacter, normalizeCharacter, stepKey, entryPath, choiceKey } from './character'
import { deriveCharacter } from './derive'
import { ExpressionError, evaluate } from './expression'
import { resolveCharacter } from './resolve'
import { validateCharacter } from './validation'

describe('expression evaluator', () => {
  it('respects operator precedence and parentheses', () => {
    expect(evaluate('2 + 3 * 4')).toBe(14)
    expect(evaluate('(2 + 3) * 4')).toBe(20)
    expect(evaluate('-3 + 10')).toBe(7)
  })

  it('computes ability modifiers the way the game does', () => {
    expect(evaluate('mod(dex)', { dex: 8 })).toBe(-1)
    expect(evaluate('mod(dex)', { dex: 10 })).toBe(0)
    expect(evaluate('mod(dex)', { dex: 11 })).toBe(0)
    expect(evaluate('mod(dex)', { dex: 20 })).toBe(5)
  })

  it('supports dotted identifiers, comparisons, and if()', () => {
    expect(evaluate('stat.speed + 5', { 'stat.speed': 25 })).toBe(30)
    expect(evaluate('if(level >= 5, 2, 1)', { level: 5 })).toBe(2)
    expect(evaluate('if(level >= 5, 2, 1)', { level: 4 })).toBe(1)
  })

  it('treats unknown identifiers as zero rather than throwing', () => {
    expect(evaluate('10 + stat.missing')).toBe(10)
  })

  it('rejects malformed input instead of evaluating it', () => {
    expect(() => evaluate('2 +')).toThrow(ExpressionError)
    expect(() => evaluate('nope(1)')).toThrow(ExpressionError)
    expect(() => evaluate('1 $ 2')).toThrow(ExpressionError)
  })

  it('cannot reach host globals', () => {
    // The parser has no member access or call syntax beyond its own function
    // table, so an identifier that looks dangerous is simply an unknown name.
    expect(evaluate('process')).toBe(0)
    expect(() => evaluate('constructor("return 1")')).toThrow(ExpressionError)
  })
})

describe('dice', () => {
  it('keeps the highest three of four dice', () => {
    const rolls = [0.99, 0.99, 0.99, 0.0] // 6, 6, 6, 1
    let index = 0
    const roll = rollDice('4d6kh3', () => rolls[index++] ?? 0)
    expect(roll.dice).toEqual([6, 6, 6, 1])
    expect(roll.total).toBe(18)
    expect(roll.dropped).toEqual([3])
  })
})

/** A level-1 hill dwarf fighter with the standard array. */
function dwarfFighter(level = 1) {
  const state = createCharacter(dnd5e)
  state.name = 'Thora'
  state.level = level
  state.baseAbilityScores = { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }
  state.selections[stepKey('race')] = ['dwarf']
  state.selections[choiceKey(entryPath(stepKey('race'), 'dwarf'), 'subrace')] = ['hill-dwarf']
  state.selections[stepKey('class')] = ['fighter']
  state.selections[stepKey('background')] = ['acolyte']
  return state
}

describe('character resolution', () => {
  it('collects effects from every picked entry', () => {
    const derived = deriveCharacter(dnd5e, dwarfFighter())

    // Dwarf gives +2 CON and Hill Dwarf +1 WIS.
    expect(derived.abilityScores['con']).toBe(16)
    expect(derived.abilityScores['wis']).toBe(13)
    expect(derived.abilityScores['str']).toBe(15)

    expect(derived.proficiencies['save']?.map((p) => p.value).sort()).toEqual(['con', 'str'])
    // Acolyte grants Insight and Religion.
    expect(derived.proficiencies['skill']?.map((p) => p.value)).toContain('religion')
  })

  it('computes hit points from the class hit die and Constitution', () => {
    // d10 + 3 (CON 16) + 1 (Dwarven Toughness) = 14
    expect(statOf(deriveCharacter(dnd5e, dwarfFighter(1)), 'hp')).toBe(14)
    // Level 3: 14 + 2 * (6 + 3 + 1) = 34
    expect(statOf(deriveCharacter(dnd5e, dwarfFighter(3)), 'hp')).toBe(34)
  })

  it('scales the proficiency bonus with level', () => {
    expect(deriveCharacter(dnd5e, dwarfFighter(1)).proficiencyBonus).toBe(2)
    expect(deriveCharacter(dnd5e, dwarfFighter(4)).proficiencyBonus).toBe(2)
    expect(deriveCharacter(dnd5e, dwarfFighter(5)).proficiencyBonus).toBe(3)
    expect(deriveCharacter(dnd5e, dwarfFighter(20)).proficiencyBonus).toBe(6)
  })

  it('applies proficiency to skills only where it was granted', () => {
    const derived = deriveCharacter(dnd5e, dwarfFighter())
    const religion = derived.skills.find((skill) => skill.id === 'religion')!
    const arcana = derived.skills.find((skill) => skill.id === 'arcana')!

    // INT 8 gives -1; Religion adds the +2 proficiency bonus on top.
    expect(arcana.modifier).toBe(-1)
    expect(religion.modifier).toBe(1)
    expect(religion.proficient).toBe(true)
  })

  it('only offers level-gated choices once the level is reached', () => {
    const belowFour = resolveCharacter(dnd5e, dwarfFighter(3))
    const atFour = resolveCharacter(dnd5e, dwarfFighter(4))

    const hasAsi = (keys: string[]) => keys.some((key) => key.includes('asi-4'))
    expect(hasAsi(belowFour.choices.map((choice) => choice.key))).toBe(false)
    expect(hasAsi(atFour.choices.map((choice) => choice.key))).toBe(true)
  })

  it('recurses into choices opened by a selected option', () => {
    const state = dwarfFighter(3)
    // Choosing the Champion archetype should surface its own level-10 choice
    // once the character is high enough level.
    const subclassKey = choiceKey(entryPath(stepKey('class'), 'fighter'), 'subclass')
    state.selections[subclassKey] = ['champion']
    state.level = 10

    const resolution = resolveCharacter(dnd5e, state)
    const keys = resolution.choices.map((choice) => choice.key)
    expect(keys.some((key) => key.includes('champion') && key.includes('second-style'))).toBe(true)
    expect(resolution.effects.some((entry) => entry.effect.type === 'feature' && entry.effect.name === 'Improved Critical')).toBe(true)
  })

  it('caps ability scores at the ruleset maximum', () => {
    const state = dwarfFighter(20)
    state.baseAbilityScores['con'] = 20
    expect(deriveCharacter(dnd5e, state).abilityScores['con']).toBe(20)
  })
})

describe('subraces', () => {
  it('requires a subrace for races that have them, and not for those that do not', () => {
    const withSubrace = createCharacter(dnd5e)
    withSubrace.selections[stepKey('race')] = ['dwarf']
    const dwarfChoices = resolveCharacter(dnd5e, withSubrace).choices.map((c) => c.key)
    expect(dwarfChoices.some((key) => key.endsWith('/choice:subrace'))).toBe(true)

    const withoutSubrace = createCharacter(dnd5e)
    withoutSubrace.selections[stepKey('race')] = ['human']
    const humanChoices = resolveCharacter(dnd5e, withoutSubrace).choices.map((c) => c.key)
    expect(humanChoices.some((key) => key.endsWith('/choice:subrace'))).toBe(false)
  })

  it('applies only the chosen subrace, and swapping it swaps the traits', () => {
    const state = createCharacter(dnd5e)
    state.baseAbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    state.selections[stepKey('race')] = ['dwarf']
    state.selections[stepKey('class')] = ['fighter']
    const key = choiceKey(entryPath(stepKey('race'), 'dwarf'), 'subrace')

    state.selections[key] = ['hill-dwarf']
    const hill = deriveCharacter(dnd5e, state)
    expect(hill.abilityScores['wis']).toBe(11)
    expect(hill.abilityScores['str']).toBe(10)
    expect(hill.features.some((f) => f.name === 'Dwarven Toughness')).toBe(true)

    state.selections[key] = ['ironvein-dwarf']
    const ironvein = deriveCharacter(dnd5e, state)
    expect(ironvein.abilityScores['wis']).toBe(10)
    expect(ironvein.abilityScores['str']).toBe(11)
    expect(ironvein.features.some((f) => f.name === 'Dwarven Toughness')).toBe(false)

    // Base-race traits survive either way.
    expect(ironvein.abilityScores['con']).toBe(12)
    expect(ironvein.features.some((f) => f.name === 'Dwarven Resilience')).toBe(true)
  })

  it('offers each subrace only to its own race', () => {
    const subraces = dnd5e.collections.find((c) => c.id === 'subraces')!
    const raceIds = new Set(dnd5e.collections.find((c) => c.id === 'races')!.entries.map((e) => e.id))
    for (const entry of subraces.entries) {
      const parents = (entry.tags ?? []).filter((tag) => raceIds.has(tag))
      expect(parents.length, `${entry.name} should name exactly one parent race`).toBe(1)
    }
  })
})

describe('spellcasting', () => {
  it('gives a level-1 wizard the right slots and prepared count', () => {
    const state = createCharacter(dnd5e)
    state.name = 'Ilra'
    state.baseAbilityScores = { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }
    state.selections[stepKey('class')] = ['wizard']
    state.selections[stepKey('race')] = ['elf']
    state.selections[choiceKey(entryPath(stepKey('race'), 'elf'), 'subrace')] = ['high-elf'] // +1 INT, for 16 total

    const derived = deriveCharacter(dnd5e, state)
    const wizard = derived.spellcasting.find((source) => source.id === 'wizard')!

    expect(wizard.slots).toEqual([2])
    expect(wizard.maxSpellLevel).toBe(1)
    expect(wizard.cantripsKnown).toBe(3)
    expect(wizard.spellsKnown).toBe(4) // INT 16 -> +3, plus level 1
    expect(wizard.saveDC).toBe(13) // 8 + 2 prof + 3 INT
    expect(wizard.attackBonus).toBe(5)
  })

  it('gives warlocks a single high slot level rather than a full table', () => {
    const state = createCharacter(dnd5e)
    state.level = 5
    state.selections[stepKey('class')] = ['warlock']

    const warlock = deriveCharacter(dnd5e, state).spellcasting[0]!
    expect(warlock.slots).toEqual([0, 0, 2])
    expect(warlock.maxSpellLevel).toBe(3)
  })

  it('does not make a fighter a spellcaster', () => {
    expect(deriveCharacter(dnd5e, dwarfFighter()).spellcasting).toHaveLength(0)
  })
})

describe('validation', () => {
  it('blocks a step whose choices are unresolved', () => {
    const state = dwarfFighter()
    const validation = validateCharacter(dnd5e, state, deriveCharacter(dnd5e, state))

    // The fighter still owes a fighting style and two skills.
    expect(validation.steps['class']?.blocking).toBe(true)
    expect(validation.complete).toBe(false)
  })

  it('passes once every outstanding choice is made', () => {
    const state = dwarfFighter()
    const classPath = entryPath(stepKey('class'), 'fighter')
    const racePath = entryPath(stepKey('race'), 'dwarf')

    state.selections[choiceKey(classPath, 'skills')] = ['athletics', 'perception']
    state.selections[choiceKey(classPath, 'fighting-style')] = ['defense']
    state.selections[choiceKey(classPath, 'equipment-armor')] = ['chain']
    state.selections[choiceKey(classPath, 'equipment-weapon')] = ['martial-shield']
    state.selections[choiceKey(racePath, 'tools')] = ["Smith's tools"]
    state.selections[choiceKey(racePath, 'subrace')] = ['hill-dwarf']
    state.selections[choiceKey(entryPath(stepKey('background'), 'acolyte'), 'languages')] = ['Dwarvish', 'Elvish']

    const validation = validateCharacter(dnd5e, state, deriveCharacter(dnd5e, state))
    expect(validation.blockingSteps).toEqual([])
    expect(validation.complete).toBe(true)
  })

  it('reflects a Fighting Style choice in Armor Class', () => {
    const state = dwarfFighter()
    state.selections[choiceKey(entryPath(stepKey('class'), 'fighter'), 'fighting-style')] = ['defense']

    // DEX 13 (+1), base 10, +1 from the Defense style.
    expect(statOf(deriveCharacter(dnd5e, state), 'ac')).toBe(12)
  })

  it('uses Unarmored Defense for a barbarian', () => {
    const state = createCharacter(dnd5e)
    state.baseAbilityScores = { str: 15, dex: 14, con: 15, int: 8, wis: 12, cha: 10 }
    state.selections[stepKey('class')] = ['barbarian']

    // 10 + 2 (DEX 14) + 2 (CON 15) = 14
    expect(statOf(deriveCharacter(dnd5e, state), 'ac')).toBe(14)
  })
})

describe('persistence', () => {
  it('repairs partial or hand-edited saves', () => {
    const restored = normalizeCharacter(
      { name: 'Half Finished', level: 99, selections: { 'step:race': ['human'], bad: 'nope' }, junk: true },
      dnd5e,
    )

    expect(restored.name).toBe('Half Finished')
    expect(restored.level).toBe(20) // clamped to the ruleset maximum
    expect(restored.selections['step:race']).toEqual(['human'])
    expect(restored.selections['bad']).toBeUndefined()
    expect(restored.baseAbilityScores['str']).toBe(10)
  })

  it('ignores selections that no longer exist in the ruleset', () => {
    const state = dwarfFighter()
    state.selections[choiceKey(entryPath(stepKey('class'), 'fighter'), 'fighting-style')] = ['not-a-style']

    const resolution = resolveCharacter(dnd5e, state)
    const style = resolution.choices.find((choice) => choice.key.includes('fighting-style'))!
    expect(style.selected).toEqual([])
    expect(style.satisfied).toBe(false)
  })
})

describe('ruleset integrity', () => {
  it('has unique ids within every collection', () => {
    for (const collection of dnd5e.collections) {
      const ids = collection.entries.map((entry) => entry.id)
      expect(new Set(ids).size, `duplicate id in ${collection.id}`).toBe(ids.length)
    }
  })

  it('points every step at a collection that exists', () => {
    for (const step of dnd5e.steps) {
      if (!('collection' in step)) continue
      expect(dnd5e.collections.some((collection) => collection.id === step.collection)).toBe(true)
    }
  })

  it('evaluates every derived formula without throwing', () => {
    const derived = deriveCharacter(dnd5e, dwarfFighter())
    for (const stat of derived.derived) {
      expect(Number.isFinite(stat.value), `${stat.id} was not a number`).toBe(true)
    }
  })

  it('gives every class a full 1-20 progression that resolves', () => {
    for (const entry of dnd5e.collections.find((c) => c.id === 'classes')!.entries) {
      for (const level of [1, 5, 11, 20]) {
        const state = createCharacter(dnd5e)
        state.level = level
        state.selections[stepKey('class')] = [entry.id]
        const derived = deriveCharacter(dnd5e, state)
        expect(statOf(derived, 'hp'), `${entry.id} at level ${level}`).toBeGreaterThan(0)
      }
    }
  })

  it('tags every spell with at least one class list', () => {
    const spells = dnd5e.collections.find((collection) => collection.id === 'spells')!
    const classNames = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard']
    for (const spell of spells.entries) {
      const lists = (spell.tags ?? []).filter((tag) => classNames.includes(tag))
      expect(lists.length, `${spell.name} belongs to no class list`).toBeGreaterThan(0)
    }
  })
})

function statOf(derived: ReturnType<typeof deriveCharacter>, id: string): number {
  return derived.derived.find((stat) => stat.id === id)?.value ?? Number.NaN
}

describe('attacks and the action economy', () => {
  /** A level-5 fighter carrying three very different weapons. */
  function armedFighter() {
    const state = createCharacter(dnd5e)
    state.level = 5
    state.baseAbilityScores = { str: 16, dex: 14, con: 14, int: 8, wis: 12, cha: 10 }
    state.selections[stepKey('class')] = ['fighter']
    state.inventory = [
      { name: 'Longsword', quantity: 1 },
      { name: 'Dagger', quantity: 1 },
      { name: 'Longbow', quantity: 1 },
      { name: 'Backpack', quantity: 1 },
    ]
    return state
  }

  it('uses the right ability for each weapon', () => {
    const attacks = deriveCharacter(dnd5e, armedFighter()).attacks

    // STR 16 (+3) + proficiency 3.
    expect(attacks.find((a) => a.name === 'Longsword')).toMatchObject({ abilityAbbr: 'STR', attackBonus: 6 })
    // Finesse takes the better of STR and DEX, which here is STR.
    expect(attacks.find((a) => a.name === 'Dagger')?.abilityAbbr).toBe('STR')
    // Ranged always uses DEX: 14 (+2) + 3.
    expect(attacks.find((a) => a.name === 'Longbow')).toMatchObject({ abilityAbbr: 'DEX', attackBonus: 5 })
  })

  it('takes DEX for a finesse weapon when DEX is the better score', () => {
    const state = armedFighter()
    state.baseAbilityScores = { ...state.baseAbilityScores, str: 10, dex: 18 }
    const dagger = deriveCharacter(dnd5e, state).attacks.find((a) => a.name === 'Dagger')!
    expect(dagger.abilityAbbr).toBe('DEX')
    expect(dagger.attackBonus).toBe(7) // +4 DEX, +3 proficiency
  })

  it('folds the ability bonus into the damage string', () => {
    const longsword = deriveCharacter(dnd5e, armedFighter()).attacks.find((a) => a.name === 'Longsword')!
    expect(longsword.damage).toBe('1d8 + 3 slashing')
  })

  it('ignores things that are not weapons', () => {
    expect(deriveCharacter(dnd5e, armedFighter()).attacks.some((a) => a.name === 'Backpack')).toBe(false)
  })

  it('marks a weapon you are not proficient with', () => {
    const state = createCharacter(dnd5e)
    state.selections[stepKey('class')] = ['wizard'] // no martial weapons
    state.inventory = [{ name: 'Greatsword', quantity: 1 }]
    expect(deriveCharacter(dnd5e, state).attacks[0]).toMatchObject({ name: 'Greatsword', proficient: false })
  })

  it('collects features into the timing they are used at', () => {
    const actions = deriveCharacter(dnd5e, armedFighter()).actions
    expect(actions.find((a) => a.name === 'Second Wind')?.timingLabel).toBe('Bonus action')
    expect(actions.find((a) => a.name === 'Action Surge')?.timingLabel).toBe('Action')
    // Ordered by the ruleset's declared timings, so actions come before bonuses.
    const timings = actions.map((a) => a.timing)
    expect(timings.indexOf('action')).toBeLessThan(timings.indexOf('bonus'))
  })
})

describe('escape hatch', () => {
  it('replaces a computed value and records the reason', () => {
    const state = createCharacter(dnd5e)
    state.selections[stepKey('class')] = ['fighter']
    const before = deriveCharacter(dnd5e, state).derived.find((s) => s.id === 'ac')!
    expect(before.override).toBeUndefined()

    state.overrides['ac'] = { value: 18, note: 'Plate armour' }
    const after = deriveCharacter(dnd5e, state).derived.find((s) => s.id === 'ac')!
    expect(after.value).toBe(18)
    expect(after.display).toBe('18')
    expect(after.override?.note).toBe('Plate armour')
  })

  it('adds custom features, including to the turn list', () => {
    const state = createCharacter(dnd5e)
    state.customFeatures = [{ name: 'Gift of the Raven', description: 'Reroll a death save.', action: 'reaction', uses: '1/long rest' }]

    const derived = deriveCharacter(dnd5e, state)
    expect(derived.features.some((f) => f.name === 'Gift of the Raven' && f.source === 'Custom')).toBe(true)
    expect(derived.actions.find((a) => a.name === 'Gift of the Raven')?.timingLabel).toBe('Reaction')
  })

  it('adds custom proficiencies alongside granted ones', () => {
    const state = createCharacter(dnd5e)
    state.selections[stepKey('class')] = ['fighter']
    state.customProficiencies = [{ category: 'language', value: 'Thieves’ cant' }]
    const languages = deriveCharacter(dnd5e, state).proficiencies['language'] ?? []
    expect(languages.map((l) => l.value)).toContain('Thieves’ cant')
  })

  it('survives a round trip through save and load', () => {
    const state = createCharacter(dnd5e)
    state.overrides['hp'] = { value: 99, note: 'DM ruling' }
    state.customFeatures = [{ name: 'Boon', description: 'Something.' }]
    state.customProficiencies = [{ category: 'tool', value: 'Siege engines' }]

    const restored = normalizeCharacter(JSON.parse(JSON.stringify(state)), dnd5e)
    expect(restored.overrides['hp']).toEqual({ value: 99, note: 'DM ruling' })
    expect(restored.customFeatures).toHaveLength(1)
    expect(restored.customProficiencies[0]?.value).toBe('Siege engines')
  })

  it('drops malformed overrides rather than crashing', () => {
    const restored = normalizeCharacter({ overrides: { ac: { value: 'nonsense' }, hp: { value: 12 } } }, dnd5e)
    expect(restored.overrides['ac']).toBeUndefined()
    expect(restored.overrides['hp']?.value).toBe(12)
  })
})

describe('guided picking', () => {
  it('tags every class against every facet so no filter strands the list', () => {
    const classes = dnd5e.collections.find((c) => c.id === 'classes')!
    for (const facet of classes.facets ?? []) {
      for (const entry of classes.entries) {
        const matches = (entry.tags ?? []).filter((tag) => facet.options.some((o) => o.value === tag))
        expect(matches.length, `${entry.name} has no "${facet.id}" tag`).toBeGreaterThan(0)
      }
      // Every option must lead somewhere, or the filter is a dead end.
      for (const option of facet.options) {
        const count = classes.entries.filter((e) => (e.tags ?? []).includes(option.value)).length
        expect(count, `"${option.label}" matches nothing`).toBeGreaterThan(0)
      }
    }
  })

  it('tells every class what a turn looks like', () => {
    const classes = dnd5e.collections.find((c) => c.id === 'classes')!
    for (const entry of classes.entries) {
      expect(entry.atTheTable?.length ?? 0, entry.name).toBeGreaterThan(20)
    }
  })
})
