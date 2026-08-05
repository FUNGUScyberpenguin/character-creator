import { stepKey } from '../../engine/character'
import { findCollection } from '../../engine/resolve'
import type { Step } from '../../engine/types'
import { useStore } from '../../state/store'
import { ChoiceList } from '../ChoiceList'
import { Callout, Field, OptionCard } from '../common'

export function IntroStep({ step }: { step: Extract<Step, { kind: 'intro' }> }) {
  const { ruleset, character, update } = useStore()

  return (
    <div className="stack">
      {step.body.map((paragraph) => (
        <p key={paragraph} className="prose">
          {paragraph}
        </p>
      ))}

      <div className="field-row">
        <Field label="Character name" hint="You can change this at any point.">
          <input
            type="text"
            value={character.name}
            placeholder="Thora Ironvein"
            onChange={(event) => update({ name: event.target.value })}
          />
        </Field>
        <Field label="Your name" hint="Optional — printed on the sheet for your DM.">
          <input
            type="text"
            value={character.playerName}
            placeholder="Sam"
            onChange={(event) => update({ playerName: event.target.value })}
          />
        </Field>
      </div>

      <Callout tone="info">
        <strong>{ruleset.name}.</strong> {ruleset.summary}
      </Callout>
    </div>
  )
}

export function LevelStep() {
  const { ruleset, character, update, derived } = useStore()
  const levels = Array.from({ length: ruleset.maxLevel }, (_, index) => index + 1)

  return (
    <div className="stack">
      <div className="level-grid">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            className={`level-button${character.level === level ? ' is-selected' : ''}`}
            onClick={() => update({ level })}
            aria-pressed={character.level === level}
          >
            {level}
          </button>
        ))}
      </div>

      <Callout tone="info">
        At level {character.level} your proficiency bonus is{' '}
        <strong>+{derived.proficiencyBonus}</strong>. Changing level later never loses your other choices — options that
        do not apply yet simply stay hidden until you reach them.
      </Callout>
    </div>
  )
}

export function PickStep({ step }: { step: Extract<Step, { kind: 'pick' }> }) {
  const { ruleset, character, derived, toggleSelection } = useStore()
  const collection = findCollection(ruleset, step.collection)
  if (!collection) return <p className="empty">This step points at a collection that does not exist.</p>

  const key = stepKey(step.id)
  const selected = character.selections[key] ?? []
  const count = step.count ?? 1
  const stepChoices = derived.resolution.choices.filter((choice) => choice.stepId === step.id)

  return (
    <div className="stack">
      <div className="grid grid-cards">
        {collection.entries.map((entry) => (
          <OptionCard
            key={entry.id}
            name={entry.name}
            summary={entry.summary}
            description={entry.description}
            icon={entry.icon}
            meta={entry.meta}
            selected={selected.includes(entry.id)}
            onSelect={() => toggleSelection(key, entry.id, count)}
          />
        ))}
      </div>

      {stepChoices.length > 0 && (
        <div className="follow-ups">
          <h2 className="section-title">Now decide</h2>
          <p className="section-hint">
            Your {collection.singular.toLowerCase()} opens up the choices below. They are part of this step.
          </p>
          <ChoiceList choices={stepChoices} />
        </div>
      )}
    </div>
  )
}

export function ChoicesStep() {
  const { derived } = useStore()
  const outstanding = derived.resolution.choices.filter((choice) => !choice.satisfied)
  const settled = derived.resolution.choices.filter((choice) => choice.satisfied)

  return (
    <div className="stack">
      {outstanding.length === 0 ? (
        <Callout tone="good">Nothing outstanding — every choice from your race, class, and background is made.</Callout>
      ) : (
        <ChoiceList choices={outstanding} />
      )}

      {settled.length > 0 && (
        <details className="disclosure">
          <summary>Review the {settled.length} choices you have already made</summary>
          <ChoiceList choices={settled} />
        </details>
      )}
    </div>
  )
}

export function IdentityStep({ step }: { step: Extract<Step, { kind: 'identity' }> }) {
  const { character, update, setIdentityField } = useStore()

  return (
    <div className="stack">
      <div className="field-row">
        <Field label="Character name">
          <input type="text" value={character.name} onChange={(event) => update({ name: event.target.value })} />
        </Field>
        <Field label="Player name">
          <input
            type="text"
            value={character.playerName}
            onChange={(event) => update({ playerName: event.target.value })}
          />
        </Field>
      </div>

      <div className="field-grid">
        {step.fields.map((field) => (
          <div key={field.id} className={field.kind === 'textarea' ? 'field-wide' : ''}>
            <Field label={field.label}>
              {field.kind === 'textarea' ? (
                <textarea
                  rows={3}
                  value={character.identity[field.id] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => setIdentityField(field.id, event.target.value)}
                />
              ) : field.kind === 'select' ? (
                <select
                  value={character.identity[field.id] ?? ''}
                  onChange={(event) => setIdentityField(field.id, event.target.value)}
                >
                  <option value="">—</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={character.identity[field.id] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => setIdentityField(field.id, event.target.value)}
                />
              )}
            </Field>
          </div>
        ))}
      </div>
    </div>
  )
}
