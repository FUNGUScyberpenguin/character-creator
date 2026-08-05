import { useMemo, useState } from 'react'

import { availableSpells } from '../../engine/derive'
import type { DerivedSpellcasting } from '../../engine/derive'
import type { Entry, Step } from '../../engine/types'
import { spellLevelLabel } from '../../rulesets/dnd5e/spells'
import { useStore } from '../../state/store'
import { Callout, Counter } from '../common'

/**
 * The spells step only appears to matter for casters — anyone else gets a short
 * explanation and a clear path onward.
 */
export function SpellsStep({ step }: { step: Extract<Step, { kind: 'spells' }> }) {
  const { derived } = useStore()

  if (!derived.spellcasting.length) {
    return (
      <Callout tone="good">
        Your character does not cast spells, so there is nothing to choose here. Carry on to the next step.
      </Callout>
    )
  }

  return (
    <div className="stack">
      {derived.spellcasting.map((source) => (
        <SpellSource key={source.id} source={source} collectionId={step.collection} />
      ))}
    </div>
  )
}

function SpellSource({ source, collectionId }: { source: DerivedSpellcasting; collectionId: string }) {
  const { ruleset, character, toggleSpell } = useStore()
  const [query, setQuery] = useState('')

  const spells = useMemo(() => availableSpells(ruleset, collectionId, source), [ruleset, collectionId, source])
  const chosen = character.spells[source.id] ?? []

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return spells
    return spells.filter(
      (spell) => spell.name.toLowerCase().includes(term) || (spell.summary ?? '').toLowerCase().includes(term),
    )
  }, [spells, query])

  const byLevel = useMemo(() => {
    const groups = new Map<number, Entry[]>()
    for (const spell of filtered) {
      const level = Number(spell.meta?.['level'] ?? 0)
      groups.set(level, [...(groups.get(level) ?? []), spell])
    }
    return [...groups.entries()].sort(([a], [b]) => a - b)
  }, [filtered])

  const cantripsChosen = chosen.filter((id) => levelOf(spells, id) === 0).length
  const leveledChosen = chosen.length - cantripsChosen

  return (
    <section className="spell-source">
      <header className="spell-header">
        <div>
          <h2 className="section-title">{source.label}</h2>
          <p className="section-hint">
            {source.preparation === 'prepared'
              ? 'You prepare these each day from your whole list — change them after any long rest.'
              : 'These are the spells you know. Swapping them normally requires levelling up.'}
          </p>
        </div>
        <dl className="spell-stats">
          <div>
            <dt>Save DC</dt>
            <dd>{source.saveDC ?? '—'}</dd>
          </div>
          <div>
            <dt>Attack</dt>
            <dd>{source.attackBonus !== undefined ? `+${source.attackBonus}` : '—'}</dd>
          </div>
          <div>
            <dt>Ability</dt>
            <dd>{source.abilityAbbr}</dd>
          </div>
        </dl>
      </header>

      {source.slots.length > 0 && (
        <ul className="slot-track">
          {source.slots.map((count, index) =>
            count > 0 ? (
              <li key={index}>
                <span className="slot-level">{spellLevelLabel(index + 1)}</span>
                <span className="slot-count">{count}</span>
              </li>
            ) : null,
          )}
        </ul>
      )}

      <div className="spell-counters">
        {source.cantripsKnown !== undefined && (
          <span className="spell-counter">
            Cantrips <Counter current={cantripsChosen} total={source.cantripsKnown} />
          </span>
        )}
        {source.spellsKnown !== undefined && (
          <span className="spell-counter">
            {source.preparation === 'prepared' ? 'Prepared' : 'Known'}{' '}
            <Counter current={leveledChosen} total={source.spellsKnown} />
          </span>
        )}
      </div>

      <input
        type="search"
        className="spell-search"
        value={query}
        placeholder={`Search ${spells.length} available spells…`}
        onChange={(event) => setQuery(event.target.value)}
      />

      {byLevel.map(([level, entries]) => (
        <div key={level} className="spell-group">
          <h3 className="spell-group-title">{spellLevelLabel(level)}</h3>
          <div className="grid grid-spells">
            {entries.map((spell) => {
              const selected = chosen.includes(spell.id)
              return (
                <button
                  key={spell.id}
                  type="button"
                  className={`spell${selected ? ' is-selected' : ''}`}
                  onClick={() => toggleSpell(source.id, spell.id)}
                  aria-pressed={selected}
                >
                  <span className="spell-name">{spell.name}</span>
                  <span className="spell-meta">
                    {spell.meta?.['School']} · {spell.meta?.['Casting Time']} · {spell.meta?.['Range']}
                  </span>
                  <span className="spell-text">{spell.summary}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}

function levelOf(spells: Entry[], id: string): number {
  return Number(spells.find((spell) => spell.id === id)?.meta?.['level'] ?? 0)
}
