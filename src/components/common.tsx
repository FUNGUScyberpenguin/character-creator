import { useState } from 'react'
import type { ReactNode } from 'react'

/** Small key/value chips used on selection cards. */
export function MetaChips({ meta }: { meta?: Record<string, string | number> }) {
  if (!meta) return null
  const items = Object.entries(meta).filter(([key]) => key !== 'level')
  if (!items.length) return null

  return (
    <ul className="chips">
      {items.map(([key, value]) => (
        <li key={key} className="chip">
          <span className="chip-key">{key}</span>
          <span className="chip-value">{value}</span>
        </li>
      ))}
    </ul>
  )
}

interface OptionCardProps {
  name: string
  summary?: string
  description?: string
  icon?: string
  meta?: Record<string, string | number>
  selected: boolean
  /** Shown when the same option has been picked more than once. */
  count?: number
  onSelect: () => void
  compact?: boolean
}

/**
 * The workhorse of the wizard: a big, clickable card. Long descriptions are
 * collapsed behind a "more" toggle so a screen of twelve classes stays
 * scannable, but the detail is never more than one click away.
 */
export function OptionCard({
  name,
  summary,
  description,
  icon,
  meta,
  selected,
  count,
  onSelect,
  compact,
}: OptionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = !!description && description !== summary

  return (
    <div className={`card${selected ? ' is-selected' : ''}${compact ? ' is-compact' : ''}`}>
      <button type="button" className="card-main" onClick={onSelect} aria-pressed={selected}>
        {icon && (
          <span className="card-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="card-body">
          <span className="card-title">
            {name}
            {count && count > 1 ? <span className="card-count">x{count}</span> : null}
          </span>
          {summary && <span className="card-summary">{summary}</span>}
          <MetaChips meta={meta} />
        </span>
        <span className="card-check" aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      </button>

      {hasDetail && (
        <>
          <button type="button" className="card-more" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
            {expanded ? 'Less' : 'More'}
          </button>
          {expanded && <p className="card-detail">{description}</p>}
        </>
      )}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </label>
  )
}

export function Callout({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'good'; children: ReactNode }) {
  return <div className={`callout callout-${tone}`}>{children}</div>
}

/** "3 of 4 chosen" style progress text plus a bar. */
export function Counter({ current, total }: { current: number; total: number }) {
  const done = current >= total
  return (
    <span className={`counter${done ? ' is-done' : ''}`}>
      <span className="counter-bar" aria-hidden="true">
        <span className="counter-fill" style={{ width: `${Math.min(100, (current / Math.max(total, 1)) * 100)}%` }} />
      </span>
      <span className="counter-label">
        {current} of {total}
      </span>
    </span>
  )
}
