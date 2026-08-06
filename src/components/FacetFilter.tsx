import type { Entry, Facet } from '../engine/types'

/**
 * Narrows a long list by intent rather than by name.
 *
 * Twelve classes on one screen is where new players stall — the research is
 * consistent that the problem is being asked to evaluate every option before
 * you have played once. These chips let someone say what they want to *do* and
 * see three candidates instead of everything.
 */
export function FacetFilter({
  facets,
  active,
  onToggle,
  onClear,
  matched,
  total,
  exact,
}: {
  facets: Facet[]
  active: Record<string, string[]>
  onToggle: (facetId: string, value: string) => void
  onClear: () => void
  matched: number
  total: number
  /** False when nothing satisfied every filter and we fell back to near-misses. */
  exact: boolean
}) {
  const activeCount = Object.values(active).reduce((sum, values) => sum + values.length, 0)

  return (
    <section className="facets" aria-label="Narrow the options">
      {facets.map((facet) => (
        <fieldset key={facet.id} className="facet">
          <legend>{facet.label}</legend>
          <div className="facet-options">
            {facet.options.map((option) => {
              const selected = (active[facet.id] ?? []).includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`facet-chip${selected ? ' is-selected' : ''}`}
                  onClick={() => onToggle(facet.id, option.value)}
                  aria-pressed={selected}
                  title={option.description}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      <p className="facet-status" role="status">
        {activeCount === 0 ? (
          <>Showing all {total}. Not sure? Pick what appeals above and the list will shrink.</>
        ) : exact ? (
          <>
            Showing {matched} of {total}.{' '}
            <button type="button" className="link" onClick={onClear}>
              Show everything
            </button>
          </>
        ) : (
          <>
            <strong>Nothing does all of that.</strong> Here {matched === 1 ? 'is the closest option' : `are the ${matched} closest options`}.{' '}
            <button type="button" className="link" onClick={onClear}>
              Show everything
            </button>
          </>
        )}
      </p>
    </section>
  )
}

/** How many of the active facets this entry satisfies, and how many were asked. */
export function facetScore(entry: Entry, active: Record<string, string[]>): { matched: number; asked: number } {
  const tags = entry.tags ?? []
  const groups = Object.values(active).filter((values) => values.length > 0)
  return {
    matched: groups.filter((values) => values.some((value) => tags.includes(value))).length,
    asked: groups.length,
  }
}

/** An entry matches when it satisfies at least one selected value in every active facet. */
export function matchesFacets(entry: Entry, active: Record<string, string[]>): boolean {
  const { matched, asked } = facetScore(entry, active)
  return matched === asked
}

/**
 * What to show for a set of filters.
 *
 * Combining filters can easily describe a character the game does not offer —
 * "healing and helping" plus "keep it simple" has no answer in 5e. Returning an
 * empty list there would dead-end the player at exactly the moment the filters
 * were meant to help, so we fall back to the closest options and say so.
 */
export function selectEntries(
  entries: Entry[],
  active: Record<string, string[]>,
  keep: (entry: Entry) => boolean,
): { shown: Entry[]; exact: boolean } {
  const asked = Object.values(active).filter((values) => values.length > 0).length
  if (asked === 0) return { shown: entries, exact: true }

  const exact = entries.filter((entry) => keep(entry) || matchesFacets(entry, active))
  if (exact.length > 0) return { shown: exact, exact: true }

  const best = Math.max(...entries.map((entry) => facetScore(entry, active).matched))
  const closest = entries.filter((entry) => keep(entry) || facetScore(entry, active).matched === best)
  return { shown: closest, exact: false }
}
