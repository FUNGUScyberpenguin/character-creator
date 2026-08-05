import { describe, expect, it } from 'vitest'

import { choiceKey, createCharacter, entryPath, stepKey } from '../engine/character'
import { deriveCharacter } from '../engine/derive'
import { dnd5e } from '../rulesets/dnd5e'
import { renderCharacterSheet } from './characterSheet'

/** A fully specified level-5 elf wizard, complete with spells. */
function wizard() {
  const state = createCharacter(dnd5e)
  state.name = 'Ilra Duskwren'
  state.playerName = 'Sam'
  state.level = 5
  state.baseAbilityScores = { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }
  state.selections[stepKey('race')] = ['elf']
  state.selections[stepKey('class')] = ['wizard']
  state.selections[stepKey('background')] = ['cloister-scribe']
  state.selections[choiceKey(entryPath(stepKey('class'), 'wizard'), 'skills')] = ['arcana', 'investigation']
  state.selections[choiceKey(entryPath(stepKey('class'), 'wizard'), 'subclass')] = ['school-of-evocation']
  state.spells['wizard'] = ['fire-bolt', 'mage-hand', 'light', 'magic-missile', 'shield', 'fireball']
  state.identity = { alignment: 'Chaotic Good', backstory: 'Left the archive with a book she was not supposed to take.' }
  state.notes = 'Owes the scriptorium 400 gp.'
  return state
}

async function render(state: ReturnType<typeof wizard>) {
  return renderCharacterSheet(dnd5e, deriveCharacter(dnd5e, state))
}

describe('PDF export', () => {
  it('produces a valid, multi-page PDF', async () => {
    const bytes = await render(wizard())

    expect(bytes.byteLength).toBeGreaterThan(2000)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')

    const text = new TextDecoder('latin1').decode(bytes)
    expect(text).toContain('%%EOF')

    const { PDFDocument } = await import('pdf-lib')
    const parsed = await PDFDocument.load(bytes)
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(2)
    expect(parsed.getTitle()).toContain('Ilra Duskwren')
  })

  it('works for a blank character with nothing chosen', async () => {
    const bytes = await render(createCharacter(dnd5e))
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('renders every class at level 20 without throwing', async () => {
    const classes = dnd5e.collections.find((collection) => collection.id === 'classes')!

    for (const entry of classes.entries) {
      const state = createCharacter(dnd5e)
      state.name = `Test ${entry.name}`
      state.level = 20
      state.selections[stepKey('class')] = [entry.id]
      state.selections[stepKey('race')] = ['human']

      await expect(render(state), `${entry.name} failed to render`).resolves.toBeInstanceOf(Uint8Array)
    }
  }, 30_000)

  it('strips characters the standard PDF fonts cannot encode', async () => {
    const state = wizard()
    // Emoji and smart quotes reach the exporter from card icons and prose.
    state.name = '🎲 Ilra “The Ink” — Duskwren'
    const bytes = await render(state)

    const { PDFDocument } = await import('pdf-lib')
    const parsed = await PDFDocument.load(bytes)
    expect(parsed.getTitle()).toBe('Ilra "The Ink" - Duskwren - character sheet')
  })
})
