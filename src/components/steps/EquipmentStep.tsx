import { useMemo, useState } from 'react'

import { findCollection } from '../../engine/resolve'
import type { Step } from '../../engine/types'
import { useStore } from '../../state/store'
import { Callout } from '../common'

/**
 * Equipment is deliberately a list rather than a simulation: the wizard shows
 * what your choices granted, and lets you add anything else. Tracking encumbrance
 * and equipped-armour AC is the kind of bookkeeping a character sheet is for.
 */
export function EquipmentStep({ step }: { step: Extract<Step, { kind: 'equipment' }> }) {
  const { ruleset, character, derived, setInventory } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const collection = findCollection(ruleset, step.collection)
  const granted = useMemo(() => {
    const fromChoices = new Set<string>()
    for (const { effect } of derived.resolution.effects) {
      if (effect.type === 'item') fromChoices.add(effect.item.toLowerCase())
    }
    return fromChoices
  }, [derived.resolution.effects])

  const categories = useMemo(() => {
    const tags = new Set<string>()
    for (const entry of collection?.entries ?? []) {
      for (const tag of entry.tags ?? []) tags.add(tag)
    }
    return ['all', ...[...tags].sort()]
  }, [collection])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (collection?.entries ?? [])
      .filter((entry) => (category === 'all' ? true : (entry.tags ?? []).includes(category)))
      .filter((entry) => (term ? entry.name.toLowerCase().includes(term) : true))
      .slice(0, 60)
  }, [collection, query, category])

  const addItem = (name: string) => {
    const existing = character.inventory.find((item) => item.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      setInventory(character.inventory.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setInventory([...character.inventory, { name, quantity: 1 }])
    }
  }

  const setQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setInventory(character.inventory.filter((_, i) => i !== index))
      return
    }
    setInventory(character.inventory.map((item, i) => (i === index ? { ...item, quantity } : item)))
  }

  return (
    <div className="stack">
      <section>
        <h2 className="section-title">Carried</h2>
        <p className="section-hint">
          Items in grey came from your class or background and update automatically if you change those choices.
        </p>

        {derived.inventory.length === 0 ? (
          <p className="empty">Nothing yet. Add something below.</p>
        ) : (
          <ul className="inventory">
            {derived.inventory.map((item) => {
              const manualIndex = character.inventory.findIndex(
                (candidate) => candidate.name.toLowerCase() === item.name.toLowerCase(),
              )
              const isGranted = granted.has(item.name.toLowerCase())
              return (
                <li key={item.name} className={`inventory-row${isGranted ? ' is-granted' : ''}`}>
                  <span className="inventory-name">{item.name}</span>
                  {manualIndex >= 0 ? (
                    <span className="inventory-controls">
                      <button type="button" onClick={() => setQuantity(manualIndex, character.inventory[manualIndex]!.quantity - 1)}>
                        −
                      </button>
                      <span className="inventory-quantity">{item.quantity}</span>
                      <button type="button" onClick={() => setQuantity(manualIndex, character.inventory[manualIndex]!.quantity + 1)}>
                        +
                      </button>
                    </span>
                  ) : (
                    <span className="inventory-quantity is-fixed">x{item.quantity}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Add equipment</h2>
        <div className="toolbar">
          <input
            type="search"
            value={query}
            placeholder="Search equipment…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'Everything' : value}
              </option>
            ))}
          </select>
        </div>

        <ul className="shop">
          {results.map((entry) => (
            <li key={entry.id}>
              <button type="button" className="shop-item" onClick={() => addItem(entry.name)}>
                <span className="shop-name">{entry.name}</span>
                {entry.summary && <span className="shop-summary">{entry.summary}</span>}
                {entry.meta?.['Cost'] && <span className="shop-cost">{entry.meta['Cost']}</span>}
                <span className="shop-add" aria-hidden="true">
                  +
                </span>
              </button>
            </li>
          ))}
        </ul>

        <AddCustom onAdd={addItem} />
      </section>

      <Callout tone="info">
        Armour is listed here rather than folded into your Armor Class, because what you are wearing changes from session
        to session. The AC shown on your sheet is your unarmoured value.
      </Callout>
    </div>
  )
}

function AddCustom({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <form
      className="toolbar"
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) return
        onAdd(value.trim())
        setValue('')
      }}
    >
      <input
        type="text"
        value={value}
        placeholder="Something not on the list — a family heirloom, a favour owed…"
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="button">
        Add
      </button>
    </form>
  )
}
