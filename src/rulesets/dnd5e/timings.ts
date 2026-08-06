import type { Collection } from '../../engine/types'

/**
 * When each feature is used.
 *
 * The single most common complaint DMs raise is players not knowing what their
 * character can actually do on a turn. Features carrying a timing are collected
 * into the sheet's "on your turn" section, so the answer is one glance away
 * instead of a search through a list of traits.
 *
 * Kept as a table rather than an argument on every `feature()` call: it is the
 * same information, far easier to scan for gaps, and it applies across classes,
 * subclasses, races and invocations in one pass.
 */
const TIMINGS: Record<string, string> = {
  // --- Actions ---
  'Action Surge': 'action',
  'Breath Weapon': 'action',
  'Channel Divinity': 'action',
  'Channel Divinity: Preserve Life': 'action',
  'Channel Divinity: Sacred Weapon': 'action',
  'Channel Divinity: Turn the Unholy': 'action',
  'Destroy Undead': 'action',
  'Divine Sense': 'action',
  'Divine Intervention': 'action',
  'Intimidating Presence': 'action',
  'Lay on Hands': 'action',
  'Wild Shape': 'action',
  'Wholeness of Body': 'action',
  'Stillness of Mind': 'action',
  'Empty Body': 'action',
  'Hide in Plain Sight': 'action',
  'Holy Nimbus': 'action',
  'Cleansing Touch': 'action',
  'Quivering Palm': 'action',
  'Dragon Wings': 'action',
  'Draconic Presence': 'action',
  'Hurl Through Hell': 'action',
  'Countercharm': 'action',

  // --- Bonus actions ---
  Rage: 'bonus',
  'Second Wind': 'bonus',
  'Bardic Inspiration': 'bonus',
  'Cunning Action': 'bonus',
  'Fast Hands': 'bonus',
  Vanish: 'bonus',
  'Martial Arts': 'bonus',
  'Divine Smite': 'bonus',

  // --- Reactions ---
  'Uncanny Dodge': 'reaction',
  'Deflect Missiles': 'reaction',
  Retaliation: 'reaction',
  'Cutting Words': 'reaction',
  'Fighting Style: Protection': 'reaction',
  'Giant Killer': 'reaction',
  Indomitable: 'reaction',
  'Dark One’s Own Luck': 'reaction',
  'Peerless Skill': 'reaction',

  // --- Things that happen without spending anything ---
  'Reckless Attack': 'free',
  'Sneak Attack': 'free',
  'Stunning Strike': 'free',
  'Extra Attack': 'free',
  'Colossus Slayer': 'free',
  'Horde Breaker': 'free',
  'Divine Strike': 'free',
  'Improved Divine Smite': 'free',
  'Savage Attacks': 'free',
  'Foe Slayer': 'free',
  'Empowered Evocation': 'free',
  'Stroke of Luck': 'free',
  'Dark One’s Blessing': 'free',
  'Elemental Affinity': 'free',
  'Arcane Recovery': 'free',
  'Natural Recovery': 'free',
  'Song of Rest': 'free',
  'Relentless Endurance': 'free',
  'Lucky': 'free',
  'Overchannel': 'free',
  'Superior Critical': 'free',
  'Improved Critical': 'free',
  'Brutal Critical': 'free',

  // --- Always on, but worth seeing next to the rest ---
  'Unarmored Defense': 'passive',
  Evasion: 'passive',
  'Danger Sense': 'passive',
  'Feral Instinct': 'passive',
  'Sculpt Spells': 'passive',
  'Potent Cantrip': 'passive',
  'Reliable Talent': 'passive',
  Elusive: 'passive',
  'Aura of Protection': 'passive',
  'Aura of Courage': 'passive',
  'Aura of Devotion': 'passive',
  'Draconic Resilience': 'passive',
  'Jack of All Trades': 'passive',
  'Remarkable Athlete': 'passive',
  Survivor: 'passive',
  'Blessed Healer': 'passive',
  'Disciple of Life': 'passive',
  'Supreme Healing': 'passive',
  'Diamond Soul': 'passive',
  Blindsense: 'passive',
  'Feral Senses': 'passive',
  'Purity of Body': 'passive',
  'Nature’s Ward': 'passive',
  'Mindless Rage': 'passive',
  'Persistent Rage': 'passive',
  'Relentless Rage': 'passive',
  'Fey Ancestry': 'passive',
  'Dwarven Resilience': 'passive',
  'Hellish Resistance': 'passive',
  'Gnome Cunning': 'passive',
  Brave: 'passive',
  'Naturally Stealthy': 'passive',
  'Halfling Nimbleness': 'passive',
  'Dwarven Toughness': 'passive',
  'Second-Story Work': 'passive',
  'Supreme Sneak': 'passive',
  'Land’s Stride': 'passive',
  'Woodwise': 'passive',
  'Forge-Drilled': 'passive',
  'Well Provisioned': 'passive',
  'Speech of the Undergrowth': 'passive',
}

/**
 * Stamp timings onto every matching feature across a set of collections.
 * Mutates in place; called once while the ruleset is being assembled.
 */
export function applyActionTimings(collections: Collection[]): void {
  const stamp = (effects: { type: string; name?: string; action?: string }[] | undefined) => {
    for (const effect of effects ?? []) {
      if (effect.type !== 'feature' || !effect.name) continue
      const timing = TIMINGS[effect.name]
      if (timing && !effect.action) effect.action = timing
    }
  }

  const walkChoices = (choices: { source: { kind: string; options?: { effects?: unknown[] }[] } }[] | undefined) => {
    for (const choice of choices ?? []) {
      if (choice.source.kind !== 'options') continue
      for (const option of choice.source.options ?? []) {
        stamp(option.effects as Parameters<typeof stamp>[0])
      }
    }
  }

  for (const collection of collections) {
    for (const entry of collection.entries) {
      stamp(entry.effects as Parameters<typeof stamp>[0])
      walkChoices(entry.choices as Parameters<typeof walkChoices>[0])
      for (const grant of entry.levels ?? []) {
        stamp(grant.effects as Parameters<typeof stamp>[0])
        walkChoices(grant.choices as Parameters<typeof walkChoices>[0])
      }
    }
  }
}

/** Feature names that carry a timing, for tests and coverage checks. */
export const TIMED_FEATURE_NAMES = Object.keys(TIMINGS)
