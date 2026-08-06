import type { Choice, Collection, Effect, Entry, LevelGrant } from '../../engine/types'
import { allSkillIds } from '../dnd5e/basics'

/**
 * The twelve classes of SRD 5.2 (the 2024 rules).
 *
 * Four things differ from the 5.1 module, and between them they account for
 * most of what is written here:
 *
 * 1. **Subclass at 3rd level, for everyone.** No class chooses earlier.
 * 2. **Weapon Mastery.** Barbarian, Fighter, Paladin, Ranger and Rogue nominate
 *    specific weapons whose mastery property they can use.
 * 3. **Everyone prepares.** Bards, rangers, sorcerers and warlocks no longer
 *    have a fixed list of spells known; they prepare from a table like clerics
 *    always did.
 * 4. **19th level is an Epic Boon**, not an Ability Score Improvement.
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

const asi = (level: number): LevelGrant => ({
  level,
  choices: [
    {
      id: `asi-${level}`,
      prompt: 'Ability Score Improvement — raise abilities by 1 twice, or take a feat with your DM’s agreement',
      count: 2,
      allowDuplicates: true,
      source: { kind: 'abilities', amount: 1 },
    },
  ],
})

/** 19th level, where 2014 had a fifth Ability Score Improvement. */
const EPIC_BOON: LevelGrant = {
  level: 19,
  choices: [
    {
      id: 'epic-boon',
      prompt: 'Epic Boon',
      source: { kind: 'collection', collection: 'epic-boons' },
    },
  ],
}

const STANDARD_ASI_LEVELS = [4, 8, 12, 16]

const skillChoice = (count: number, from: string[]): Choice => ({
  id: 'skills',
  prompt: count === 1 ? 'Choose a skill' : `Choose ${count} skills`,
  count,
  source: { kind: 'skills', from },
})

const subclassChoice = (tag: string, prompt: string): Choice => ({
  id: 'subclass',
  prompt,
  descriptor: true,
  source: { kind: 'collection', collection: 'subclasses', tag },
})

/**
 * Weapon Mastery.
 *
 * The count grows for fighters, and every class may swap its weapons on a Long
 * Rest, so each grant asks the whole question again rather than adding to an
 * earlier answer. Re-picking the same weapons is the expected answer.
 */
const masteryChoice = (level: number, count: number): LevelGrant => ({
  level,
  choices: [
    {
      id: `mastery-${level}`,
      prompt:
        level === 1
          ? `Weapon Mastery — choose ${count} weapons whose mastery property you can use`
          : `Weapon Mastery — you now have ${count}. Choose them again, swapping any you like`,
      count,
      source: { kind: 'collection', collection: 'masteries' },
    },
  ],
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

const CANTRIPS_2_3_4 = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
const CANTRIPS_3_4_5 = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
const CANTRIPS_4_5_6 = [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]

/** Prepared-spell counts. In 2024 every caster has one of these. */
const FULL_PREPARED = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
const SORCERER_PREPARED = [2, 4, 4, 5, 6, 7, 7, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 15]
const WARLOCK_PREPARED = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]
const HALF_PREPARED = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15]

const SIMPLE_AND_MARTIAL: Effect[] = [weapon('Simple weapons'), weapon('Martial weapons')]

