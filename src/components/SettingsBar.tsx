import { useState } from 'react'

import { useApp } from '../state/store'

/**
 * Display preferences.
 *
 * Accessible tabletop tools consistently ask for the same three things:
 * larger text that does not break the layout, a more legible typeface, and a
 * high-contrast mode. All three persist across characters and sessions.
 */
export function SettingsBar() {
  // Deliberately `useApp`: this renders in the top bar before a game has been
  // chosen, so it must not require one.
  const { settings, updateSettings } = useApp()
  const [open, setOpen] = useState(false)

  return (
    <div className="settings">
      <button
        type="button"
        className="settings-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="display-settings"
      >
        <span aria-hidden="true">🅰</span> Display
      </button>

      {open && (
        <div className="settings-panel" id="display-settings">
          <div className="settings-row">
            <span id="text-size-label">Text size</span>
            <div className="settings-scale" role="group" aria-labelledby="text-size-label">
              {[
                { value: 1, label: 'Normal' },
                { value: 1.15, label: 'Large' },
                { value: 1.3, label: 'Larger' },
                { value: 1.5, label: 'Largest' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={settings.textScale === option.value ? 'is-selected' : ''}
                  onClick={() => updateSettings({ textScale: option.value })}
                  aria-pressed={settings.textScale === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.readableFont}
              onChange={(event) => updateSettings({ readableFont: event.target.checked })}
            />
            <span>
              Readable typeface
              <em>Wider letterforms and looser spacing, which many dyslexic readers find easier.</em>
            </span>
          </label>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(event) => updateSettings({ highContrast: event.target.checked })}
            />
            <span>
              High contrast
              <em>Stronger borders and text, with decorative colour removed.</em>
            </span>
          </label>
        </div>
      )}
    </div>
  )
}
