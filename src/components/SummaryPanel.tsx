import { useState } from 'react'

import { describeCharacter } from '../engine/derive'
import { downloadCharacterSheet } from '../pdf/characterSheet'
import { useStore } from '../state/store'

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

/**
 * The always-visible summary. Its job is to make every choice feel consequential:
 * pick a race and watch the ability scores move, pick a class and watch hit
 * points appear.
 */
export function SummaryPanel() {
  const { ruleset, character, derived } = useStore()
  const [busy, setBusy] = useState(false)

  const descriptors = describeCharacter(derived)

  return (
    <aside className="summary">
      <div className="summary-identity">
        <h2>{character.name || 'Your character'}</h2>
        <p>{descriptors.length ? descriptors.join(' · ') : 'Nothing chosen yet'}</p>
      </div>

      <div className="summary-tiles">
        {derived.derived
          .filter((stat) => stat.slot === 'primary')
          .map((stat) => (
            <div key={stat.id} className="tile" title={stat.description}>
              <span className="tile-label">{stat.label}</span>
              <span className="tile-value">{stat.display}</span>
            </div>
          ))}
      </div>

      <ul className="summary-abilities">
        {ruleset.abilities.map((ability) => (
          <li key={ability.id}>
            <span className="summary-abbr">{ability.abbr}</span>
            <span className="summary-score">{derived.abilityScores[ability.id]}</span>
            <span className="summary-mod">{signed(derived.abilityModifiers[ability.id] ?? 0)}</span>
          </li>
        ))}
      </ul>

      {derived.skills.some((skill) => skill.proficient) && (
        <div className="summary-block">
          <h3>Proficient skills</h3>
          <p>
            {derived.skills
              .filter((skill) => skill.proficient)
              .map((skill) => `${skill.name} ${signed(skill.modifier)}`)
              .join(', ')}
          </p>
        </div>
      )}

      {derived.features.length > 0 && (
        <div className="summary-block">
          <h3>
            Features <span className="summary-count">{derived.features.length}</span>
          </h3>
          <p>{derived.features.map((feature) => feature.name).join(', ')}</p>
        </div>
      )}

      <button
        type="button"
        className="button button-primary summary-export"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await downloadCharacterSheet(ruleset, derived)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Building…' : 'Download PDF'}
      </button>
    </aside>
  )
}
