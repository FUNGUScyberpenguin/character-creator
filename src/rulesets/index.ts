import type { Ruleset } from '../engine/types'
import { dnd5e } from './dnd5e'

/**
 * The registry of available rulesets.
 *
 * Adding a system means writing a data module and adding it to this array —
 * no changes to the engine, the wizard, or the PDF exporter. See
 * docs/RULESET_FORMAT.md.
 */
export const rulesets: Ruleset[] = [dnd5e]

export const defaultRuleset = dnd5e

export function getRuleset(id: string): Ruleset | undefined {
  return rulesets.find((ruleset) => ruleset.id === id)
}
