import { useMemo, useState } from 'react'

import { findCollection } from '../../engine/resolve'
import type { Step } from '../../engine/types'
import { useStore } from '../../state/store'
import { Callout } from '../common'

/**
 * Your pack, and what you are actually wearing out of it.
 *
 * Armour and shields carry an equip toggle because carrying a breastplate and
 * wearing one are different things — only the second changes your Armor Class.
 * Everything else is a list; encumbrance is left to the table.
 */
export function EquipmentStep({ step }: { step: Extract<Step, { kind: 'equipment' }> }) {
  const { ruleset, character, derived, setInventory, toggleEquipped } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const collection = findCollection(ruleset, step.collection)
  const armorTag = ruleset.armor?.tag
  // Only things that change a number are worth an equip toggle; a bedroll is
  // either in your pack or it is not.
  const isWearable = (name: string) =>
    !!armorTag &&
    (collection?.entries.some(
      (entry) => entry.name.toLowerCase() === name.toLowerCase() && (entry.tags ?? []).includes(armorTag),
    ) ??
      false)
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
              const wearable = isWearable(item.name)
              const worn = character.equipped.some((value) => value.toLowerCase() === item.name.toLowerCase())
              return (
                <li key={item.name} className={`inventory-row${isGranted ? ' is-granted' : ''}${worn ? ' is-worn' : ''}`}>
                  <span className="inventory-name">{item.name}</span>
                  {wearable && (
                    <label className="inventory-worn">
                      <input type="checkbox" checked={worn} onChange={() => toggleEquipped(item.name)} />
                      <span>Worn</span>
                    </label>
                  )}
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

      {derived.armor.worn || derived.armor.shields.length > 0 ? (
        <Callout tone={derived.armor.warnings.length ? 'warn' : 'good'}>
          <p>
            <strong>
              Armor Class {derived.derived.find((stat) => stat.id === 'ac')?.display}
            </strong>{' '}
            —{' '}
            {[
              derived.armor.worn
                ? `${derived.armor.worn.name} (${derived.armor.worn.base}${
                    derived.armor.worn.dexApplied ? ` + ${derived.armor.worn.dexApplied} DEX` : ''
                  }${derived.armor.worn.dexMax === 0 ? ', no DEX bonus' : ''})`
                : 'no armor',
              ...derived.armor.shields.map((shield) => `${shield.name} (+${shield.bonus})`),
            ].join(', ')}
          </p>
          {derived.armor.warnings.length > 0 && (
            <ul className="issue-list">
              {derived.armor.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </Callout>
      ) : (
        <Callout tone="info">
          Tick <strong>Worn</strong> on a piece of armor or a shield and it will be counted in your Armor Class. Carrying
          it in your pack does nothing, which is the point.
        </Callout>
      )}
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
