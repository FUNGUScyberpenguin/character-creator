import { useApp } from '../state/store'

/**
 * The first question: which game are you playing?
 *
 * Everything downstream — the steps, the options within them, the numbers on
 * the sheet — comes from the answer. The wizard does not exist until this is
 * settled, which is why this sits in front of it rather than being step one.
 *
 * Work is kept per system, so trying another game and coming back finds your
 * half-built character exactly where you left it.
 */
export function RulesetPicker() {
  const { available, chooseRuleset } = useApp()

  return (
    <div className="picker">
      <header className="picker-header">
        <h1>Which game are you playing?</h1>
        <p>
          Pick the system your table uses. Every choice after this — classes, abilities, what goes on the sheet — comes
          from the rules of the game you choose.
        </p>
      </header>

      <ul className="picker-list">
        {available.map((ruleset) => (
          <li key={ruleset.id}>
            <button type="button" className="picker-card" onClick={() => chooseRuleset(ruleset.id)}>
              <span className="picker-name">
                {ruleset.name}
                {ruleset.kind === 'example' && <span className="picker-badge">Example system</span>}
              </span>
              <span className="picker-summary">{ruleset.summary}</span>
              <span className="picker-meta">
                <span>
                  Levels 1–{ruleset.maxLevel} · {ruleset.abilities.length} abilities · {countContent(ruleset)} options
                </span>
                <span className="picker-licence">{ruleset.license.name}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="picker-note">
        Playing something we do not list? The wizard is driven entirely by a data file, so adding a system means writing
        one module — no changes to the app itself. See{' '}
        <a href="https://github.com/FUNGUScyberpenguin/character-creator/blob/main/docs/RULESET_FORMAT.md" target="_blank" rel="noreferrer noopener">
          the ruleset format
        </a>
        .
      </p>
    </div>
  )
}

/** A rough size for the card — how much there is to choose between. */
function countContent(ruleset: { collections: { entries: unknown[] }[] }): number {
  return ruleset.collections.reduce((total, collection) => total + collection.entries.length, 0)
}
