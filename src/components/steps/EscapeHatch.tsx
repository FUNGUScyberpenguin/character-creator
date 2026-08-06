import { useState } from 'react'

import type { CustomFeature } from '../../engine/character'
import { useStore } from '../../state/store'
import { Callout, Field } from '../common'

/**
 * The way out when the rules-as-data cannot express your character.
 *
 * The loudest, most repeated complaint about every existing character builder
 * is some version of "the tool will not let me build a legal character" —
 * missing options, a subclass that swaps a granted spell, a DM ruling. Rather
 * than chase every case, this lets you state the answer directly and records
 * that you did, so nobody mistakes a deliberate house rule for a bug.
 */
export function EscapeHatch() {
  const {
    ruleset,
    character,
    derived,
    setOverride,
    setCustomFeatures,
    setCustomProficiencies,
  } = useStore()

  const overridden = derived.derived.filter((stat) => stat.override)

  return (
    <div className="stack">
      <Callout tone="info">
        Everything here overrides the rules on purpose. Values you change are marked with an asterisk on your sheet, so
        your DM can see what was deliberate.
      </Callout>

      <section>
        <h2 className="section-title">Override a number</h2>
        <p className="section-hint">
          For house rules, magic items, and anything the ruleset has no way to know about. Leave a note so future-you
          remembers why.
        </p>

        <ul className="override-list">
          {derived.derived.map((stat) => {
            const override = character.overrides[stat.id]
            return (
              <li key={stat.id} className={override ? 'is-overridden' : ''}>
                <span className="override-label">{stat.label}</span>
                <input
                  type="number"
                  aria-label={`${stat.label} value`}
                  value={override ? override.value : stat.value}
                  onChange={(event) =>
                    setOverride(stat.id, { value: Number(event.target.value), note: override?.note })
                  }
                />
                <input
                  type="text"
                  aria-label={`Reason for changing ${stat.label}`}
                  placeholder="Why?"
                  value={override?.note ?? ''}
                  disabled={!override}
                  onChange={(event) =>
                    setOverride(stat.id, { value: override?.value ?? stat.value, note: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="link"
                  disabled={!override}
                  onClick={() => setOverride(stat.id, null)}
                >
                  Reset
                </button>
              </li>
            )
          })}
        </ul>

        {overridden.length > 0 && (
          <p className="section-hint">
            {overridden.length} value{overridden.length === 1 ? '' : 's'} currently overridden.
          </p>
        )}
      </section>

      <CustomFeatures features={character.customFeatures} onChange={setCustomFeatures} timings={ruleset.actionTimings ?? []} />

      <CustomProficiencies
        values={character.customProficiencies}
        categories={ruleset.proficiencyCategories.map((c) => ({ id: c.id, label: c.label }))}
        onChange={setCustomProficiencies}
      />
    </div>
  )
}

function CustomFeatures({
  features,
  onChange,
  timings,
}: {
  features: CustomFeature[]
  onChange: (features: CustomFeature[]) => void
  timings: { id: string; label: string }[]
}) {
  const [draft, setDraft] = useState<CustomFeature>({ name: '', description: '' })

  return (
    <section>
      <h2 className="section-title">Add a feature</h2>
      <p className="section-hint">
        Anything the ruleset does not include — a feat from a book we do not ship, a boon from your DM, a homebrew
        subclass ability. Give it a timing and it appears in your “on your turn” list.
      </p>

      {features.length > 0 && (
        <ul className="custom-list">
          {features.map((feature, index) => (
            <li key={`${feature.name}-${index}`}>
              <div>
                <strong>{feature.name}</strong>
                {feature.action && <span className="custom-timing">{timings.find((t) => t.id === feature.action)?.label ?? feature.action}</span>}
                <p>{feature.description}</p>
              </div>
              <button type="button" className="link" onClick={() => onChange(features.filter((_, i) => i !== index))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="custom-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft.name.trim()) return
          onChange([...features, { ...draft, name: draft.name.trim() }])
          setDraft({ name: '', description: '' })
        }}
      >
        <Field label="Name">
          <input type="text" value={draft.name} placeholder="Blessing of the Raven Queen" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="What it does">
          <textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </Field>
        <Field label="When you use it">
          <select value={draft.action ?? ''} onChange={(e) => setDraft({ ...draft, action: e.target.value || undefined })}>
            <option value="">Not an action</option>
            {timings.map((timing) => (
              <option key={timing.id} value={timing.id}>
                {timing.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Uses">
          <input type="text" value={draft.uses ?? ''} placeholder="1/long rest" onChange={(e) => setDraft({ ...draft, uses: e.target.value || undefined })} />
        </Field>
        <button type="submit" className="button">
          Add feature
        </button>
      </form>
    </section>
  )
}

function CustomProficiencies({
  values,
  categories,
  onChange,
}: {
  values: { category: string; value: string }[]
  categories: { id: string; label: string }[]
  onChange: (values: { category: string; value: string }[]) => void
}) {
  const [category, setCategory] = useState(categories[0]?.id ?? '')
  const [value, setValue] = useState('')

  return (
    <section>
      <h2 className="section-title">Add a proficiency</h2>
      <p className="section-hint">A language, a tool, a weapon — anything you have that the wizard never offered you.</p>

      {values.length > 0 && (
        <ul className="chips chips-large">
          {values.map((item, index) => (
            <li key={`${item.category}-${item.value}-${index}`} className="chip">
              <span className="chip-key">{categories.find((c) => c.id === item.category)?.label ?? item.category}</span>
              <span className="chip-value">{item.value}</span>
              <button
                type="button"
                aria-label={`Remove ${item.value}`}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault()
          if (!value.trim()) return
          onChange([...values, { category, value: value.trim() }])
          setValue('')
        }}
      >
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Proficiency type">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input type="text" value={value} placeholder="Thieves' cant, Draconic, Siege weapons…" onChange={(e) => setValue(e.target.value)} />
        <button type="submit" className="button">
          Add
        </button>
      </form>
    </section>
  )
}
