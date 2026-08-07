import type { Ruleset } from '../engine/types'
import { dnd5e } from './dnd5e'
import { dnd5e2024 } from './dnd5e-2024'
import { embers } from './embers'

/**
 * The registry of available rulesets.
 *
 * Adding a system means writing a data module and adding it to this array —
 * no changes to the engine, the wizard, or the PDF exporter. See
 * docs/RULESET_FORMAT.md.
 *
 * Order is the order of the picker. The two D&D editions come first because
 * they are what most people arrive looking for; Embers is last because it is
 * the worked example rather than a game anyone is running.
 */
export const rulesets: Ruleset[] = [dnd5e2024, dnd5e, embers]

export const defaultRuleset = dnd5e2024

export function getRuleset(id: string): Ruleset | undefined {
  return rulesets.find((ruleset) => ruleset.id === id)
}