const entries: Entry[] = [
  // -------------------------------------------------------------------------
  {
    id: 'barbarian',
    name: 'Barbarian',
    icon: '🪓',
    summary: 'A furious front-line brawler who gets tougher the angrier they get.',
    description:
      'Barbarians channel raw fury into devastating attacks and a stubborn refusal to fall. In 2024 Rage lasts ten minutes and no longer needs you to keep hitting things to sustain it, which removes most of the bookkeeping.',
    meta: { 'Hit Die': 'd12', Primary: 'Strength', Saves: 'STR & CON', Complexity: 'Simple' },
    tags: ['role-melee', 'complexity-low'],
    atTheTable: 'Rage as a bonus action, then hit things. From 9th level every hit can also knock someone down or hobble them.',
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
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Greataxe, four handaxes, an explorer’s pack and 15 gp',
              effects: [
                { type: 'item', item: 'Greataxe' },
                { type: 'item', item: 'Handaxe', quantity: 4 },
                { type: 'item', item: "Explorer's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 15 },
              ],
            },
            { id: 'gold', name: '75 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 75 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('rages', [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6]),
      tableGrants('rageDamage', [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4]),
      [
        {
          level: 1,
          effects: [
            feature('Rage', 'As a Bonus Action you enter a Rage for 10 minutes: advantage on Strength checks and saves, extra melee damage, and resistance to bludgeoning, piercing and slashing damage. It ends early if you are Incapacitated or don Heavy armor.', '{stat.rages}/long rest', 'bonus'),
            feature('Unarmored Defense', 'While you wear no armor, your AC equals 10 + your Dexterity modifier + your Constitution modifier. A Shield still helps.', undefined, 'passive'),
            { type: 'resource', name: 'Rages', formula: 'stat.rages' },
            setStat('unarmoredDefense', 1),
          ],
        },
        {
          level: 2,
          effects: [
            feature('Danger Sense', 'You have advantage on Dexterity saving throws against effects you can see, unless you are Incapacitated.', undefined, 'passive'),
            feature('Reckless Attack', 'When you make your first attack on your turn, you can attack recklessly: advantage on your Strength-based attacks this turn, and advantage to anything attacking you until your next turn.', undefined, 'free'),
          ],
        },
        {
          level: 3,
          choices: [subclassChoice('barbarian', 'Primal Path')],
          effects: [
            feature('Primal Knowledge', 'You gain proficiency in one more skill from the barbarian list, and while raging you can make Strength-based checks in place of Acrobatics, Intimidation, Perception, Stealth or Survival.', undefined, 'passive'),
          ],
        },
        {
          level: 5,
          effects: [
            feature('Extra Attack', 'You can attack twice whenever you take the Attack action.', undefined, 'free'),
            feature('Fast Movement', 'Your Speed increases by 10 feet while you are not wearing Heavy armor.', undefined, 'passive'),
            { type: 'bonus', stat: 'speed', amount: 10 },
          ],
        },
        {
          level: 7,
          effects: [
            feature('Feral Instinct', 'You have advantage on Initiative rolls.', undefined, 'passive'),
            feature('Instinctive Pounce', 'As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.', undefined, 'bonus'),
          ],
        },
        {
          level: 9,
          effects: [
            feature('Brutal Strike', 'If you use Reckless Attack, you can forgo advantage on one attack to add 1d10 damage and either Forceful Blow (push 15 feet and move with it) or Hamstring Blow (its Speed drops by 15 feet).', undefined, 'free'),
          ],
        },
        { level: 11, effects: [feature('Relentless Rage', 'If you drop to 0 hit points while raging and do not die outright, make a DC 10 Constitution save to drop to a number of hit points equal to twice your barbarian level instead. The DC rises by 5 each time until you finish a rest.', undefined, 'free')] },
        { level: 13, effects: [feature('Improved Brutal Strike', 'Brutal Strike gains two more options: Staggering Blow (disadvantage on its next save, and no Reaction) and Sundering Blow (the next attacker against it gets +5).', undefined, 'free')] },
        { level: 15, effects: [feature('Persistent Rage', 'When you roll Initiative your Rage uses are restored if you have none left, and your Rage lasts until you end it or fall Unconscious.', '1/long rest', 'free')] },
        { level: 17, effects: [feature('Improved Brutal Strike (2)', 'You can use two different Brutal Strike effects on the same attack, and its extra damage becomes 2d10.', undefined, 'free')] },
        { level: 18, effects: [feature('Indomitable Might', 'If your total for a Strength check or Strength saving throw is less than your Strength score, use the score instead.', undefined, 'passive')] },
        {
          level: 20,
          effects: [
            feature('Primal Champion', 'Your Strength and Constitution scores increase by 4, to a maximum of 25.', undefined, 'passive'),
            { type: 'ability', ability: 'str', amount: 4 },
            { type: 'ability', ability: 'con', amount: 4 },
          ],
        },
      ],
      [masteryChoice(1, 2)],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'bard',
    name: 'Bard',
    icon: '🎻',
    summary: 'An inspiring, magically gifted jack-of-all-trades who makes the whole party better.',
    description:
      'Bards weave magic through performance. In 2024 Bardic Inspiration comes back on a Short Rest from 5th level, so handing dice out stops feeling precious.',
    meta: { 'Hit Die': 'd8', Primary: 'Charisma', Saves: 'DEX & CHA', Complexity: 'Complex' },
    tags: ['role-support', 'role-social', 'role-magic', 'complexity-high'],
    atTheTable: 'Hand out dice that turn allies’ failures into successes, cast a broad spell list, and talk your way past most problems.',
    effects: [
      setStat('hitDie', 8),
      save('dex'),
      save('cha'),
      armor('Light armor'),
      weapon('Simple weapons'),
      {
        type: 'spellcasting',
        id: 'bard',
        label: 'Bard Spellcasting',
        ability: 'cha',
        preparation: 'prepared',
        list: 'bard',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'stat.spellsPrepared',
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
          from: ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre', 'Pan flute', 'Shawm', 'Viol'],
        },
      },
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Leather armor, two daggers, a musical instrument, an entertainer’s pack and 19 gp',
              effects: [
                { type: 'item', item: 'Leather armor' },
                { type: 'item', item: 'Dagger', quantity: 2 },
                { type: 'item', item: 'Lute' },
                { type: 'item', item: "Entertainer's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 19 },
              ],
            },
            { id: 'gold', name: '90 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 90 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_2_3_4),
      tableGrants('spellsPrepared', FULL_PREPARED),
      [
        {
          level: 1,
          effects: [
            feature('Bardic Inspiration', 'As a Bonus Action, give a creature within 60 feet a Bardic Inspiration die. Within the hour they can add it to one d20 test, after seeing the roll but before knowing the result. The die grows to d8 at 5th level, d10 at 10th, and d12 at 15th.', 'charisma modifier/long rest', 'bonus'),
            { type: 'resource', name: 'Bardic Inspiration', formula: 'max(1, cha.mod)' },
          ],
        },
        {
          level: 2,
          effects: [
            feature('Jack of All Trades', 'Add half your proficiency bonus, rounded down, to any ability check you make that does not already include it.', undefined, 'passive'),
          ],
          choices: [
            { id: 'expertise-2', prompt: 'Expertise — two skills you are proficient in', count: 2, source: { kind: 'skills' } },
          ],
        },
        { level: 3, choices: [subclassChoice('bard', 'Bard College')] },
        { level: 5, effects: [feature('Font of Inspiration', 'You regain all your Bardic Inspiration uses on a Short Rest as well as a Long Rest, and you can spend one to fuel a bard feature as well as give it away.', undefined, 'passive')] },
        { level: 7, effects: [feature('Countercharm', 'As a Reaction when you or a creature within 30 feet fails a saving throw against being Frightened or Charmed, you can cause the save to be rerolled with advantage.', undefined, 'reaction')] },
        {
          level: 9,
          choices: [{ id: 'expertise-9', prompt: 'Expertise — two more skills', count: 2, source: { kind: 'skills' } }],
        },
        { level: 10, effects: [feature('Magical Secrets', 'When you gain a bard level you can now choose your prepared spells from the Cleric, Druid and Wizard lists as well as your own.', undefined, 'passive')] },
        { level: 18, effects: [feature('Superior Inspiration', 'When you roll Initiative you regain expended uses of Bardic Inspiration until you have two.', undefined, 'free')] },
        { level: 20, effects: [feature('Words of Creation', 'You always have Power Word Heal and Power Word Kill prepared, and can target a second creature within 10 feet of the first with either.', undefined, 'passive')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'cleric',
    name: 'Cleric',
    icon: '✨',
    summary: 'A divine spellcaster who heals, buffs, and can hold a front line in heavy armour.',
    description:
      'Clerics draw power from a god. In 2024 you choose a Divine Order at 1st level, deciding early whether you are the armoured one or the scholarly one.',
    meta: { 'Hit Die': 'd8', Primary: 'Wisdom', Saves: 'WIS & CHA', Complexity: 'Moderate' },
    tags: ['role-support', 'role-magic', 'complexity-medium'],
    atTheTable: 'Prepare a fresh spell list every morning, heal when it matters, and spend Channel Divinity on the big moments.',
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
        spellsKnown: 'stat.spellsPrepared',
      },
    ],
    choices: [
      skillChoice(2, ['history', 'insight', 'medicine', 'persuasion', 'religion']),
      {
        id: 'divine-order',
        prompt: 'Divine Order',
        source: {
          kind: 'options',
          options: [
            {
              id: 'protector',
              name: 'Protector',
              summary: 'Martial weapons and heavy armour.',
              effects: [armor('Heavy armor'), weapon('Martial weapons'), feature('Divine Order: Protector', 'You gain training with Martial weapons and Heavy armor.', undefined, 'passive')],
            },
            {
              id: 'thaumaturge',
              name: 'Thaumaturge',
              summary: 'An extra cantrip, and Intelligence checks about the divine improve.',
              effects: [feature('Divine Order: Thaumaturge', 'You know one extra Cleric cantrip, and you add your Wisdom modifier to Arcana and Religion checks.', undefined, 'passive'), { type: 'bonus', stat: 'cantripsKnown', amount: 1 }],
            },
          ],
        },
      },
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Chain shirt, shield, mace, holy symbol, priest’s pack and 7 gp',
              effects: [
                { type: 'item', item: 'Chain shirt' },
                { type: 'item', item: 'Shield' },
                { type: 'item', item: 'Mace' },
                { type: 'item', item: 'Holy symbol' },
                { type: 'item', item: "Priest's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 7 },
              ],
            },
            { id: 'gold', name: '110 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 110 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_3_4_5),
      tableGrants('spellsPrepared', FULL_PREPARED),
      [
        {
          level: 2,
          effects: [
            feature('Channel Divinity', 'You can channel divine energy directly. You always have Divine Spark (a Magic action to heal or harm with radiant or necrotic energy) and Turn Undead. Uses grow to three at 6th level and four at 18th.', '{stat.channelDivinity}/short rest', 'action'),
            { type: 'resource', name: 'Channel Divinity', formula: 'stat.channelDivinity' },
          ],
        },
        { level: 3, choices: [subclassChoice('cleric', 'Divine Domain')] },
        { level: 5, effects: [feature('Sear Undead', 'When you use Turn Undead, you also deal radiant damage to each affected creature: a number of d8s equal to your Wisdom modifier.', undefined, 'free')] },
        {
          level: 7,
          effects: [feature('Blessed Strikes', 'Choose Divine Strike (extra 1d8 damage once per turn on a weapon hit) or Potent Spellcasting (add your Wisdom modifier to Cleric cantrip damage).', undefined, 'free')],
        },
        { level: 10, effects: [feature('Divine Intervention', 'As a Magic action, call for aid: you can cast any Cleric spell of 5th level or lower without expending a spell slot or components.', '1/long rest', 'action')] },
        { level: 14, effects: [feature('Improved Blessed Strikes', 'Your Blessed Strikes option improves — Divine Strike deals 2d8, and Potent Spellcasting also heals an ally you can see.', undefined, 'free')] },
        { level: 20, effects: [feature('Greater Divine Intervention', 'You can cast Wish with Divine Intervention. Doing so means the feature cannot be used again for 2d4 Long Rests.', undefined, 'action')] },
      ],
      tableGrants('channelDivinity', [0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4]),
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'druid',
    name: 'Druid',
    icon: '🌿',
    summary: 'A shapeshifting nature caster who can be a bear, a swarm of healing, or a wall of thorns.',
    description:
      'Druids draw on the natural world. In 2024 Wild Shape is a Bonus Action and uses published stat blocks, which cuts the single largest source of table delay from the 2014 version.',
    meta: { 'Hit Die': 'd8', Primary: 'Wisdom', Saves: 'INT & WIS', Complexity: 'Complex' },
    tags: ['role-magic', 'role-support', 'complexity-high'],
    atTheTable: 'Prepare from a huge list every morning, and turn into an animal as a bonus action when the fight needs a body in it.',
    effects: [
      setStat('hitDie', 8),
      save('int'),
      save('wis'),
      armor('Light armor (nonmetal)'),
      armor('Shields (nonmetal)'),
      weapon('Simple weapons'),
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
        spellsKnown: 'stat.spellsPrepared',
      },
    ],
    choices: [
      skillChoice(2, ['animal-handling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival']),
      {
        id: 'primal-order',
        prompt: 'Primal Order',
        source: {
          kind: 'options',
          options: [
            {
              id: 'magician',
              name: 'Magician',
              summary: 'An extra cantrip, and sharper nature lore.',
              effects: [feature('Primal Order: Magician', 'You know one extra Druid cantrip, and you add your Wisdom modifier to Arcana and Nature checks.', undefined, 'passive'), { type: 'bonus', stat: 'cantripsKnown', amount: 1 }],
            },
            {
              id: 'warden',
              name: 'Warden',
              summary: 'Martial weapons and medium armour.',
              effects: [armor('Medium armor (nonmetal)'), weapon('Martial weapons'), feature('Primal Order: Warden', 'You gain training with Martial weapons and Medium armor.', undefined, 'passive')],
            },
          ],
        },
      },
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Leather armor, shield, sickle, druidic focus, explorer’s pack and 9 gp',
              effects: [
                { type: 'item', item: 'Leather armor' },
                { type: 'item', item: 'Shield' },
                { type: 'item', item: 'Sickle' },
                { type: 'item', item: 'Druidic focus' },
                { type: 'item', item: "Explorer's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 9 },
              ],
            },
            { id: 'gold', name: '50 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 50 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_2_3_4),
      tableGrants('spellsPrepared', FULL_PREPARED),
      tableGrants('wildShape', [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4]),
      [
        {
          level: 1,
          effects: [feature('Druidic', 'You know Druidic, the secret language of druids, and can use it to leave hidden messages that take a DC 15 Intelligence (Investigation) check to spot.', undefined, 'passive')],
        },
        {
          level: 2,
          effects: [
            feature('Wild Shape', 'As a Bonus Action you assume the form of a Beast you have learned, for a number of hours equal to half your druid level. You keep your mental scores, and revert when the form drops to 0 hit points.', '{stat.wildShape}/long rest', 'bonus'),
            feature('Wild Companion', 'You can expend a Wild Shape use to cast Find Familiar without a spell slot. The familiar is a Fey and lasts a number of hours equal to half your druid level.', undefined, 'action'),
            { type: 'resource', name: 'Wild Shape', formula: 'stat.wildShape' },
          ],
        },
        { level: 3, choices: [subclassChoice('druid', 'Druid Circle')] },
        { level: 5, effects: [feature('Wild Resurgence', 'Once per turn, if you have no Wild Shape uses left, you can expend a spell slot to regain one — or once per Long Rest turn a Wild Shape use into a 1st-level spell slot.', undefined, 'free')] },
        { level: 7, effects: [feature('Elemental Fury', 'Choose Potent Spellcasting (add your Wisdom modifier to Druid cantrip damage) or Primal Strike (once per turn, add 1d8 elemental damage to a weapon or Wild Shape attack).', undefined, 'free')] },
        { level: 15, effects: [feature('Improved Elemental Fury', 'Your Elemental Fury option improves: cantrips gain 300 feet of range, or Primal Strike deals 2d8.', undefined, 'free')] },
        { level: 18, effects: [feature('Beast Spells', 'You can cast spells in Wild Shape, except those with Material components that have a cost or are consumed.', undefined, 'passive')] },
        { level: 20, effects: [feature('Archdruid', 'Your Wild Shape uses are unlimited, you can convert them into spell slots without limit, and you age far more slowly.', undefined, 'passive'), { type: 'note', text: 'At 20th level your Wild Shape uses are unlimited.' }] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'fighter',
    name: 'Fighter',
    icon: '⚔️',
    summary: 'The definitive weapon master — more attacks, more armour, more staying power.',
    description:
      'Fighters are the most flexible martial class and the friendliest to newcomers. In 2024 they master more weapons than anyone else, and Second Wind recharges far faster.',
    meta: { 'Hit Die': 'd10', Primary: 'Strength or Dexterity', Saves: 'STR & CON', Complexity: 'Simple' },
    tags: ['role-melee', 'role-ranged', 'complexity-low'],
    atTheTable: 'Attack, attack again, and use Second Wind when you get low. The friendliest first character in the game.',
    effects: [setStat('hitDie', 10), save('str'), save('con'), armor('All armor'), armor('Shields'), ...SIMPLE_AND_MARTIAL],
    choices: [
      skillChoice(2, ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'persuasion', 'survival']),
      { id: 'fighting-style', prompt: 'Fighting Style', source: { kind: 'collection', collection: 'fighting-styles' } },
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'melee',
              name: 'Chain mail, greatsword, two handaxes, a dungeoneer’s pack and 4 gp',
              effects: [
                { type: 'item', item: 'Chain mail' },
                { type: 'item', item: 'Greatsword' },
                { type: 'item', item: 'Handaxe', quantity: 2 },
                { type: 'item', item: "Dungeoneer's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 4 },
              ],
            },
            {
              id: 'ranged',
              name: 'Studded leather, scimitar, shortsword, longbow, 20 arrows and 11 gp',
              effects: [
                { type: 'item', item: 'Studded leather armor' },
                { type: 'item', item: 'Scimitar' },
                { type: 'item', item: 'Shortsword' },
                { type: 'item', item: 'Longbow' },
                { type: 'item', item: 'Arrows', quantity: 20 },
                { type: 'item', item: 'Gold pieces', quantity: 11 },
              ],
            },
            { id: 'gold', name: '155 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 155 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      [
        {
          level: 1,
          effects: [
            feature('Second Wind', 'As a Bonus Action, regain 1d10 plus your fighter level in hit points. You regain one use on a Short Rest and all of them on a Long Rest. Uses grow to three at 4th level and four at 10th.', '{stat.secondWind}/long rest', 'bonus'),
            { type: 'resource', name: 'Second Wind', formula: 'stat.secondWind' },
          ],
        },
        {
          level: 2,
          effects: [
            feature('Action Surge', 'On your turn you can take one additional action. You gain a second use at 17th level.', '1/short rest', 'free'),
            feature('Tactical Mind', 'When you fail an ability check, you can expend a use of Second Wind to add 1d10 to it. If it still fails, the use is not spent.', undefined, 'free'),
          ],
        },
        { level: 3, choices: [subclassChoice('fighter', 'Martial Archetype')] },
        {
          level: 5,
          effects: [
            feature('Extra Attack', 'Attack twice when you take the Attack action — three times at 11th level and four times at 20th.', undefined, 'free'),
            feature('Tactical Shift', 'Whenever you activate Second Wind, you can move up to half your Speed without provoking Opportunity Attacks.', undefined, 'free'),
          ],
        },
        {
          level: 9,
          effects: [
            feature('Indomitable', 'Reroll a saving throw you failed, adding your fighter level to the new roll. You gain more uses at 13th and 17th level.', '1/long rest', 'free'),
            feature('Tactical Master', 'When you attack with a weapon whose mastery you have, you can replace that property with Push, Sap or Slow for that attack.', undefined, 'free'),
          ],
        },
        { level: 13, effects: [feature('Studied Attacks', 'If you miss a creature with an attack roll, you have advantage on your next attack roll against it before the end of your next turn.', undefined, 'free')] },
      ],
      tableGrants('secondWind', [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
      [masteryChoice(1, 3), masteryChoice(4, 4), masteryChoice(10, 5), masteryChoice(16, 6)],
      [4, 6, 8, 12, 14, 16].map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'monk',
    name: 'Monk',
    icon: '👊',
    summary: 'A fast, unarmoured martial artist who fights with a flurry of strikes.',
    description:
      'Monks trade armour for speed and a pool of Focus. The 2024 version is markedly stronger: Focus recharges on a Short Rest from 2nd level, and Deflect Attacks works on almost anything.',
    meta: { 'Hit Die': 'd8', Primary: 'Dexterity & Wisdom', Saves: 'STR & DEX', Complexity: 'Moderate' },
    tags: ['role-melee', 'complexity-medium'],
    atTheTable: 'Attack, then spend a Focus point on a flurry of extra strikes, a dodge, or a long dash. Very mobile, very busy.',
    effects: [
      setStat('hitDie', 8),
      save('str'),
      save('dex'),
      weapon('Simple weapons'),
      weapon('Martial weapons with the Light property'),
      feature('Unarmored Defense', 'While you wear no armor and hold no Shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.', undefined, 'passive'),
      setStat('unarmoredDefenseWis', 1),
    ],
    choices: [
      skillChoice(2, ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth']),
      {
        id: 'tool',
        prompt: 'Artisan’s tools or a musical instrument',
        source: {
          kind: 'proficiencies',
          category: 'tool',
          from: ["Alchemist's supplies", "Calligrapher's supplies", "Carpenter's tools", "Cook's utensils", 'Flute', 'Lute', 'Lyre', "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools"],
        },
      },
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Spear, five daggers, artisan’s tools, an explorer’s pack and 11 gp',
              effects: [
                { type: 'item', item: 'Spear' },
                { type: 'item', item: 'Dagger', quantity: 5 },
                { type: 'item', item: "Explorer's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 11 },
              ],
            },
            { id: 'gold', name: '50 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 50 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('martialArts', [6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 12, 12, 12, 12]),
      tableGrants('monkSpeed', [0, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20, 20, 20, 25, 25, 25, 30, 30, 30]),
      [
        {
          level: 1,
          effects: [
            feature('Martial Arts', 'Your Unarmed Strikes and Monk weapons use Dexterity, deal your Martial Arts die in damage, and let you make one Unarmed Strike as a Bonus Action after attacking.', undefined, 'bonus'),
          ],
        },
        {
          level: 2,
          effects: [
            feature('Monk’s Focus', 'You have Focus Points equal to your monk level, regained on a Short or Long Rest. Spend one for Flurry of Blows (two extra Unarmed Strikes), Patient Defense (Disengage plus Dodge), or Step of the Wind (Disengage plus Dash, and jump twice as far).', 'monk level/short rest', 'bonus'),
            feature('Unarmored Movement', 'While you wear no armor and hold no Shield, your Speed increases. It keeps rising every few levels.', undefined, 'passive'),
            feature('Uncanny Metabolism', 'When you roll Initiative you can regain all your Focus Points and a number of hit points equal to your monk level plus one roll of your Martial Arts die.', '1/long rest', 'free'),
            { type: 'resource', name: 'Focus Points', formula: 'level' },
          ],
        },
        {
          level: 3,
          choices: [subclassChoice('monk', 'Monk Subclass')],
          effects: [feature('Deflect Attacks', 'As a Reaction when you are hit by an attack that deals bludgeoning, piercing or slashing damage, reduce it by 1d10 plus your Dexterity modifier plus your monk level. If that reduces it to 0 you can spend a Focus Point to redirect it.', undefined, 'reaction')],
        },
        { level: 4, effects: [feature('Slow Fall', 'As a Reaction when you fall, reduce the falling damage by five times your monk level.', undefined, 'reaction')] },
        {
          level: 5,
          effects: [
            feature('Extra Attack', 'You can attack twice whenever you take the Attack action.', undefined, 'free'),
            feature('Stunning Strike', 'Once per turn when you hit with a Monk weapon or Unarmed Strike, spend a Focus Point to force a Constitution save. On a failure the target is Stunned until the start of your next turn; on a success its Speed halves and your next attack against it has advantage.', undefined, 'free'),
          ],
        },
        { level: 6, effects: [feature('Empowered Strikes', 'Your Unarmed Strikes can deal force damage instead of bludgeoning, and so count as magical.', undefined, 'passive')] },
        { level: 7, effects: [feature('Evasion', 'When a Dexterity save would deal half damage on a success, you take none instead, and half on a failure.', undefined, 'passive')] },
        { level: 9, effects: [feature('Acrobatic Movement', 'While you wear no armor and hold no Shield, you can move along vertical surfaces and across liquids without falling during the move.', undefined, 'passive')] },
        {
          level: 10,
          effects: [
            feature('Heightened Focus', 'Flurry of Blows gives three attacks, Patient Defense gives temporary hit points, and Step of the Wind carries an ally with you.', undefined, 'passive'),
            feature('Self-Restoration', 'At the end of each of your turns you can end the Charmed, Frightened or Poisoned condition on yourself, and you no longer suffer Exhaustion from going without food or drink.', undefined, 'free'),
          ],
        },
        { level: 13, effects: [feature('Deflect Energy', 'Deflect Attacks now works against damage of any type.', undefined, 'reaction')] },
        { level: 14, effects: [feature('Disciplined Survivor', 'You are proficient in all saving throws, and can spend a Focus Point to reroll a failed one.', undefined, 'free')] },
        { level: 15, effects: [feature('Perfect Focus', 'When you roll Initiative with fewer than 4 Focus Points left, you regain enough to have 4.', undefined, 'free')] },
        { level: 18, effects: [feature('Superior Defense', 'At the start of your turn you can spend 3 Focus Points to gain resistance to all damage except force for 1 minute.', undefined, 'free')] },
        {
          level: 20,
          effects: [
            feature('Body and Mind', 'Your Dexterity and Wisdom scores increase by 4, to a maximum of 25.', undefined, 'passive'),
            { type: 'ability', ability: 'dex', amount: 4 },
            { type: 'ability', ability: 'wis', amount: 4 },
          ],
        },
      ],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'paladin',
    name: 'Paladin',
    icon: '🛡️',
    summary: 'A holy warrior in heavy armour who heals, smites, and makes the whole party harder to kill.',
    description:
      'Paladins swear an oath and get magic for keeping it. In 2024 Divine Smite is a spell you cast, which puts a once-per-turn limit on the old "nova" pattern.',
    meta: { 'Hit Die': 'd10', Primary: 'Strength & Charisma', Saves: 'WIS & CHA', Complexity: 'Moderate' },
    tags: ['role-melee', 'role-support', 'complexity-medium'],
    atTheTable: 'Stand at the front, hit hard, and spend a spell slot on Divine Smite when it matters. Your aura quietly saves everyone nearby.',
    effects: [
      setStat('hitDie', 10),
      save('wis'),
      save('cha'),
      armor('All armor'),
      armor('Shields'),
      ...SIMPLE_AND_MARTIAL,
      {
        type: 'spellcasting',
        id: 'paladin',
        label: 'Paladin Spellcasting',
        ability: 'cha',
        preparation: 'prepared',
        list: 'paladin',
        slots: 'half',
        spellsKnown: 'stat.spellsPrepared',
      },
    ],
    choices: [
      skillChoice(2, ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion']),
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Chain mail, shield, longsword, six javelins, holy symbol, priest’s pack and 9 gp',
              effects: [
                { type: 'item', item: 'Chain mail' },
                { type: 'item', item: 'Shield' },
                { type: 'item', item: 'Longsword' },
                { type: 'item', item: 'Javelin', quantity: 6 },
                { type: 'item', item: 'Holy symbol' },
                { type: 'item', item: "Priest's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 9 },
              ],
            },
            { id: 'gold', name: '150 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 150 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('spellsPrepared', HALF_PREPARED),
      [
        {
          level: 1,
          effects: [
            feature('Lay on Hands', 'You have a pool of healing equal to five times your paladin level. As a Bonus Action you can touch a creature and spend from it, or spend 5 points to end one disease or Poisoned condition.', 'five times your paladin level, in hit points/long rest', 'bonus'),
            { type: 'resource', name: 'Lay on Hands', formula: 'level * 5' },
          ],
        },
        {
          level: 2,
          effects: [
            feature('Paladin’s Smite', 'You always have Divine Smite prepared, and can cast it once per Long Rest without a spell slot.', undefined, 'bonus'),
          ],
          choices: [{ id: 'fighting-style', prompt: 'Fighting Style', source: { kind: 'collection', collection: 'fighting-styles' } }],
        },
        {
          level: 3,
          choices: [subclassChoice('paladin', 'Sacred Oath')],
          effects: [
            feature('Channel Divinity', 'You can channel divine energy. You always have Divine Sense, and your oath grants more. Uses grow to three at 11th level.', '{stat.channelDivinity}/short rest', 'action'),
            { type: 'resource', name: 'Channel Divinity', formula: 'stat.channelDivinity' },
          ],
        },
        {
          level: 5,
          effects: [
            feature('Extra Attack', 'You can attack twice whenever you take the Attack action.', undefined, 'free'),
            feature('Faithful Steed', 'You always have Find Steed prepared and can cast it once per Long Rest without a spell slot.', undefined, 'action'),
          ],
        },
        { level: 6, effects: [feature('Aura of Protection', 'You and allies within 10 feet add your Charisma modifier (minimum +1) to every saving throw. The radius grows to 30 feet at 18th level.', undefined, 'passive')] },
        { level: 9, effects: [feature('Abjure Foes', 'As a Magic action, expend a use of Channel Divinity to frighten a number of creatures up to your Charisma modifier within 60 feet. On a failed Wisdom save they cannot take Reactions and can only Dash on their turn.', undefined, 'action')] },
        { level: 10, effects: [feature('Aura of Courage', 'You and allies in your aura cannot be Frightened, and any such condition is suspended while there.', undefined, 'passive')] },
        { level: 11, effects: [feature('Radiant Strikes', 'Your attacks are charged with divine power: whenever you hit with an Unarmed Strike or a Melee weapon, the target takes an extra 1d8 radiant damage.', undefined, 'free')] },
        { level: 14, effects: [feature('Restoring Touch', 'When you use Lay on Hands you can also end one of the Blinded, Charmed, Deafened, Frightened, Paralyzed or Stunned conditions, spending 5 healing per condition.', undefined, 'bonus')] },
        { level: 18, effects: [feature('Aura Expansion', 'Your Aura of Protection reaches 30 feet.', undefined, 'passive')] },
      ],
      tableGrants('channelDivinity', [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
      [masteryChoice(1, 2)],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    summary: 'A wilderness hunter who tracks a target down and takes it apart.',
    description:
      'Rangers blend martial skill with nature magic. In 2024 Favored Enemy is simply free castings of Hunter’s Mark, which removes the old "I picked the wrong enemy type" trap entirely.',
    meta: { 'Hit Die': 'd10', Primary: 'Dexterity & Wisdom', Saves: 'STR & DEX', Complexity: 'Moderate' },
    tags: ['role-ranged', 'role-melee', 'complexity-medium'],
    atTheTable: 'Mark a target as a bonus action, then hit it repeatedly for extra damage. Outdoors, you are the reason the party is not lost.',
    effects: [
      setStat('hitDie', 10),
      save('str'),
      save('dex'),
      armor('Light armor'),
      armor('Medium armor'),
      armor('Shields'),
      ...SIMPLE_AND_MARTIAL,
      {
        type: 'spellcasting',
        id: 'ranger',
        label: 'Ranger Spellcasting',
        ability: 'wis',
        preparation: 'prepared',
        list: 'ranger',
        slots: 'half',
        spellsKnown: 'stat.spellsPrepared',
      },
    ],
    choices: [
      skillChoice(3, ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival']),
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Studded leather, scimitar, shortsword, longbow, 20 arrows, druidic focus, explorer’s pack and 7 gp',
              effects: [
                { type: 'item', item: 'Studded leather armor' },
                { type: 'item', item: 'Scimitar' },
                { type: 'item', item: 'Shortsword' },
                { type: 'item', item: 'Longbow' },
                { type: 'item', item: 'Arrows', quantity: 20 },
                { type: 'item', item: 'Druidic focus' },
                { type: 'item', item: "Explorer's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 7 },
              ],
            },
            { id: 'gold', name: '150 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 150 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('spellsPrepared', HALF_PREPARED),
      [
        {
          level: 1,
          effects: [
            feature('Favored Enemy', 'You always have Hunter’s Mark prepared and can cast it without a spell slot a number of times per Long Rest that grows with your level.', 'proficiency bonus/long rest', 'bonus'),
          ],
        },
        {
          level: 2,
          effects: [feature('Deft Explorer', 'You gain Expertise in one skill you are proficient in, and you know two more languages.', undefined, 'passive')],
          choices: [
            { id: 'expertise-2', prompt: 'Expertise — one skill you are proficient in', source: { kind: 'skills' } },
            { id: 'fighting-style', prompt: 'Fighting Style', source: { kind: 'collection', collection: 'fighting-styles' } },
          ],
        },
        { level: 3, choices: [subclassChoice('ranger', 'Ranger Archetype')] },
        { level: 5, effects: [feature('Extra Attack', 'You can attack twice whenever you take the Attack action.', undefined, 'free')] },
        { level: 6, effects: [feature('Roving', 'Your Speed increases by 10 feet, and you gain a Climb Speed and a Swim Speed equal to it.', undefined, 'passive'), { type: 'bonus', stat: 'speed', amount: 10 }] },
        {
          level: 9,
          choices: [{ id: 'expertise-9', prompt: 'Expertise — one more skill', source: { kind: 'skills' } }],
        },
        { level: 10, effects: [feature('Tireless', 'As a Magic action you can give yourself temporary hit points equal to 1d8 plus your Wisdom modifier, and finishing a Short Rest removes a level of Exhaustion.', 'proficiency bonus/long rest', 'action')] },
        { level: 13, effects: [feature('Nature’s Veil', 'As a Bonus Action you become Invisible until the end of your next turn.', 'proficiency bonus/long rest', 'bonus')] },
        {
          level: 17,
          effects: [
            feature('Precise Hunter', 'You have advantage on attack rolls against the creature currently marked by your Hunter’s Mark.', undefined, 'passive'),
            feature('Relentless Hunter', 'Taking damage cannot break your Concentration on Hunter’s Mark.', undefined, 'passive'),
          ],
        },
        { level: 20, effects: [feature('Foe Slayer', 'Your Hunter’s Mark damage die becomes a d10 instead of a d6.', undefined, 'free')] },
      ],
      [masteryChoice(1, 2)],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'rogue',
    name: 'Rogue',
    icon: '🗡️',
    summary: 'A precise, evasive specialist who deals enormous damage from exactly the right position.',
    description:
      'Rogues turn positioning into damage. In 2024 Cunning Strike lets you trade Sneak Attack dice for poison, blinding or a knockdown, which finally gives the class something to decide each round.',
    meta: { 'Hit Die': 'd8', Primary: 'Dexterity', Saves: 'DEX & INT', Complexity: 'Moderate' },
    tags: ['role-melee', 'role-ranged', 'role-social', 'complexity-medium'],
    atTheTable: 'Get advantage or stand next to an ally, then land one very large hit. Hide or dash as a bonus action, every single turn.',
    effects: [
      setStat('hitDie', 8),
      save('dex'),
      save('int'),
      armor('Light armor'),
      weapon('Simple weapons'),
      weapon('Martial weapons with the Finesse or Light property'),
      { type: 'proficiency', category: 'tool', value: "Thieves' tools" },
    ],
    choices: [
      skillChoice(4, ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight-of-hand', 'stealth']),
      { id: 'expertise-1', prompt: 'Expertise — two skills you are proficient in', count: 2, source: { kind: 'skills' } },
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Leather armor, two daggers, shortsword, shortbow, 20 arrows, thieves’ tools, burglar’s pack and 8 gp',
              effects: [
                { type: 'item', item: 'Leather armor' },
                { type: 'item', item: 'Dagger', quantity: 2 },
                { type: 'item', item: 'Shortsword' },
                { type: 'item', item: 'Shortbow' },
                { type: 'item', item: 'Arrows', quantity: 20 },
                { type: 'item', item: "Thieves' tools" },
                { type: 'item', item: "Burglar's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 8 },
              ],
            },
            { id: 'gold', name: '100 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 100 }] },
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
            feature('Sneak Attack', 'Once per turn, when you hit with a Finesse or Ranged weapon and either have advantage or an ally is next to the target, deal extra damage. The dice are shown on your sheet.', undefined, 'free'),
            feature('Thieves’ Cant', 'You know a secret mix of dialect, jargon and code, and one more language of your choice.', undefined, 'passive'),
          ],
        },
        {
          level: 2,
          effects: [feature('Cunning Action', 'As a Bonus Action you can Dash, Disengage or Hide.', undefined, 'bonus')],
        },
        {
          level: 3,
          choices: [subclassChoice('rogue', 'Roguish Archetype')],
          effects: [feature('Steady Aim', 'As a Bonus Action you gain advantage on your next attack this turn, at the cost of your Speed dropping to 0 until the end of the turn.', undefined, 'bonus')],
        },
        {
          level: 5,
          effects: [
            feature('Cunning Strike', 'When you deal Sneak Attack damage you can forgo dice to add an effect: Poison (1 die), Trip (1 die), or Withdraw (1 die) to move without provoking.', undefined, 'free'),
            feature('Uncanny Dodge', 'As a Reaction when an attacker you can see hits you, halve the damage.', undefined, 'reaction'),
          ],
        },
        {
          level: 7,
          effects: [
            feature('Evasion', 'When a Dexterity save would deal half damage on a success, you take none instead, and half on a failure.', undefined, 'passive'),
            feature('Reliable Talent', 'Whenever you make an ability check that uses a skill or tool you have Expertise in, treat a d20 roll of 9 or lower as a 10.', undefined, 'passive'),
          ],
        },
        {
          level: 9,
          choices: [{ id: 'expertise-9', prompt: 'Expertise — two more skills', count: 2, source: { kind: 'skills' } }],
        },
        { level: 11, effects: [feature('Improved Cunning Strike', 'You can use two Cunning Strike effects on the same Sneak Attack.', undefined, 'free')] },
        { level: 14, effects: [feature('Devious Strikes', 'Cunning Strike gains three more options: Daze (2 dice), Knock Out (6 dice) and Obscure (3 dice, Blinded).', undefined, 'free')] },
        { level: 15, effects: [feature('Slippery Mind', 'You gain proficiency in Wisdom and Charisma saving throws.', undefined, 'passive'), { type: 'proficiency', category: 'save', value: 'wis' }, { type: 'proficiency', category: 'save', value: 'cha' }] },
        { level: 18, effects: [feature('Elusive', 'No attack roll has advantage against you unless you are Incapacitated.', undefined, 'passive')] },
        { level: 20, effects: [feature('Stroke of Luck', 'You can turn a missed attack into a hit, or a failed ability check into a 20.', '1/short rest', 'free')] },
      ],
      [masteryChoice(1, 2)],
      [4, 8, 10, 12, 16].map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    icon: '🔥',
    summary: 'A born spellcaster who bends their own magic into new shapes.',
    description:
      'Sorcerers have magic in the blood. The 2024 version leans much harder on Metamagic, and adds Innate Sorcery, a minute-long burst that makes your spells harder to resist.',
    meta: { 'Hit Die': 'd6', Primary: 'Charisma', Saves: 'CON & CHA', Complexity: 'Complex' },
    tags: ['role-magic', 'complexity-high'],
    atTheTable: 'Cast, and reshape the spell as you cast it — twin it, quicken it, or make it silent. Fewer spells than a wizard, used better.',
    effects: [
      setStat('hitDie', 6),
      save('con'),
      save('cha'),
      weapon('Simple weapons'),
      {
        type: 'spellcasting',
        id: 'sorcerer',
        label: 'Sorcerer Spellcasting',
        ability: 'cha',
        preparation: 'prepared',
        list: 'sorcerer',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'stat.spellsPrepared',
      },
    ],
    choices: [
      skillChoice(2, ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion']),
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Spear, two daggers, arcane focus, dungeoneer’s pack and 28 gp',
              effects: [
                { type: 'item', item: 'Spear' },
                { type: 'item', item: 'Dagger', quantity: 2 },
                { type: 'item', item: 'Arcane focus' },
                { type: 'item', item: "Dungeoneer's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 28 },
              ],
            },
            { id: 'gold', name: '50 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 50 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_4_5_6),
      tableGrants('spellsPrepared', SORCERER_PREPARED),
      [
        {
          level: 1,
          effects: [
            feature('Innate Sorcery', 'As a Bonus Action you unleash your magic for 1 minute: your spell save DC increases by 1, and you have advantage on attack rolls for the spells you cast.', '2/long rest', 'bonus'),
          ],
        },
        {
          level: 2,
          effects: [
            feature('Font of Magic', 'You have Sorcery Points equal to your sorcerer level. As a Bonus Action you can convert them into spell slots, or spell slots back into points.', 'sorcerer level/long rest', 'bonus'),
            { type: 'resource', name: 'Sorcery Points', formula: 'level' },
          ],
          choices: [{ id: 'metamagic-2', prompt: 'Two Metamagic options', count: 2, source: { kind: 'collection', collection: 'metamagic' } }],
        },
        { level: 3, choices: [subclassChoice('sorcerer', 'Sorcerous Origin')] },
        {
          level: 5,
          effects: [feature('Sorcerous Restoration', 'When you finish a Short Rest, you can regain Sorcery Points equal to half your sorcerer level.', '1/long rest', 'free')],
        },
        {
          level: 7,
          effects: [feature('Sorcery Incarnate', 'While Innate Sorcery is active you can use two Metamagic options on a single spell, and if you have no uses left you can spend 2 Sorcery Points to activate it.', undefined, 'free')],
          choices: [{ id: 'metamagic-7', prompt: 'Two more Metamagic options', count: 2, source: { kind: 'collection', collection: 'metamagic' } }],
        },
        {
          level: 10,
          choices: [{ id: 'metamagic-10', prompt: 'Two more Metamagic options', count: 2, source: { kind: 'collection', collection: 'metamagic' } }],
        },
        {
          level: 17,
          choices: [{ id: 'metamagic-17', prompt: 'Two more Metamagic options', count: 2, source: { kind: 'collection', collection: 'metamagic' } }],
        },
        { level: 20, effects: [feature('Arcane Apotheosis', 'While Innate Sorcery is active, one Metamagic option you use on each of your turns costs no Sorcery Points.', undefined, 'free')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'warlock',
    name: 'Warlock',
    icon: '👁️',
    summary: 'A pact-bound caster with few slots, all of them cast at the highest level you have.',
    description:
      'Warlocks trade quantity for quality: a handful of spell slots that always cast at your best level and return on a Short Rest, plus invocations that reshape the class entirely.',
    meta: { 'Hit Die': 'd8', Primary: 'Charisma', Saves: 'WIS & CHA', Complexity: 'Complex' },
    tags: ['role-magic', 'role-social', 'complexity-high'],
    atTheTable: 'Spam Eldritch Blast, spend your two slots on your best spells, and get them back after a short rest.',
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
        preparation: 'prepared',
        list: 'warlock',
        slots: 'warlock',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'stat.spellsPrepared',
      },
    ],
    choices: [
      skillChoice(2, ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion']),
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Leather armor, sickle, two daggers, arcane focus, book of lore, scholar’s pack and 15 gp',
              effects: [
                { type: 'item', item: 'Leather armor' },
                { type: 'item', item: 'Sickle' },
                { type: 'item', item: 'Dagger', quantity: 2 },
                { type: 'item', item: 'Arcane focus' },
                { type: 'item', item: "Scholar's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 15 },
              ],
            },
            { id: 'gold', name: '100 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 100 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_2_3_4),
      tableGrants('spellsPrepared', WARLOCK_PREPARED),
      [
        {
          level: 1,
          choices: [{ id: 'invocations-1', prompt: 'Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }],
        },
        {
          level: 2,
          effects: [feature('Magical Cunning', 'You can perform a 1-minute rite to regain expended Pact Magic spell slots, up to a number equal to half your maximum.', '1/long rest', 'free')],
          choices: [{ id: 'invocations-2', prompt: 'A second Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }],
        },
        { level: 3, choices: [subclassChoice('warlock', 'Otherworldly Patron')] },
        { level: 5, choices: [{ id: 'invocations-5', prompt: 'A third Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }] },
        { level: 7, choices: [{ id: 'invocations-7', prompt: 'A fourth Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }] },
        { level: 9, choices: [{ id: 'invocations-9', prompt: 'A fifth Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }] },
        { level: 11, effects: [feature('Mystic Arcanum (6th level)', 'Choose one 6th-level spell from the Warlock list. You can cast it once without a spell slot, regaining the use on a Long Rest.', '1/long rest', 'action')] },
        { level: 12, choices: [{ id: 'invocations-12', prompt: 'A sixth Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }] },
        { level: 13, effects: [feature('Mystic Arcanum (7th level)', 'As Mystic Arcanum, but a 7th-level Warlock spell.', '1/long rest', 'action')] },
        { level: 15, effects: [feature('Mystic Arcanum (8th level)', 'As Mystic Arcanum, but an 8th-level Warlock spell.', '1/long rest', 'action')] },
        { level: 15, choices: [{ id: 'invocations-15', prompt: 'A seventh Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }] },
        { level: 17, effects: [feature('Mystic Arcanum (9th level)', 'As Mystic Arcanum, but a 9th-level Warlock spell.', '1/long rest', 'action')] },
        { level: 18, choices: [{ id: 'invocations-18', prompt: 'An eighth Eldritch Invocation', source: { kind: 'collection', collection: 'invocations' } }] },
        { level: 20, effects: [feature('Eldritch Master', 'You can take 1 minute to regain all your expended Pact Magic spell slots.', '1/long rest', 'free')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },

  // -------------------------------------------------------------------------
  {
    id: 'wizard',
    name: 'Wizard',
    icon: '📖',
    summary: 'The widest spell list in the game, learned from a book you keep adding to.',
    description:
      'Wizards study magic and write it down. In 2024 they can swap one prepared spell as a Magic action, so preparing the wrong list in the morning is no longer a wasted day.',
    meta: { 'Hit Die': 'd6', Primary: 'Intelligence', Saves: 'INT & WIS', Complexity: 'Complex' },
    tags: ['role-magic', 'complexity-high'],
    atTheTable: 'Prepare a list every morning from an ever-growing spellbook, and have exactly the right answer roughly once a day.',
    effects: [
      setStat('hitDie', 6),
      save('int'),
      save('wis'),
      weapon('Simple weapons'),
      { type: 'item', item: 'Spellbook' },
      {
        type: 'spellcasting',
        id: 'wizard',
        label: 'Wizard Spellcasting',
        ability: 'int',
        preparation: 'prepared',
        list: 'wizard',
        slots: 'full',
        cantripsKnown: 'stat.cantripsKnown',
        spellsKnown: 'stat.spellsPrepared',
      },
    ],
    choices: [
      skillChoice(2, ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion']),
      {
        id: 'equipment',
        prompt: 'Starting equipment',
        source: {
          kind: 'options',
          options: [
            {
              id: 'kit',
              name: 'Two daggers, arcane focus, robe, spellbook, scholar’s pack and 5 gp',
              effects: [
                { type: 'item', item: 'Dagger', quantity: 2 },
                { type: 'item', item: 'Arcane focus' },
                { type: 'item', item: 'Robes' },
                { type: 'item', item: "Scholar's pack" },
                { type: 'item', item: 'Gold pieces', quantity: 5 },
              ],
            },
            { id: 'gold', name: '55 gp to spend yourself', effects: [{ type: 'item', item: 'Gold pieces', quantity: 55 }] },
          ],
        },
      },
    ],
    levels: mergeGrants(
      tableGrants('cantripsKnown', CANTRIPS_3_4_5),
      tableGrants('spellsPrepared', FULL_PREPARED),
      [
        {
          level: 1,
          effects: [
            feature('Ritual Adept', 'You can cast any spell in your spellbook that has the Ritual tag as a ritual, without preparing it.', undefined, 'passive'),
            feature('Arcane Recovery', 'When you finish a Short Rest you can recover expended spell slots totalling half your wizard level, rounded up, none of them above 5th level.', '1/long rest', 'free'),
          ],
        },
        { level: 2, effects: [feature('Scholar', 'Choose Arcana, History, Investigation, Medicine, Nature or Religion. You gain Expertise in it.', undefined, 'passive')] },
        { level: 3, choices: [subclassChoice('wizard', 'Arcane Tradition')] },
        { level: 5, effects: [feature('Memorize Spell', 'Whenever you finish a Short Rest you can study your spellbook and replace one prepared wizard spell with another from the book.', undefined, 'free')] },
        { level: 18, effects: [feature('Spell Mastery', 'Choose a 1st-level and a 2nd-level wizard spell in your spellbook. You can cast them at their lowest level without expending a spell slot.', undefined, 'passive')] },
        { level: 20, effects: [feature('Signature Spells', 'Choose two 3rd-level wizard spells. They are always prepared, and you can cast each once at 3rd level without a spell slot per Short Rest.', undefined, 'passive')] },
      ],
      STANDARD_ASI_LEVELS.map(asi),
      [EPIC_BOON],
    ),
  },
]

export const classes: Collection = {
  id: 'classes',
  label: 'Classes',
  singular: 'Class',
  entries,
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
