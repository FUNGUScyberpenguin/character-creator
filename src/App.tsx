import { RulesetPicker } from './components/RulesetPicker'
import { SettingsBar } from './components/SettingsBar'
import { StepRail } from './components/StepRail'
import { SummaryPanel } from './components/SummaryPanel'
import { Wizard } from './components/Wizard'
import { StoreProvider, useApp } from './state/store'

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

/**
 * The picker gates the wizard: until a system is chosen there are no steps to
 * show, because the steps come from the system.
 */
function Shell() {
  const { ruleset } = useApp()

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="./">
          <span className="brand-mark" aria-hidden="true">
            🎲
          </span>
          <span>
            <strong>Character Creator</strong>
            <em>{ruleset ? ruleset.name : 'Build a character, get a PDF'}</em>
          </span>
        </a>
        <div className="topbar-actions">
          {ruleset && <SwitchGame />}
          <SettingsBar />
          <a
            className="topbar-link"
            href="https://github.com/FUNGUScyberpenguin/character-creator"
            target="_blank"
            rel="noreferrer noopener"
          >
            Source on GitHub
          </a>
        </div>
      </header>

      {ruleset ? (
        <main className="layout">
          <StepRail />
          <Wizard />
          <SummaryPanel />
        </main>
      ) : (
        <main className="layout layout-single">
          <RulesetPicker />
        </main>
      )}
    </div>
  )
}

function SwitchGame() {
  const { available, clearRuleset } = useApp()
  if (available.length < 2) return null

  return (
    <button type="button" className="topbar-link topbar-button" onClick={clearRuleset}>
      Change game
    </button>
  )
}
