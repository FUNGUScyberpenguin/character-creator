import type { Choice, Collection, Effect, Entry, LevelGrant } from '../../engine/types'
import { allSkillIds } from './basics'

/**
 * The twelve SRD 5.1 classes.
 *
 * Level-dependent numbers that do not follow a tidy formula — spells known,
 * sneak attack dice, rage counts — are written into the stat bag with `set`
 * effects at the levels where they change. Because grants are applied in level
 * order, the highest applicable value simply wins, and formulas elsewhere can
 * read `stat.spellsKnown` without knowing any table by heart.
 */

const feature = (name: string, description: string, uses?: string, action?: string): Effect => ({
  type: 'feature',
  name,
  description,
  ...(uses ? { uses } : {}),
  ...(action ? { action } : {}),
})

const save = (ability: string): Effect => ({ type: 'proficiency', category: 'save', value: ability })
const armor = (value: string): Effect => ({ type: 'proficiency', category: 'armor', value })
const weapon = (value: string): Effect => ({ type: 'proficiency', category: 'weapon', value })
const setStat = (stat: string, value: number | string): Effect => ({ type: 'set', stat, value })

/** The Ability Score Improvement that most classes get at 4th, 8th, 12th, 16th and 19th. */
const asi = (level: number): LevelGrant => ({
  level,
  choices: [
    {
      id: `asi-${level}`,
      prompt: 'Ability Score Improvement — raise abilities by 1 twice (the same ability twice is allowed)',
      count: 2,
      allowDuplicates: true,
      source: { kind: 'abilities', amount: 1 },
    },
  ],
})

const STANDARD_ASI_LEVELS = [4, 8, 12, 16, 19]

const skillChoice = (count: number, from: string[]): Choice => ({
  id: 'skills',
  prompt: count === 1 ? 'Choose a skill' : `Choose ${count} skills`,
  count,
  source: { kind: 'skills', from },
})

const subclassChoice = (tag: string, prompt: string): Choice => ({
  id: 'subclass',
  prompt,
  source: { kind: 'collection', collection: 'subclasses', tag },
})

/** Turn a per-level table into `set` grants, emitting one only when the value changes. */
function tableGrants(stat: string, values: number[]): LevelGrant[] {
  const grants: LevelGrant[] = []
  let previous: number | undefined
  values.forEach((value, index) => {
    if (value === previous) return
    previous = value
    grants.push({ level: index + 1, effects: [setStat(stat, value)] })
  })
  return grants
}

/** Merge grants that land on the same level, keeping level order. */
function mergeGrants(...groups: LevelGrant[][]): LevelGrant[] {
  const byLevel = new Map<number, LevelGrant>()
  for (const group of groups) {
    for (const grant of group) {
      const existing = byLevel.get(grant.level)
      if (existing) {
        existing.effects = [...(existing.effects ?? []), ...(grant.effects ?? [])]
        existing.choices = [...(existing.choices ?? []), ...(grant.choices ?? [])]
      } else {
        byLevel.set(grant.level, {
          level: grant.level,
          effects: [...(grant.effects ?? [])],
          choices: [...(grant.choices ?? [])],
        })
      }
    }
  }
  return [...byLevel.values()].sort((a, b) => a.level - b.level)
}

const CANTRIPS_3_4_5 = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
const CANTRIPS_2_3_4 = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
const CANTRIPS_4_5_6 = [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]

const BARD_SPELLS_KNOWN = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22]
const SORCERER_SPELLS_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15]
const WARLOCK_SPELLS_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]
const RANGER_SPELLS_KNOWN = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]

const SIMPLE_AND_MARTIAL: Effect[] = [weapon('Simple weapons'), weapon('Martial weapons')]

