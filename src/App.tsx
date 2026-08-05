import { StepRail } from './components/StepRail'
import { SummaryPanel } from './components/SummaryPanel'
import { Wizard } from './components/Wizard'
import { StoreProvider } from './state/store'

export default function App() {
  return (
    <StoreProvider>
      <div className="app">
        <header className="topbar">
          <a className="brand" href="./">
            <span className="brand-mark" aria-hidden="true">
              🎲
            </span>
            <span>
              <strong>Character Creator</strong>
              <em>Build a character, get a PDF</em>
            </span>
          </a>
          <a
            className="topbar-link"
            href="https://github.com/FUNGUScyberpenguin/character-creator"
            target="_blank"
            rel="noreferrer noopener"
          >
            Source on GitHub
          </a>
        </header>

        <main className="layout">
          <StepRail />
          <Wizard />
          <SummaryPanel />
        </main>
      </div>
    </StoreProvider>
  )
}
