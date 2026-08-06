import type { Collection, Entry } from '../../engine/types'
import { equipment as srd51Equipment } from '../dnd5e/equipment'

/**
 * The 2024 equipment list.
 *
 * The gear itself is unchanged between SRD 5.1 and 5.2 — a longsword is still
 * 15 gp and 1d8 slashing — so rather than retype 120 entries this module takes
 * the 5.1 list and stamps each weapon with its **mastery property**, which is
 * new in 2024.
 *
 * Everything is copied rather than mutated in place. Two rulesets share this
 * data at runtime, and 5.1 must not start showing mastery properties it does
 * not have.
 */

/** Mastery property by weapon id. Weapons absent from this table have none. */
const MASTERY: Record<string, string> = {
  club: 'Slow',
  dagger: 'Nick',
  greatclub: 'Push',
  handaxe: 'Vex',
  javelin: 'Slow',
  'light-hammer': 'Nick',
  mace: 'Sap',
  quarterstaff: 'Topple',
  sickle: 'Nick',
  spear: 'Sap',
  dart: 'Vex',
  'light-crossbow': 'Slow',
  shortbow: 'Vex',
  sling: 'Slow',
  battleaxe: 'Topple',
  flail: 'Sap',
  glaive: 'Graze',
  greataxe: 'Cleave',
  greatsword: 'Graze',
  halberd: 'Cleave',
  lance: 'Topple',
  longsword: 'Sap',
  maul: 'Topple',
  morningstar: 'Sap',
  pike: 'Push',
  rapier: 'Vex',
  scimitar: 'Nick',
  shortsword: 'Vex',
  trident: 'Topple',
  'war-pick': 'Sap',
  warhammer: 'Push',
  whip: 'Slow',
  blowgun: 'Vex',
  'hand-crossbow': 'Vex',
  'heavy-crossbow': 'Push',
  longbow: 'Slow',
}

/** What each mastery property does, in one line. */
export const MASTERY_PROPERTIES: Record<string, string> = {
  Cleave:
    'On a hit against a creature, make one more attack against a second creature within 5 feet of the first, without your ability modifier on the damage. Once per turn.',
  Graze: 'On a miss, the target still takes damage equal to your ability modifier for the attack.',
  Nick: 'The extra attack from the Light property comes as part of the Attack action, not as a Bonus Action. Once per turn.',
  Push: 'On a hit, you can push the target up to 10 feet straight away from you if it is Large or smaller.',
  Sap: 'On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.',
  Slow: 'On a hit, the target’s Speed drops by 10 feet until the start of your next turn. Once per turn.',
  Topple: 'On a hit, the target makes a Constitution saving throw against your attack DC or falls Prone.',
  Vex: 'On a hit, you have Advantage on your next attack roll against that target before the end of your next turn.',
}

export const equipment: Collection = {
  ...srd51Equipment,
  entries: srd51Equipment.entries.map((entry): Entry => {
    const mastery = MASTERY[entry.id]
    if (!mastery) return entry
    return { ...entry, meta: { ...entry.meta, Mastery: mastery } }
  }),
}

/**
 * Weapon Mastery, as a collection so it can be picked like anything else.
 *
 * A mastery choice grants nothing mechanical the engine tracks — it changes how
 * one weapon behaves in the player's hands — so each entry is a note that lands
 * on the sheet next to the weapon it applies to.
 */
export const masteries: Collection = {
  id: 'masteries',
  label: 'Weapon Masteries',
  singular: 'Weapon',
  entries: equipment.entries
    .filter((entry) => MASTERY[entry.id])
    .map((entry): Entry => {
      const property = MASTERY[entry.id]!
      return {
        id: entry.id,
        name: entry.name,
        summary: `${property} — ${MASTERY_PROPERTIES[property]}`,
        meta: { Mastery: property, Damage: String(entry.meta?.['Damage'] ?? '') },
        tags: entry.tags ?? [],
        effects: [{ type: 'note', text: `Weapon Mastery — ${entry.name} (${property}): ${MASTERY_PROPERTIES[property]}` }],
      }
    }),
}