const entries: Entry[] = [
  // -------------------------------------------------------------------------
  {
    id: 'barbarian',
    name: 'Barbarian',
    icon: '🪓',
    summary: 'A furious front-line brawler who gets tougher the angrier they get.',
    description:
      'Barbarians channel raw fury into devastating attacks and a stubborn refusal to fall. Simple to play, enormously satisfying to swing.',
    meta: { 'Hit Die': 'd12', 'Primary': 'Strength', 'Saves': 'STR & CON' , 'Complexity': 'Simple' },
    tags: ["role-melee", "complexity-low"],
    atTheTable: 'Rage as a bonus action, then hit things. Later you hit them twice. Very little to track.',
    effects: [
      setStat('hitDie', 12),
      save('str'),
      save('con'),
      armor('Light armor'),
      armor('Medium armor'),
      armor('Shields'),
      ...SIMPLE_AND_MARTIAL,
    ],
    choices: [
      skillChoice(2, ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'greataxe', name: 'A greataxe', effects: [{ type: 'item', item: 'Greataxe' }] },
            { id: 'martial', name: 'Any martial melee weapon', effects: [{ type: 'item', item: 'Martial melee weapon' }] },
          ],
        },
      },
      {
        id: 'equipment-secondary',
        prompt: 'Secondary weapons',
        source: {
          kind: 'options',
          options: [
            { id: 'handaxes', name: 'Two handaxes', effects: [{ type: 'item', item: 'Handaxe', quantity: 2 }] },
            { id: 'simple', name: 'Any simple weapon', effects: [{ type: 'item', item: 'Simple weapon' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      // 20th level is "unlimited" on the class table; the sheet says so in a
      // note rather than printing a sentinel number as a rage count.
      tableGrants('rages', [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6]),
      tableGrants('rageDamage', [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4]),
      [
        {
          level: 1,
          effects: [
            feature('Rage', 'In a rage you gain advantage on Strength checks and saves, bonus melee damage, and resistance to bludgeoning, piercing, and slashing damage.', 'stat.rages/long rest'),
            feature('Unarmored Defense', 'While not wearing armor, your AC equals 10 + your Dexterity modifier + your Constitution modifier. You may still use a shield.'),
            { type: 'resource', name: 'Rages', formula: 'stat.rages' },
            setStat('unarmoredDefense', 1),
          ],
        },
        { level: 2, effects: [feature('Reckless Attack', 'You can attack with advantage on your first turn, at the cost of attacks against you having advantage until your next turn.'), feature('Danger Sense', 'Advantage on Dexterity saving throws against effects you can see.')] },
        { level: 3, choices: [subclassChoice('barbarian', 'Primal Path')] },
        { level: 5, effects: [feature('Extra Attack', 'You can attack twice whenever you take the Attack action.'), feature('Fast Movement', 'Your speed increases by 10 feet while you are not wearing heavy armor.'), { type: 'bonus', stat: 'speed', amount: 10 }] },
        { level: 7, effects: [feature('Feral Instinct', 'Advantage on initiative, and you can act normally when surprised if you rage first.')] },
        { level: 9, effects: [feature('Brutal Critical', 'Roll one additional weapon damage die on a critical hit (two at 13th, three at 17th).')] },
        { level: 11, effects: [feature('Relentless Rage', 'If you drop to 0 hit points while raging, make a DC 10 Constitution save to drop to 1 instead. The DC rises by 5 each time.')] },
        { level: 15, effects: [feature('Persistent Rage', 'Your rage ends early only if you fall unconscious or choose to end it.')] },
        { level: 18, effects: [feature('Indomitable Might', 'If your Strength check total is less than your Strength score, use the score instead.')] },
        {
          level: 20,
          effects: [
            feature('Primal Champion', 'Your Strength and Constitution scores increase by 4, to a maximum of 24.'),
            { type: 'ability', ability: 'str', amount: 4 },
            { type: 'ability', ability: 'con', amount: 4 },
            { type: 'note', text: 'At 20th level your number of rages is unlimited.' },
          ],
        },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'bard',
    name: 'Bard',
    icon: '🎻',
    summary: 'An inspiring, magically gifted jack-of-all-trades who makes the whole party better.',
    description:
      'Bards weave magic through music and words. They cast, they talk their way past trouble, and they hand out dice that turn a failure into a success.',
    meta: { 'Hit Die': 'd8', 'Primary': 'Charisma', 'Saves': 'DEX & CHA' , 'Complexity': 'Complex' },
    tags: ["role-support", "role-social", "role-magic", "complexity-high"],
    atTheTable: 'Hand out dice that turn allies\u2019 failures into successes, cast a broad spell list, and talk your way past most problems.',
    effects: [
      setStat('hitDie', 8),
      save('dex'),
      save('cha'),
      armor('Light armor'),
      weapon('Simple weapons'),
      weapon('Hand crossbow'),
      weapon('Longsword'),
      weapon('Rapier'),
      weapon('Shortsword'),
      {
        type: 'spellcasting',
        id: 'bard',
        label: 'Bard Spellcasting',
        ability: 'cha',
        preparation: 'known',
        list: 'bard',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'stat.spellsKnown',
      },
    ],
    choices: [
      skillChoice(3, allSkillIds),
      {
        id: 'instruments',
        prompt: 'Three musical instruments',
        count: 3,
        source: {
          kind: 'proficiencies',
          category: 'tool',
          from: ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'],
        },
      },
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'rapier', name: 'A rapier', effects: [{ type: 'item', item: 'Rapier' }] },
            { id: 'longsword', name: 'A longsword', effects: [{ type: 'item', item: 'Longsword' }] },
            { id: 'simple', name: 'Any simple weapon', effects: [{ type: 'item', item: 'Simple weapon' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_2_3_4),
      tableGrants('spellsKnown', BARD_SPELLS_KNOWN),
      [
        {
          level: 1,
          effects: [
            feature('Bardic Inspiration', 'As a bonus action, give a creature a d6 it can add to one ability check, attack roll, or saving throw. The die grows at 5th, 10th, and 15th level.', 'CHA modifier/long rest'),
            { type: 'resource', name: 'Bardic Inspiration', formula: 'max(1, cha.mod)' },
          ],
        },
        { level: 2, effects: [feature('Jack of All Trades', 'Add half your proficiency bonus to any ability check that does not already include it.'), feature('Song of Rest', 'Your performance during a short rest lets allies regain extra hit points.')] },
        { level: 3, choices: [subclassChoice('bard', 'Bard College')], effects: [feature('Expertise', 'Choose two of your skill proficiencies; your proficiency bonus is doubled for them.')] },
        { level: 5, effects: [feature('Font of Inspiration', 'You regain all expended Bardic Inspiration on a short or long rest.')] },
        { level: 6, effects: [feature('Countercharm', 'As an action, you and allies within 30 feet gain advantage on saves against being frightened or charmed.')] },
        { level: 10, effects: [feature('Magical Secrets', 'Learn two spells from any class’s spell list. You gain two more at 14th and 18th level.')] },
        { level: 20, effects: [feature('Superior Inspiration', 'When you roll initiative with no Bardic Inspiration left, you regain one use.')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'cleric',
    name: 'Cleric',
    icon: '⛪',
    summary: 'A divine spellcaster who heals, protects, and can hold the line in armour.',
    description:
      'Clerics serve a deity and channel its power. They are the classic healer, but a well-built cleric is also a formidable combatant.',
    meta: { 'Hit Die': 'd8', 'Primary': 'Wisdom', 'Saves': 'WIS & CHA' , 'Complexity': 'Moderate' },
    tags: ["role-support", "role-magic", "role-melee", "complexity-medium"],
    atTheTable: 'Heal and buff, drop a big spell when it counts, and still hold a spot in the front line in armour.',
    effects: [
      setStat('hitDie', 8),
      save('wis'),
      save('cha'),
      armor('Light armor'),
      armor('Medium armor'),
      armor('Shields'),
      weapon('Simple weapons'),
      {
        type: 'spellcasting',
        id: 'cleric',
        label: 'Cleric Spellcasting',
        ability: 'wis',
        preparation: 'prepared',
        list: 'cleric',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'max(1, wis.mod + level)',
      },
    ],
    choices: [
      skillChoice(2, ['history', 'insight', 'medicine', 'persuasion', 'religion']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'mace', name: 'A mace', effects: [{ type: 'item', item: 'Mace' }] },
            { id: 'warhammer', name: 'A warhammer (if proficient)', effects: [{ type: 'item', item: 'Warhammer' }] },
          ],
        },
      },
      {
        id: 'equipment-armor',
        prompt: 'Starting armor',
        source: {
          kind: 'options',
          options: [
            { id: 'scale', name: 'Scale mail', effects: [{ type: 'item', item: 'Scale mail' }] },
            { id: 'leather', name: 'Leather armor', effects: [{ type: 'item', item: 'Leather armor' }] },
            { id: 'chain', name: 'Chain mail (if proficient)', effects: [{ type: 'item', item: 'Chain mail' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_3_4_5),
      [
        { level: 1, choices: [subclassChoice('cleric', 'Divine Domain')] },
        { level: 2, effects: [feature('Channel Divinity', 'Turn Undead, plus an option from your domain. You gain a second use at 6th level and a third at 18th.', '1/short rest')] },
        { level: 5, effects: [feature('Destroy Undead', 'When you turn undead, low-challenge undead are destroyed instantly. The threshold rises as you level.')] },
        { level: 10, effects: [feature('Divine Intervention', 'Call on your deity for aid. Roll d100; on a roll at or under your cleric level, your deity intervenes.', '1/7 days')] },
        { level: 20, effects: [feature('Divine Intervention Improvement', 'Your Divine Intervention call succeeds automatically.')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'druid',
    name: 'Druid',
    icon: '🍃',
    summary: 'A nature priest who shapeshifts into beasts and commands the elements.',
    description:
      'Druids draw on the power of nature itself. Wild Shape gives them a flexibility no other class has: scout as a rat, tank as a bear.',
    meta: { 'Hit Die': 'd8', 'Primary': 'Wisdom', 'Saves': 'INT & WIS' , 'Complexity': 'Complex' },
    tags: ["role-magic", "role-support", "complexity-high"],
    atTheTable: 'Turn into a bear to tank, or stay back and reshape the battlefield with terrain and weather.',
    effects: [
      setStat('hitDie', 8),
      save('int'),
      save('wis'),
      armor('Light armor (nonmetal)'),
      armor('Medium armor (nonmetal)'),
      armor('Shields (nonmetal)'),
      weapon('Club'),
      weapon('Dagger'),
      weapon('Dart'),
      weapon('Javelin'),
      weapon('Mace'),
      weapon('Quarterstaff'),
      weapon('Scimitar'),
      weapon('Sickle'),
      weapon('Sling'),
      weapon('Spear'),
      { type: 'proficiency', category: 'tool', value: 'Herbalism kit' },
      {
        type: 'spellcasting',
        id: 'druid',
        label: 'Druid Spellcasting',
        ability: 'wis',
        preparation: 'prepared',
        list: 'druid',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'max(1, wis.mod + level)',
      },
      { type: 'note', text: 'Druids will not wear armor or use shields made of metal.' },
    ],
    choices: [
      skillChoice(2, ['arcana', 'animal-handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'shield', name: 'A wooden shield', effects: [{ type: 'item', item: 'Shield' }] },
            { id: 'simple', name: 'Any simple weapon', effects: [{ type: 'item', item: 'Simple weapon' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_2_3_4),
      [
        { level: 1, effects: [feature('Druidic', 'You know Druidic, the secret language of druids, and can leave hidden messages in it.')] },
        { level: 2, effects: [feature('Wild Shape', 'Transform into a beast you have seen. Duration, challenge rating, and movement restrictions improve as you level.', '2/short rest')], choices: [subclassChoice('druid', 'Druid Circle')] },
        { level: 18, effects: [feature('Timeless Body', 'You age more slowly — for every 10 years that pass, your body ages only 1 year.'), feature('Beast Spells', 'You can cast many druid spells while in Wild Shape.')] },
        { level: 20, effects: [feature('Archdruid', 'You can use Wild Shape an unlimited number of times.')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'fighter',
    name: 'Fighter',
    icon: '⚔️',
    summary: 'The definitive weapon master — more attacks, more armour, more staying power.',
    description:
      'Fighters are the most flexible martial class and the friendliest to newcomers: pick a weapon, pick a fighting style, and hit things very reliably.',
    meta: { 'Hit Die': 'd10', 'Primary': 'Strength or Dexterity', 'Saves': 'STR & CON' , 'Complexity': 'Simple' },
    tags: ["role-melee", "role-ranged", "complexity-low"],
    atTheTable: 'Attack, attack again, and use Second Wind when you get low. The friendliest first character in the game.',
    effects: [
      setStat('hitDie', 10),
      save('str'),
      save('con'),
      armor('All armor'),
      armor('Shields'),
      ...SIMPLE_AND_MARTIAL,
    ],
    choices: [
      skillChoice(2, ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival']),
      {
        id: 'equipment-armor',
        prompt: 'Starting armor',
        source: {
          kind: 'options',
          options: [
            { id: 'chain', name: 'Chain mail', effects: [{ type: 'item', item: 'Chain mail' }] },
            { id: 'leather', name: 'Leather armor, longbow, and 20 arrows', effects: [{ type: 'item', item: 'Leather armor' }, { type: 'item', item: 'Longbow' }, { type: 'item', item: 'Arrows', quantity: 20 }] },
          ],
        },
      },
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapons',
        source: {
          kind: 'options',
          options: [
            { id: 'martial-shield', name: 'A martial weapon and a shield', effects: [{ type: 'item', item: 'Martial weapon' }, { type: 'item', item: 'Shield' }] },
            { id: 'two-martial', name: 'Two martial weapons', effects: [{ type: 'item', item: 'Martial weapon', quantity: 2 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      [
        {
          level: 1,
          effects: [
            feature('Second Wind', 'As a bonus action, regain 1d10 + your fighter level hit points.', '1/short rest'),
          ],
          choices: [
            {
              id: 'fighting-style',
              prompt: 'Fighting Style',
              source: { kind: 'collection', collection: 'fighting-styles' },
            },
          ],
        },
        { level: 2, effects: [feature('Action Surge', 'Take one additional action on your turn. You gain a second use at 17th level.', '1/short rest')] },
        { level: 3, choices: [subclassChoice('fighter', 'Martial Archetype')] },
        { level: 5, effects: [feature('Extra Attack', 'Attack twice when you take the Attack action — three times at 11th level and four times at 20th.')] },
        { level: 9, effects: [feature('Indomitable', 'Reroll a saving throw you failed. You gain more uses at 13th and 17th level.', '1/long rest')] },
      ],
      [4, 6, 8, 12, 14, 16, 19].map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'monk',
    name: 'Monk',
    icon: '👊',
    summary: 'A fast, unarmoured martial artist who spends ki on extraordinary feats.',
    description:
      'Monks turn their body into the weapon. They move faster than anyone, strike several times a round, and pick up striking supernatural tricks.',
    meta: { 'Hit Die': 'd8', 'Primary': 'Dexterity & Wisdom', 'Saves': 'STR & DEX' , 'Complexity': 'Moderate' },
    tags: ["role-melee", "complexity-medium"],
    atTheTable: 'Move further than anyone, strike three or four times a round, and spend ki to stun what you hit.',
    effects: [
      setStat('hitDie', 8),
      save('str'),
      save('dex'),
      weapon('Simple weapons'),
      weapon('Shortsword'),
      setStat('unarmoredDefenseWis', 1),
      { type: 'note', text: 'Unarmored Defense: while wearing no armor and no shield, your AC is 10 + DEX + WIS.' },
    ],
    choices: [
      skillChoice(2, ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth']),
      {
        id: 'tool-or-instrument',
        prompt: 'One artisan’s tool or musical instrument',
        source: {
          kind: 'proficiencies',
          category: 'tool',
          from: ["Smith's tools", "Brewer's supplies", "Calligrapher's supplies", "Painter's supplies", 'Flute', 'Lute', 'Drum', 'Horn'],
        },
      },
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'shortsword', name: 'A shortsword', effects: [{ type: 'item', item: 'Shortsword' }] },
            { id: 'simple', name: 'Any simple weapon', effects: [{ type: 'item', item: 'Simple weapon' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('martialArts', [4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10]),
      tableGrants('monkSpeed', [0, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20, 20, 25, 25, 25, 25, 30, 30, 30]),
      [
        {
          level: 1,
          effects: [
            feature('Martial Arts', 'Use Dexterity for unarmed strikes and monk weapons, roll a martial arts die for damage, and make an unarmed strike as a bonus action.'),
            feature('Unarmored Defense', 'While wearing no armor and no shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.'),
          ],
        },
        {
          level: 2,
          effects: [
            feature('Ki', 'Spend ki points on Flurry of Blows, Patient Defense, and Step of the Wind. You regain all ki on a short rest.', 'monk level/short rest'),
            feature('Unarmored Movement', 'Your speed increases while you wear no armor and no shield.'),
            { type: 'resource', name: 'Ki Points', formula: 'level' },
            { type: 'bonus', stat: 'speed', amount: 0 },
          ],
        },
        { level: 3, effects: [feature('Deflect Missiles', 'Reduce ranged weapon damage by 1d10 + your monk level + your Dexterity modifier, and throw the missile back for 1 ki.')], choices: [subclassChoice('monk', 'Monastic Tradition')] },
        { level: 4, effects: [feature('Slow Fall', 'Reduce falling damage by five times your monk level.')] },
        { level: 5, effects: [feature('Extra Attack', 'Attack twice when you take the Attack action.'), feature('Stunning Strike', 'Spend 1 ki to force a Constitution save or stun the target until the end of your next turn.')] },
        { level: 6, effects: [feature('Ki-Empowered Strikes', 'Your unarmed strikes count as magical for overcoming resistance.')] },
        { level: 7, effects: [feature('Evasion', 'Take no damage on a successful Dexterity save against area effects, and half on a failure.'), feature('Stillness of Mind', 'End one effect charming or frightening you, as an action.')] },
        { level: 10, effects: [feature('Purity of Body', 'You are immune to disease and poison.')] },
        { level: 13, effects: [feature('Tongue of the Sun and Moon', 'You understand all spoken languages, and are understood by anyone who can speak.')] },
        { level: 14, effects: [feature('Diamond Soul', 'You gain proficiency in all saving throws and can reroll a failed save for 1 ki.')] },
        { level: 15, effects: [feature('Timeless Body', 'You no longer age and cannot be aged magically.')] },
        { level: 18, effects: [feature('Empty Body', 'Spend 4 ki to become invisible for 1 minute, or 8 ki to cast astral projection.')] },
        { level: 20, effects: [feature('Perfect Self', 'When you roll initiative with no ki left, you regain 4 ki points.')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'paladin',
    name: 'Paladin',
    icon: '🛡️',
    summary: 'A holy warrior bound by an oath, with heavy armour and burst damage.',
    description:
      'Paladins combine martial strength with divine magic and an oath they must keep. Divine Smite makes them terrifying on a critical hit.',
    meta: { 'Hit Die': 'd10', 'Primary': 'Strength & Charisma', 'Saves': 'WIS & CHA' , 'Complexity': 'Moderate' },
    tags: ["role-melee", "role-support", "complexity-medium"],
    atTheTable: 'Hold the line in heavy armour, then burn a spell slot to turn one hit into an enormous one.',
    effects: [
      setStat('hitDie', 10),
      save('wis'),
      save('cha'),
      armor('All armor'),
      armor('Shields'),
      ...SIMPLE_AND_MARTIAL,
    ],
    choices: [
      skillChoice(2, ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapons',
        source: {
          kind: 'options',
          options: [
            { id: 'martial-shield', name: 'A martial weapon and a shield', effects: [{ type: 'item', item: 'Martial weapon' }, { type: 'item', item: 'Shield' }] },
            { id: 'two-martial', name: 'Two martial weapons', effects: [{ type: 'item', item: 'Martial weapon', quantity: 2 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      [
        {
          level: 1,
          effects: [
            feature('Divine Sense', 'Detect celestials, fiends, and undead within 60 feet.', '1 + CHA modifier/long rest'),
            feature('Lay on Hands', 'A pool of healing equal to five times your paladin level, spent as an action.', 'pool/long rest'),
            { type: 'resource', name: 'Lay on Hands', formula: 'level * 5' },
          ],
        },
        {
          level: 2,
          effects: [
            feature('Divine Smite', 'When you hit with a melee weapon, expend a spell slot to deal 2d8 extra radiant damage, plus 1d8 per slot level above 1st.'),
            {
              type: 'spellcasting',
              id: 'paladin',
              label: 'Paladin Spellcasting',
              ability: 'cha',
              preparation: 'prepared',
              list: 'paladin',
              slots: 'half',
              spellsKnown: 'max(1, cha.mod + floor(level / 2))',
            },
          ],
          choices: [
            {
              id: 'fighting-style',
              prompt: 'Fighting Style',
              source: { kind: 'collection', collection: 'fighting-styles', tag: 'paladin' },
            },
          ],
        },
        { level: 3, effects: [feature('Divine Health', 'You are immune to disease.')], choices: [subclassChoice('paladin', 'Sacred Oath')] },
        { level: 5, effects: [feature('Extra Attack', 'Attack twice when you take the Attack action.')] },
        { level: 6, effects: [feature('Aura of Protection', 'You and friendly creatures within 10 feet add your Charisma modifier to saving throws. The radius grows to 30 feet at 18th level.')] },
        { level: 10, effects: [feature('Aura of Courage', 'You and friendly creatures within your aura cannot be frightened.')] },
        { level: 11, effects: [feature('Improved Divine Smite', 'Your melee weapon hits deal an extra 1d8 radiant damage.')] },
        { level: 14, effects: [feature('Cleansing Touch', 'End one spell on yourself or a willing creature you touch.', 'CHA modifier/long rest')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    summary: 'A tracker and skirmisher who knows the wild and fights with bow or blades.',
    description:
      'Rangers are hunters at the edge of civilisation, mixing martial skill with a little nature magic and unmatched wilderness competence.',
    meta: { 'Hit Die': 'd10', 'Primary': 'Dexterity & Wisdom', 'Saves': 'STR & DEX' , 'Complexity': 'Moderate' },
    tags: ["role-ranged", "role-melee", "complexity-medium"],
    atTheTable: 'Mark a target and whittle it down with a bow or two blades, while never getting the party lost.',
    effects: [
      setStat('hitDie', 10),
      save('str'),
      save('dex'),
      armor('Light armor'),
      armor('Medium armor'),
      armor('Shields'),
      ...SIMPLE_AND_MARTIAL,
    ],
    choices: [
      skillChoice(3, ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival']),
      {
        id: 'equipment-armor',
        prompt: 'Starting armor',
        source: {
          kind: 'options',
          options: [
            { id: 'scale', name: 'Scale mail', effects: [{ type: 'item', item: 'Scale mail' }] },
            { id: 'leather', name: 'Leather armor', effects: [{ type: 'item', item: 'Leather armor' }] },
          ],
        },
      },
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapons',
        source: {
          kind: 'options',
          options: [
            { id: 'shortswords', name: 'Two shortswords', effects: [{ type: 'item', item: 'Shortsword', quantity: 2 }] },
            { id: 'simple', name: 'Two simple melee weapons', effects: [{ type: 'item', item: 'Simple melee weapon', quantity: 2 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('spellsKnown', RANGER_SPELLS_KNOWN),
      [
        {
          level: 1,
          effects: [
            feature('Favored Enemy', 'Advantage on Survival checks to track your chosen enemy type and on Intelligence checks to recall lore about them. You also learn a related language.'),
            feature('Natural Explorer', 'In your favored terrain, difficult terrain does not slow your group, you cannot become lost, and you find twice as much food while foraging.'),
          ],
        },
        {
          level: 2,
          effects: [
            {
              type: 'spellcasting',
              id: 'ranger',
              label: 'Ranger Spellcasting',
              ability: 'wis',
              preparation: 'known',
              list: 'ranger',
              slots: 'half',
              spellsKnown: 'stat.spellsKnown',
            },
          ],
          choices: [
            {
              id: 'fighting-style',
              prompt: 'Fighting Style',
              source: { kind: 'collection', collection: 'fighting-styles', tag: 'ranger' },
            },
          ],
        },
        { level: 3, choices: [subclassChoice('ranger', 'Ranger Archetype')] },
        { level: 5, effects: [feature('Extra Attack', 'Attack twice when you take the Attack action.')] },
        { level: 8, effects: [feature('Land’s Stride', 'Moving through nonmagical difficult terrain costs you no extra movement.')] },
        { level: 10, effects: [feature('Hide in Plain Sight', 'Spend a minute camouflaging yourself for a +10 bonus to Stealth while you stay still.')] },
        { level: 14, effects: [feature('Vanish', 'Hide as a bonus action, and you cannot be tracked nonmagically.')] },
        { level: 18, effects: [feature('Feral Senses', 'You are aware of the location of invisible creatures within 30 feet.')] },
        { level: 20, effects: [feature('Foe Slayer', 'Once a turn, add your Wisdom modifier to an attack or damage roll against a favored enemy.')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'rogue',
    name: 'Rogue',
    icon: '🗡️',
    summary: 'A precise, evasive specialist with huge burst damage and the best skills in the game.',
    description:
      'Rogues get things done quietly: pick the lock, spot the trap, and put a dagger exactly where it hurts. Sneak Attack scales all the way to 20th level.',
    meta: { 'Hit Die': 'd8', 'Primary': 'Dexterity', 'Saves': 'DEX & INT' , 'Complexity': 'Moderate' },
    tags: ["role-social", "role-ranged", "role-melee", "complexity-medium"],
    atTheTable: 'Get advantage or stand next to an ally, land one big Sneak Attack, then disengage and vanish as a bonus action.',
    effects: [
      setStat('hitDie', 8),
      save('dex'),
      save('int'),
      armor('Light armor'),
      weapon('Simple weapons'),
      weapon('Hand crossbow'),
      weapon('Longsword'),
      weapon('Rapier'),
      weapon('Shortsword'),
      { type: 'proficiency', category: 'tool', value: "Thieves' tools" },
    ],
    choices: [
      skillChoice(4, ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight-of-hand', 'stealth']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'rapier', name: 'A rapier', effects: [{ type: 'item', item: 'Rapier' }] },
            { id: 'shortsword', name: 'A shortsword', effects: [{ type: 'item', item: 'Shortsword' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('sneakAttack', [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10]),
      [
        {
          level: 1,
          effects: [
            feature('Sneak Attack', 'Once per turn, deal extra damage to a target you have advantage against, or that is next to an ally. The dice scale with your rogue level.'),
            feature('Thieves’ Cant', 'You know the secret mix of dialect, jargon, and code that rogues use to hide messages in ordinary conversation.'),
          ],
        },
        { level: 1, choices: [{ id: 'expertise-1', prompt: 'Expertise — choose two proficiencies to double', count: 2, source: { kind: 'skills' } }] },
        { level: 2, effects: [feature('Cunning Action', 'Dash, Disengage, or Hide as a bonus action on each of your turns.')] },
        { level: 3, choices: [subclassChoice('rogue', 'Roguish Archetype')] },
        { level: 5, effects: [feature('Uncanny Dodge', 'Halve the damage from one attacker you can see, as a reaction.')] },
        { level: 6, choices: [{ id: 'expertise-2', prompt: 'Expertise — choose two more proficiencies to double', count: 2, source: { kind: 'skills' } }] },
        { level: 7, effects: [feature('Evasion', 'Take no damage on a successful Dexterity save against area effects, and half on a failure.')] },
        { level: 11, effects: [feature('Reliable Talent', 'Treat any d20 roll of 9 or lower as a 10 for ability checks you are proficient in.')] },
        { level: 14, effects: [feature('Blindsense', 'You are aware of hidden or invisible creatures within 10 feet.')] },
        { level: 15, effects: [feature('Slippery Mind', 'You gain proficiency in Wisdom saving throws.'), save('wis')] },
        { level: 18, effects: [feature('Elusive', 'No attack roll has advantage against you while you are not incapacitated.')] },
        { level: 20, effects: [feature('Stroke of Luck', 'Turn a miss into a hit, or a failed ability check into a 20.', '1/short rest')] },
      ],
      [4, 8, 10, 12, 16, 19].map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    icon: '✨',
    summary: 'Innate magic in the blood, bent on the fly with Metamagic.',
    description:
      'Sorcerers know fewer spells than a wizard but can twist them mid-cast — a twinned, quickened, or subtle spell at the right moment wins fights.',
    meta: { 'Hit Die': 'd6', 'Primary': 'Charisma', 'Saves': 'CON & CHA' , 'Complexity': 'Complex' },
    tags: ["role-magic", "complexity-high"],
    atTheTable: 'Fewer spells than a wizard, but you bend them mid-cast \u2014 twinned, quickened, or silent.',
    effects: [
      setStat('hitDie', 6),
      save('con'),
      save('cha'),
      weapon('Dagger'),
      weapon('Dart'),
      weapon('Sling'),
      weapon('Quarterstaff'),
      weapon('Light crossbow'),
      {
        type: 'spellcasting',
        id: 'sorcerer',
        label: 'Sorcerer Spellcasting',
        ability: 'cha',
        preparation: 'known',
        list: 'sorcerer',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'stat.spellsKnown',
      },
    ],
    choices: [
      skillChoice(2, ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'crossbow', name: 'A light crossbow and 20 bolts', effects: [{ type: 'item', item: 'Light crossbow' }, { type: 'item', item: 'Crossbow bolts', quantity: 20 }] },
            { id: 'simple', name: 'Any simple weapon', effects: [{ type: 'item', item: 'Simple weapon' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_4_5_6),
      tableGrants('spellsKnown', SORCERER_SPELLS_KNOWN),
      [
        { level: 1, choices: [subclassChoice('sorcerer', 'Sorcerous Origin')] },
        {
          level: 2,
          effects: [
            feature('Font of Magic', 'You have sorcery points equal to your sorcerer level, and can convert them into spell slots or back.'),
            { type: 'resource', name: 'Sorcery Points', formula: 'level' },
          ],
        },
        {
          level: 3,
          effects: [feature('Metamagic', 'Two ways to bend your spells. You learn another at 10th and 17th level.')],
          choices: [
            { id: 'metamagic', prompt: 'Metamagic options', count: 2, source: { kind: 'collection', collection: 'metamagic' } },
          ],
        },
        { level: 20, effects: [feature('Sorcerous Restoration', 'You regain 4 sorcery points on a short rest.')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'warlock',
    name: 'Warlock',
    icon: '👁️',
    summary: 'A pact-bound caster with few slots that always recharge, plus at-will Eldritch Blast.',
    description:
      'Warlocks trade breadth for reliability: a couple of always-top-level slots back on a short rest, and invocations that reshape how you play.',
    meta: { 'Hit Die': 'd8', 'Primary': 'Charisma', 'Saves': 'WIS & CHA' , 'Complexity': 'Moderate' },
    tags: ["role-magic", "role-social", "complexity-medium"],
    atTheTable: 'Fire Eldritch Blast all day for free, with a couple of powerful slots that come back on a short rest.',
    effects: [
      setStat('hitDie', 8),
      save('wis'),
      save('cha'),
      armor('Light armor'),
      weapon('Simple weapons'),
      {
        type: 'spellcasting',
        id: 'warlock',
        label: 'Pact Magic',
        ability: 'cha',
        preparation: 'known',
        list: 'warlock',
        slots: 'warlock',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'stat.spellsKnown',
      },
    ],
    choices: [
      skillChoice(2, ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'crossbow', name: 'A light crossbow and 20 bolts', effects: [{ type: 'item', item: 'Light crossbow' }, { type: 'item', item: 'Crossbow bolts', quantity: 20 }] },
            { id: 'simple', name: 'Any simple weapon', effects: [{ type: 'item', item: 'Simple weapon' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_2_3_4),
      tableGrants('spellsKnown', WARLOCK_SPELLS_KNOWN),
      tableGrants('invocationsKnown', [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8]),
      [
        { level: 1, choices: [subclassChoice('warlock', 'Otherworldly Patron')] },
        {
          level: 2,
          effects: [feature('Eldritch Invocations', 'Fragments of forbidden knowledge that grant permanent abilities. You can swap one when you level up.')],
          choices: [
            { id: 'invocations', prompt: 'Eldritch Invocations', count: 2, source: { kind: 'collection', collection: 'invocations' } },
          ],
        },
        {
          level: 3,
          choices: [{ id: 'pact-boon', prompt: 'Pact Boon', source: { kind: 'collection', collection: 'pact-boons' } }],
        },
        { level: 11, effects: [feature('Mystic Arcanum (6th level)', 'Choose one 6th-level spell you can cast once per long rest without a slot. You gain a 7th, 8th, and 9th at 13th, 15th, and 17th level.')] },
        { level: 20, effects: [feature('Eldritch Master', 'Spend 1 minute entreating your patron to regain all expended Pact Magic slots.', '1/long rest')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'wizard',
    name: 'Wizard',
    icon: '📖',
    summary: 'The widest spell list in the game, learned from a book and prepared each day.',
    description:
      'Wizards study magic rather than inherit it. Their spellbook grows every level and with every scroll they find, making them the most flexible casters.',
    meta: { 'Hit Die': 'd6', 'Primary': 'Intelligence', 'Saves': 'INT & WIS' , 'Complexity': 'Complex' },
    tags: ["role-magic", "complexity-high"],
    atTheTable: 'The widest spell list in the game. Prepare for the day ahead, and have an answer for almost anything.',
    effects: [
      setStat('hitDie', 6),
      save('int'),
      save('wis'),
      weapon('Dagger'),
      weapon('Dart'),
      weapon('Sling'),
      weapon('Quarterstaff'),
      weapon('Light crossbow'),
      {
        type: 'spellcasting',
        id: 'wizard',
        label: 'Wizard Spellcasting',
        ability: 'int',
        preparation: 'prepared',
        list: 'wizard',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'max(1, int.mod + level)',
      },
      { type: 'item', item: 'Spellbook' },
    ],
    choices: [
      skillChoice(2, ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion']),
      {
        id: 'equipment-weapon',
        prompt: 'Starting weapon',
        source: {
          kind: 'options',
          options: [
            { id: 'quarterstaff', name: 'A quarterstaff', effects: [{ type: 'item', item: 'Quarterstaff' }] },
            { id: 'dagger', name: 'A dagger', effects: [{ type: 'item', item: 'Dagger' }] },
          ],
        },
      },
      {
        id: 'equipment-focus',
        prompt: 'Arcane focus',
        source: {
          kind: 'options',
          options: [
            { id: 'component-pouch', name: 'A component pouch', effects: [{ type: 'item', item: 'Component pouch' }] },
            { id: 'focus', name: 'An arcane focus', effects: [{ type: 'item', item: 'Arcane focus' }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_3_4_5),
      [
        {
          level: 1,
          effects: [
            feature('Arcane Recovery', 'On a short rest, recover spell slots with a combined level up to half your wizard level, rounded up.', '1/long rest'),
            feature('Spellbook', 'You start with six 1st-level wizard spells in your spellbook and add two more each level.'),
          ],
        },
        { level: 2, choices: [subclassChoice('wizard', 'Arcane Tradition')] },
        { level: 18, effects: [feature('Spell Mastery', 'Choose a 1st- and a 2nd-level spell you can cast at will without a slot.')] },
        { level: 20, effects: [feature('Signature Spells', 'Choose two 3rd-level spells you always have prepared and can each cast once without a slot per short rest.')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
    ),
  },
]

export const classes: Collection = {
  id: 'classes',
  label: 'Classes',
  singular: 'Class',
  entries,
  /**
   * Twelve classes is where new players stall. These let someone say what they
   * want to *do* and see three or four candidates instead of the whole wall.
   */
  facets: [
    {
      id: 'role',
      label: 'What do you want to be doing?',
      options: [
        { value: 'role-melee', label: 'Hitting things up close', description: 'Front line, soaking damage' },
        { value: 'role-ranged', label: 'Attacking from range', description: 'Bows, thrown weapons, skirmishing' },
        { value: 'role-magic', label: 'Casting spells', description: 'Blasting, controlling, transforming' },
        { value: 'role-support', label: 'Healing and helping', description: 'Keeping everyone else standing' },
        { value: 'role-social', label: 'Talking and sneaking', description: 'Faces, scouts, problem-solvers' },
      ],
    },
    {
      id: 'complexity',
      label: 'How much bookkeeping do you want?',
      options: [
        { value: 'complexity-low', label: 'Keep it simple', description: 'Few moving parts, easy first character' },
        { value: 'complexity-medium', label: 'Some moving parts', description: 'A handful of resources to track' },
        { value: 'complexity-high', label: 'Give me everything', description: 'Spell lists and long option menus' },
      ],
    },
  ],
}
