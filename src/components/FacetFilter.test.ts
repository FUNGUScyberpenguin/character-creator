import { describe, expect, it } from 'vitest'

import { selectEntries } from './FacetFilter'
import { dnd5e } from '../rulesets/dnd5e'
import type { Facet } from '../engine/types'

const classes = dnd5e.collections.find((c) => c.id === 'classes')!
const facets = classes.facets ?? []

/** Every combination of one option per facet, plus every single option alone. */
function combinations(list: Facet[]): Record<string, string[]>[] {
  const out: Record<string, string[]>[] = []
  for (const facet of list) {
    for (const option of facet.options) out.push({ [facet.id]: [option.value] })
  }
  const build = (index: number, current: Record<string, string[]>) => {
    if (index === list.length) {
      out.push({ ...current })
      return
    }
    for (const option of list[index]!.options) {
      build(index + 1, { ...current, [list[index]!.id]: [option.value] })
    }
  }
  build(0, {})
  return out
}

describe('guided picking never dead-ends', () => {
  it('always shows at least one option, for every filter combination', () => {
    const all = combinations(facets)
    expect(all.length).toBeGreaterThan(15)

    for (const active of all) {
      const { shown } = selectEntries(classes.entries, active, () => false)
      expect(shown.length, `no classes for ${JSON.stringify(active)}`).toBeGreaterThan(0)
    }
  })

  it('flags a fallback rather than pretending it was an exact match', () => {
    // 5e has no simple healer, so this combination has to fall back.
    const { shown, exact } = selectEntries(
      classes.entries,
      { role: ['role-support'], complexity: ['complexity-low'] },
      () => false,
    )
    expect(exact).toBe(false)
    expect(shown.length).toBeGreaterThan(0)
  })

  it('reports an exact match when one exists', () => {
    const { shown, exact } = selectEntries(
      classes.entries,
      { role: ['role-magic'], complexity: ['complexity-high'] },
      () => false,
    )
    expect(exact).toBe(true)
    expect(shown.map((e) => e.id)).toContain('wizard')
  })

  it('never hides a class you have already chosen', () => {
    const { shown } = selectEntries(
      classes.entries,
      { role: ['role-magic'] },
      (entry) => entry.id === 'barbarian',
    )
    expect(shown.map((e) => e.id)).toContain('barbarian')
  })

  it('shows everything when no filter is active', () => {
    const { shown, exact } = selectEntries(classes.entries, {}, () => false)
    expect(shown).toHaveLength(classes.entries.length)
    expect(exact).toBe(true)
  })
})
