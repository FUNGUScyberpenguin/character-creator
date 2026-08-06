import { useRef, useState } from 'react'

import { describeCharacter } from '../../engine/derive'
import { downloadCharacterSheet, triggerDownload } from '../../pdf/characterSheet'
import { useStore } from '../../state/store'
import { Callout } from '../common'
import { EscapeHatch } from './EscapeHatch'

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

export function ReviewStep() {
  const { ruleset, character, derived, validation, goToStepId } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monochrome, setMonochrome] = useState(false)
  const [noteSpace, setNoteSpace] = useState(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const { loadFrom, reset } = useStore()

  const outstanding = ruleset.steps
    .map((step) => ({ step, status: validation.steps[step.id] }))
    .filter((item) => item.status && !item.status.complete)

  const downloadPdf = async () => {
    setBusy(true)
    setError(null)
    try {
      await downloadCharacterSheet(ruleset, derived, { monochrome, noteSpace })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The PDF could not be generated.')
    } finally {
      setBusy(false)
    }
  }

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' })
    triggerDownload(blob, `${(character.name || 'character').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`)
  }

  return (
    <div className="stack">
      <div className="export-bar">
        <button type="button" className="button button-primary" onClick={downloadPdf} disabled={busy}>
          {busy ? 'Building your sheet…' : 'Download PDF character sheet'}
        </button>
        <button type="button" className="button" onClick={downloadJson}>
          Save as JSON
        </button>
        <button type="button" className="button" onClick={() => fileInput.current?.click()}>
          Load a saved character
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            try {
              loadFrom(JSON.parse(await file.text()))
              setError(null)
            } catch {
              setError('That file could not be read as a saved character.')
            }
            event.target.value = ''
          }}
        />
      </div>

      <fieldset className="export-options">
        <legend>PDF options</legend>
        <label>
          <input type="checkbox" checked={monochrome} onChange={(e) => setMonochrome(e.target.checked)} />
          <span>
            Ink-friendly
            <em>Black and white, no filled panels. Kinder to a home printer.</em>
          </span>
        </label>
        <label>
          <input type="checkbox" checked={noteSpace} onChange={(e) => setNoteSpace(e.target.checked)} />
          <span>
            Room to write
            <em>Ruled space for hit points, treasure, and session notes.</em>
          </span>
        </label>
      </fieldset>

      {error && <Callout tone="warn">{error}</Callout>}

      {outstanding.length > 0 && (
        <Callout tone="warn">
          <p>
            <strong>Still unfinished.</strong> You can download the sheet anyway — these will simply be blank.
          </p>
          <ul className="issue-list">
            {outstanding.map(({ step, status }) => (
              <li key={step.id}>
                <button type="button" className="link" onClick={() => goToStepId(step.id)}>
                  {step.title}
                </button>
                : {status!.issues.join(' ')}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      <SheetPreview />

      <details className="disclosure disclosure-boxed">
        <summary>Something wrong, or missing? Override any number or add your own features</summary>
        <EscapeHatch />
      </details>

      <p className="fine-print">{ruleset.license.notice}</p>

      <button
        type="button"
        className="button button-danger"
        onClick={() => {
          if (confirm('Discard this character and start again? This cannot be undone.')) reset()
        }}
      >
        Start a new character
      </button>
    </div>
  )
}

/** A screen-friendly version of what the PDF will contain. */
export function SheetPreview() {
  const { ruleset, character, derived } = useStore()
  const descriptors = describeCharacter(derived)

  return (
    <article className="sheet">
      <header className="sheet-header">
        <h2>{character.name || 'Unnamed character'}</h2>
        <p>
          {[...(descriptors.length ? descriptors : [`Level ${derived.level}`]), character.identity['alignment']]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      <div className="sheet-tiles">
        {derived.derived
          .filter((stat) => stat.slot === 'primary')
          .map((stat) => (
            <div key={stat.id} className={`tile${stat.override ? ' is-overridden' : ''}`}>
              <span className="tile-label">{stat.label}</span>
              <span className="tile-value">
                {stat.display}
                {stat.override && <abbr title={stat.override.note || 'Set by hand'}>*</abbr>}
              </span>
            </div>
          ))}
      </div>

      <div className="sheet-columns">
        <section>
          <h3>Abilities</h3>
          <ul className="plain">
            {ruleset.abilities.map((ability) => (
              <li key={ability.id}>
                <span>{ability.name}</span>
                <strong>
                  {derived.abilityScores[ability.id]} ({signed(derived.abilityModifiers[ability.id] ?? 0)})
                </strong>
              </li>
            ))}
          </ul>

          <h3>Saving throws</h3>
          <ul className="plain">
            {derived.saves.map((save) => (
              <li key={save.ability} className={save.proficient ? 'is-proficient' : ''}>
                <span>{save.name}</span>
                <strong>{signed(save.modifier)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Skills</h3>
          <ul className="plain">
            {derived.skills.map((skill) => (
              <li key={skill.id} className={skill.proficient ? 'is-proficient' : ''}>
                <span>
                  {skill.name} <em>{skill.abilityAbbr}</em>
                </span>
                <strong>{signed(skill.modifier)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section>
          {derived.derived.filter((stat) => stat.slot === 'secondary').length > 0 && (
            <>
              <h3>Other numbers</h3>
              <ul className="plain">
                {derived.derived
                  .filter((stat) => stat.slot === 'secondary')
                  .map((stat) => (
                    <li key={stat.id}>
                      <span>{stat.label}</span>
                      <strong>{stat.display}</strong>
                    </li>
                  ))}
              </ul>
            </>
          )}

          {ruleset.proficiencyCategories
            .filter((category) => !category.usesAbilityModifier)
            .map((category) => {
              const held = derived.proficiencies[category.id] ?? []
              if (!held.length) return null
              return (
                <div key={category.id}>
                  <h3>{category.label}</h3>
                  <p className="prose-small">{held.map((item) => item.value).join(', ')}</p>
                </div>
              )
            })}

          {derived.inventory.length > 0 && (
            <>
              <h3>Equipment</h3>
              <p className="prose-small">
                {derived.inventory.map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name)).join(', ')}
              </p>
            </>
          )}
        </section>
      </div>

      {(derived.attacks.length > 0 || derived.actions.length > 0) && (
        <section className="turn">
          <h3>On your turn</h3>

          {derived.attacks.length > 0 && (
            <table className="attacks">
              <thead>
                <tr>
                  <th scope="col">Attack</th>
                  <th scope="col">To hit</th>
                  <th scope="col">Damage</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {derived.attacks.map((attack, index) => (
                  <tr key={`${attack.name}-${index}`}>
                    <td>{attack.name}</td>
                    <td>
                      {signed(attack.attackBonus)} <em>{attack.abilityAbbr}</em>
                    </td>
                    <td>{attack.damage}</td>
                    <td>{attack.proficient ? attack.properties ?? '' : 'Not proficient'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {Object.entries(
            derived.actions.reduce<Record<string, typeof derived.actions>>((groups, action) => {
              ;(groups[action.timingLabel] ??= []).push(action)
              return groups
            }, {}),
          ).map(([label, actions]) => (
            <div key={label} className="turn-group">
              <h4>{label}</h4>
              <ul className="turn-list">
                {actions.map((action, index) => (
                  <li key={`${action.name}-${index}`}>
                    <strong>{action.name}</strong>
                    {action.uses && <span className="turn-uses">{action.uses}</span>}
                    <span>{action.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {derived.features.length > 0 && (
        <section>
          <h3>Features &amp; traits</h3>
          <dl className="features">
            {derived.features.map((feature, index) => (
              <div key={`${feature.name}-${index}`}>
                <dt>
                  {feature.name} <span className="feature-source">{feature.source}</span>
                </dt>
                <dd>{feature.description}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {derived.spellcasting.map((source) => (
        <section key={source.id}>
          <h3>{source.label}</h3>
          <p className="prose-small">
            Save DC {source.saveDC} · Attack {signed(source.attackBonus ?? 0)} · {source.abilityAbbr}
          </p>
          {source.chosen.length > 0 ? (
            <p className="prose-small">{source.chosen.map((spell) => spell.name).join(', ')}</p>
          ) : (
            <p className="prose-small muted">No spells chosen yet.</p>
          )}
        </section>
      ))}
    </article>
  )
}
