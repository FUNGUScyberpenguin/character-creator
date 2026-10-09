import type { Collection, Effect, Entry } from '../../engine/types'

/**
 * Species, backgrounds and origin feats from SRD 5.2 (the 2024 rules).
 *
 * The headline structural change from 2014: **species grant no ability score
 * increases**. Those come from your background, along with an origin feat. That
 * single change is why this cannot be expressed as a patch over the 5.1
 * ruleset, and why it is a separate module.
 *
 * Everything here is transcribed from SRD 5.2 rather than from the Player's
 * Handbook. The SRD is a deliberately small slice of the game: nine species,
 * **four** backgrounds and **four** Origin feats, where the Player's Handbook
 * has many more. Content that is not in the SRD is not here, because it is not
 * ours to reproduce.
 */

const feature = (name: string, description: string, uses?: string, action?: string): Effect => ({
  type: 'feature',
  name,
  description,
  ...(uses ? { uses } : {}),
  ...(action ? { action } : {}),
})

const skill = (value: string): Effect => ({ type: 'proficiency', category: 'skill', value })
const tool = (value: string): Effect => ({ type: 'proficiency', category: 'tool', value })
const setStat = (stat: string, value: number | string): Effect => ({ type: 'set', stat, value })
const item = (name: string, quantity = 1): Effect => ({ type: 'item', item: name, quantity })

const size = (value: string): Effect => setStat('size', value)
const speed = (feet: number): Effect => setStat('speed', feet)
const darkvision = (range: number): Effect => setStat('darkvision', range)

/** Medium or Small, which two species leave to the player. */
const sizeChoice: NonNullable<Entry['choices']>[number] = {
  id: 'size',
  prompt: 'Your size',
  source: {
    kind: 'options',
    options: [
      { id: 'medium', name: 'Medium', effects: [size('Medium')] },
      { id: 'small', name: 'Small', effects: [size('Small')] },
    ],
  },
}

// ---------------------------------------------------------------------------
// Species — the nine in SRD 5.2
// ---------------------------------------------------------------------------

const speciesEntries: Entry[] = [
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    icon: '🐉',
    summary: 'Draconic ancestry, a breath weapon, and eventually wings.',
    atTheTable: 'Breathe destruction over a line or cone instead of one attack, and from 5th level sprout wings to get above the fight.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(60),
      feature(
        'Breath Weapon',
        'When you take the Attack action you can replace one attack with an exhalation in a 15-foot Cone or a 30-foot Line. Each creature there makes a Dexterity save (DC 8 + your Constitution modifier + your proficiency bonus), taking 1d10 damage of your ancestry’s type, or half as much on a success. The damage rises at character levels 5 (2d10), 11 (3d10) and 17 (4d10).',
        'proficiency bonus/long rest',
        'action',
      ),
      feature('Draconic Flight', 'From character level 5, as a Bonus Action you sprout spectral wings for 10 minutes, gaining a Fly Speed equal to your Speed.', '1/long rest', 'bonus'),
    ],
    choices: [
      {
        id: 'ancestry',
        prompt: 'Draconic ancestry',
        descriptor: true,
        source: {
          kind: 'options',
          options: [
            ['black', 'Black', 'Acid'],
            ['blue', 'Blue', 'Lightning'],
            ['brass', 'Brass', 'Fire'],
            ['bronze', 'Bronze', 'Lightning'],
            ['copper', 'Copper', 'Acid'],
            ['gold', 'Gold', 'Fire'],
            ['green', 'Green', 'Poison'],
            ['red', 'Red', 'Fire'],
            ['silver', 'Silver', 'Cold'],
            ['white', 'White', 'Cold'],
          ].map(([id, name, damage]) => ({
            id: id!,
            name: `${name} Dragon`,
            summary: `${damage} damage`,
            effects: [
              feature('Damage Resistance', `You have Resistance to ${damage!.toLowerCase()} damage, and your Breath Weapon deals it.`, undefined, 'passive'),
              setStat('breathDamage', damage!),
            ],
          })),
        },
      },
    ],
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    icon: '⛏️',
    summary: 'Tough, poison-resistant, and able to feel through stone.',
    atTheTable: 'You take an extra hit point every level, shrug off poison, and can sense everything moving on the stone around you.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '120 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(120),
      feature('Dwarven Resilience', 'You have Resistance to poison damage, and advantage on saving throws to avoid or end the Poisoned condition.', undefined, 'passive'),
      feature('Dwarven Toughness', 'Your hit point maximum increases by 1, and by 1 again whenever you gain a level.', undefined, 'passive'),
      feature('Stonecunning', 'As a Bonus Action, gain Tremorsense out to 60 feet for 10 minutes, so long as you are on or touching a stone surface.', 'proficiency bonus/long rest', 'bonus'),
      { type: 'bonus', stat: 'hpPerLevel', amount: 1 },
    ],
  },
  {
    id: 'elf',
    name: 'Elf',
    icon: '🏹',
    summary: 'Fey-blooded, keen-sensed, and carrying a lineage’s magic.',
    atTheTable: 'You get a cantrip now and two more spells as you level, you rest in four hours, and charm effects slide off you.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(60),
      feature('Fey Ancestry', 'You have advantage on saving throws to avoid or end the Charmed condition.', undefined, 'passive'),
      feature('Trance', 'You do not need to sleep and magic cannot put you to sleep. You can finish a Long Rest in 4 hours of trancelike meditation, staying conscious throughout.', undefined, 'passive'),
    ],
    choices: [
      { id: 'lineage', prompt: 'Elven lineage', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'elf' } },
      { id: 'keen-senses', prompt: 'Keen Senses — one skill', source: { kind: 'skills', from: ['insight', 'perception', 'survival'] } },
    ],
  },
  {
    id: 'gnome',
    name: 'Gnome',
    icon: '🔧',
    summary: 'Small, magically slippery, and quietly inventive.',
    atTheTable: 'Advantage on the three mental saving throws that usually end a character, plus a cantrip or two from your lineage.',
    meta: { Speed: '30 ft.', Size: 'Small', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      size('Small'),
      darkvision(60),
      feature('Gnomish Cunning', 'You have advantage on Intelligence, Wisdom and Charisma saving throws.', undefined, 'passive'),
    ],
    choices: [{ id: 'lineage', prompt: 'Gnomish lineage', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'gnome' } }],
  },
  {
    id: 'goliath',
    name: 'Goliath',
    icon: '🗻',
    summary: 'Giant-blooded: fast, strong, and briefly enormous.',
    atTheTable: 'A giant’s boon you can use a few times a rest, and from 5th level you can become Large for ten minutes.',
    meta: { Speed: '35 ft.', Size: 'Medium' },
    effects: [
      speed(35),
      size('Medium'),
      feature('Large Form', 'From character level 5, as a Bonus Action you can become Large for 10 minutes if there is room, gaining advantage on Strength checks and 10 more feet of Speed.', '1/long rest', 'bonus'),
      feature('Powerful Build', 'You have advantage on ability checks to end the Grappled condition, and count as one size larger for carrying capacity.', undefined, 'passive'),
    ],
    choices: [{ id: 'ancestry', prompt: 'Giant ancestry', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'goliath' } }],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    icon: '🍀',
    summary: 'Small, brave, lucky, and very hard to see.',
    atTheTable: 'Reroll every natural 1, hide behind anything bigger than you, and never stay frightened for long.',
    meta: { Speed: '30 ft.', Size: 'Small' },
    effects: [
      speed(30),
      size('Small'),
      feature('Brave', 'You have advantage on saving throws to avoid or end the Frightened condition.', undefined, 'passive'),
      feature('Halfling Nimbleness', 'You can move through the space of any creature a size larger than you, though you cannot stop there.', undefined, 'passive'),
      feature('Luck', 'When you roll a 1 on the d20 of a D20 Test, you can reroll the die and must use the new roll.', undefined, 'free'),
      feature('Naturally Stealthy', 'You can take the Hide action even when obscured only by a creature at least one size larger than you.', undefined, 'free'),
    ],
  },
  {
    id: 'human',
    name: 'Human',
    icon: '🧍',
    summary: 'An extra feat, an extra skill, and inspiration every morning.',
    atTheTable: 'The most flexible start in the game: you pick an Origin feat at level 1 that nobody else gets.',
    meta: { Speed: '30 ft.', Size: 'Medium or Small' },
    effects: [
      speed(30),
      feature('Resourceful', 'You gain Heroic Inspiration whenever you finish a Long Rest.', undefined, 'passive'),
      feature('Skillful', 'You gain proficiency in one skill of your choice.', undefined, 'passive'),
      feature('Versatile', 'You gain an Origin feat of your choice. Skilled is the recommended pick.', undefined, 'passive'),
    ],
    choices: [
      sizeChoice,
      { id: 'skillful', prompt: 'Skillful — one skill', source: { kind: 'skills' } },
      { id: 'versatile', prompt: 'Versatile — an Origin feat', source: { kind: 'collection', collection: 'feats', tag: 'origin' } },
    ],
  },
  {
    id: 'orc',
    name: 'Orc',
    icon: '🪓',
    summary: 'Relentless: you sprint for free, and you refuse to go down.',
    atTheTable: 'Dash as a bonus action for temporary hit points, and the first time you would drop, you do not.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '120 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(120),
      feature('Adrenaline Rush', 'You can take the Dash action as a Bonus Action, gaining temporary hit points equal to your proficiency bonus when you do.', 'proficiency bonus/short rest', 'bonus'),
      feature('Relentless Endurance', 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead.', '1/long rest', 'free'),
    ],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    icon: '😈',
    summary: 'A fiendish legacy: a resistance, a cantrip, and two spells as you grow.',
    atTheTable: 'Pick which plane your blood answers to, and get free castings of its spells every long rest.',
    meta: { Speed: '30 ft.', Size: 'Medium or Small', Darkvision: '60 ft.' },
    effects: [speed(30), darkvision(60)],
    choices: [
      sizeChoice,
      { id: 'legacy', prompt: 'Fiendish legacy', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'tiefling' } },
    ],
  },
]

export const species: Collection = {
  id: 'species',
  label: 'Species',
  singular: 'Species',
  entries: speciesEntries,
}

// ---------------------------------------------------------------------------
// Lineages — the sub-choices four species make
// ---------------------------------------------------------------------------

const lineage = (id: string, name: string, tag: string, summary: string, effects: Effect[]): Entry => ({
  id,
  name,
  tags: [tag],
  summary,
  effects,
})

export const lineages: Collection = {
  id: 'lineages',
  label: 'Lineages',
  singular: 'Lineage',
  entries: [
    lineage('drow', 'Drow', 'elf', 'Darkvision out to 120 feet, and Dancing Lights into Faerie Fire and Darkness.', [
      setStat('darkvision', 120),
      feature('Drow Lineage', 'Your Darkvision extends to 120 feet, and you know the Dancing Lights cantrip. At character level 3 you always have Faerie Fire prepared, and at level 5 Darkness — each castable once per Long Rest without a slot.', undefined, 'passive'),
    ]),
    lineage('high-elf', 'High Elf', 'elf', 'Prestidigitation, swappable for any wizard cantrip, then Detect Magic and Misty Step.', [
      feature('High Elf Lineage', 'You know the Prestidigitation cantrip, and can replace it with a different Wizard cantrip whenever you finish a Long Rest. At character level 3 you always have Detect Magic prepared, and at level 5 Misty Step — each castable once per Long Rest without a slot.', undefined, 'passive'),
    ]),
    lineage('wood-elf', 'Wood Elf', 'elf', 'Speed 35, Druidcraft, then Longstrider and Pass without Trace.', [
      setStat('speed', 35),
      feature('Wood Elf Lineage', 'Your Speed increases to 35 feet, and you know the Druidcraft cantrip. At character level 3 you always have Longstrider prepared, and at level 5 Pass without Trace — each castable once per Long Rest without a slot.', undefined, 'passive'),
    ]),

    lineage('forest-gnome', 'Forest Gnome', 'gnome', 'Minor Illusion, and you can talk to small animals.', [
      feature('Forest Gnome Lineage', 'You know the Minor Illusion cantrip, and always have Speak with Animals prepared. You can cast it without a spell slot a number of times equal to your proficiency bonus per Long Rest.', undefined, 'passive'),
    ]),
    lineage('rock-gnome', 'Rock Gnome', 'gnome', 'Mending and Prestidigitation, plus tiny clockwork devices.', [
      feature('Rock Gnome Lineage', 'You know the Mending and Prestidigitation cantrips. You can also spend 10 minutes casting Prestidigitation to build a Tiny clockwork device (AC 5, 1 HP) that reproduces one of that spell’s effects when someone activates it with a touch. You can have three in existence at a time.', undefined, 'passive'),
    ]),

    lineage('cloud-giant', 'Cloud’s Jaunt', 'goliath', 'Teleport 30 feet as a bonus action.', [
      feature('Cloud’s Jaunt', 'As a Bonus Action, magically teleport up to 30 feet to an unoccupied space you can see.', 'proficiency bonus/long rest', 'bonus'),
    ]),
    lineage('fire-giant', 'Fire’s Burn', 'goliath', 'Extra fire damage when you hit.', [
      feature('Fire’s Burn', 'When you hit a target with an attack roll and damage it, you can also deal 1d10 fire damage to it.', 'proficiency bonus/long rest', 'free'),
    ]),
    lineage('frost-giant', 'Frost’s Chill', 'goliath', 'Extra cold damage, and it slows them.', [
      feature('Frost’s Chill', 'When you hit a target with an attack roll and damage it, you can also deal 1d6 cold damage and reduce its Speed by 10 feet until the start of your next turn.', 'proficiency bonus/long rest', 'free'),
    ]),
    lineage('hill-giant', 'Hill’s Tumble', 'goliath', 'Knock a Large or smaller target prone.', [
      feature('Hill’s Tumble', 'When you hit a Large or smaller creature with an attack roll and damage it, you can give it the Prone condition.', 'proficiency bonus/long rest', 'free'),
    ]),
    lineage('stone-giant', 'Stone’s Endurance', 'goliath', 'Reduce damage taken as a reaction.', [
      feature('Stone’s Endurance', 'As a Reaction when you take damage, roll 1d12 and reduce the damage by that roll plus your Constitution modifier.', 'proficiency bonus/long rest', 'reaction'),
    ]),
    lineage('storm-giant', 'Storm’s Thunder', 'goliath', 'Answer a hit with thunder damage.', [
      feature('Storm’s Thunder', 'As a Reaction when you take damage from a creature within 60 feet, deal 1d8 thunder damage to it.', 'proficiency bonus/long rest', 'reaction'),
    ]),

    lineage('abyssal', 'Abyssal Legacy', 'tiefling', 'Poison resistance and Poison Spray, then Ray of Sickness and Hold Person.', [
      feature('Abyssal Legacy', 'You have Resistance to poison damage and know the Poison Spray cantrip. At character level 3 you always have Ray of Sickness prepared, and at level 5 Hold Person — each castable once per Long Rest without a slot.', undefined, 'passive'),
    ]),
    lineage('chthonic', 'Chthonic Legacy', 'tiefling', 'Necrotic resistance and Chill Touch, then False Life and Ray of Enfeeblement.', [
      feature('Chthonic Legacy', 'You have Resistance to necrotic damage and know the Chill Touch cantrip. At character level 3 you always have False Life prepared, and at level 5 Ray of Enfeeblement — each castable once per Long Rest without a slot.', undefined, 'passive'),
    ]),
    lineage('infernal', 'Infernal Legacy', 'tiefling', 'Fire resistance and Fire Bolt, then Hellish Rebuke and Darkness.', [
      feature('Infernal Legacy', 'You have Resistance to fire damage and know the Fire Bolt cantrip. At character level 3 you always have Hellish Rebuke prepared, and at level 5 Darkness — each castable once per Long Rest without a slot.', undefined, 'passive'),
    ]),
  ],
}

// ---------------------------------------------------------------------------
// Feats
//
// SRD 5.2 publishes four Origin feats and two General feats. The four Fighting
// Style feats live in `features.ts`, next to the classes that grant them, and
// the Epic Boons are there too.
// ---------------------------------------------------------------------------

const feat = (id: string, name: string, tag: string, summary: string, effects: Effect[], choices?: Entry['choices']): Entry => ({
  id,
  name,
  tags: [tag],
  summary,
  effects,
  ...(choices ? { choices } : {}),
})

/** Magic Initiate is one feat with a list choice, not one feat per list. */
const magicInitiateChoice: NonNullable<Entry['choices']>[number] = {
  id: 'list',
  prompt: 'Which spell list?',
  source: {
    kind: 'options',
    options: [
      {
        id: 'cleric',
        name: 'Cleric',
        summary: 'Two cleric cantrips and a level 1 cleric spell.',
        effects: [feature('Magic Initiate (Cleric)', 'You learn two cantrips and one level 1 spell from the Cleric list. You always have the level 1 spell prepared and can cast it once per Long Rest without a slot. Intelligence, Wisdom or Charisma is your spellcasting ability for them.', undefined, 'passive')],
      },
      {
        id: 'druid',
        name: 'Druid',
        summary: 'Two druid cantrips and a level 1 druid spell.',
        effects: [feature('Magic Initiate (Druid)', 'You learn two cantrips and one level 1 spell from the Druid list. You always have the level 1 spell prepared and can cast it once per Long Rest without a slot. Intelligence, Wisdom or Charisma is your spellcasting ability for them.', undefined, 'passive')],
      },
      {
        id: 'wizard',
        name: 'Wizard',
        summary: 'Two wizard cantrips and a level 1 wizard spell.',
        effects: [feature('Magic Initiate (Wizard)', 'You learn two cantrips and one level 1 spell from the Wizard list. You always have the level 1 spell prepared and can cast it once per Long Rest without a slot. Intelligence, Wisdom or Charisma is your spellcasting ability for them.', undefined, 'passive')],
      },
    ],
  },
}

export const feats: Collection = {
  id: 'feats',
  label: 'Feats',
  singular: 'Feat',
  entries: [
    feat('alert', 'Alert', 'origin', 'Add your proficiency bonus to Initiative, and swap Initiative with a willing ally.', [
      feature('Alert', 'When you roll Initiative you can add your proficiency bonus to the roll. Immediately after rolling you can also swap your Initiative with a willing ally’s, unless either of you is Incapacitated.', undefined, 'passive'),
      { type: 'bonus', stat: 'initiativeProficiency', amount: 1 },
    ]),
    feat('magic-initiate', 'Magic Initiate', 'origin', 'Two cantrips and a level 1 spell from the Cleric, Druid or Wizard list.', [], [magicInitiateChoice]),
    feat('savage-attacker', 'Savage Attacker', 'origin', 'Reroll weapon damage once per turn and take the better result.', [
      feature('Savage Attacker', 'Once per turn when you hit a target with a weapon, you can roll the weapon’s damage dice twice and use either roll.', undefined, 'free'),
    ]),
    feat(
      'skilled',
      'Skilled',
      'origin',
      'Three more skill or tool proficiencies.',
      [feature('Skilled', 'You gain proficiency in any combination of three skills or tools of your choice.', undefined, 'passive')],
      [{ id: 'skills', prompt: 'Three skills', count: 3, source: { kind: 'skills' } }],
    ),

    feat(
      'ability-score-improvement',
      'Ability Score Improvement',
      'general',
      'Raise one ability by 2, or two abilities by 1.',
      [feature('Ability Score Improvement', 'Increase one ability score by 2, or two ability scores by 1. This cannot take a score above 20.', undefined, 'passive')],
      [
        {
          id: 'increase',
          prompt: 'Raise abilities by 1 twice (the same ability twice is allowed)',
          count: 2,
          allowDuplicates: true,
          source: { kind: 'abilities', amount: 1 },
        },
      ],
    ),
    feat(
      'grappler',
      'Grappler',
      'general',
      'Grab and punch in the same attack, with advantage afterwards.',
      [
        feature(
          'Grappler',
          'When you hit with an Unarmed Strike as part of the Attack action you can use both the Damage and the Grapple option, once per turn. You have advantage on attack rolls against creatures you have Grappled, and moving a Grappled creature of your size or smaller costs no extra movement.',
          undefined,
          'free',
        ),
      ],
      [{ id: 'increase', prompt: 'Raise Strength or Dexterity by 1', source: { kind: 'abilities', amount: 1, from: ['str', 'dex'] } }],
    ),
  ],
}

// ---------------------------------------------------------------------------
// Backgrounds — where the ability score increases now live
//
// SRD 5.2 publishes four. The Player's Handbook has sixteen; those are not in
// the SRD, so they are not here.
// ---------------------------------------------------------------------------

/**
 * Every 2024 background grants three ability increases (+2/+1 or +1/+1/+1
 * across its three listed abilities), two skills, one tool, and an Origin feat.
 */
const background = (
  id: string,
  name: string,
  icon: string,
  summary: string,
  atTheTable: string,
  abilities: [string, string, string],
  skills: [string, string],
  toolProficiency: string,
  featName: string,
  equipment: Effect[],
  extraChoices: NonNullable<Entry['choices']> = [],
): Entry => ({
  id,
  name,
  icon,
  summary,
  atTheTable,
  meta: { Abilities: abilities.map((a) => a.toUpperCase()).join(', '), Feat: featName, Tool: toolProficiency },
  effects: [skill(skills[0]), skill(skills[1]), ...(toolProficiency ? [tool(toolProficiency)] : []), ...equipment],
  choices: [
    {
      id: 'ability-increase',
      prompt: `Ability increases — either +2 and +1, or +1 to all three (${abilities.map((a) => a.toUpperCase()).join(', ')})`,
      source: {
        kind: 'options',
        options: [
          ...abilities.flatMap((two) =>
            abilities
              .filter((one) => one !== two)
              .map((one) => ({
                id: `${two}2-${one}1`,
                name: `+2 ${two.toUpperCase()}, +1 ${one.toUpperCase()}`,
                effects: [
                  { type: 'ability', ability: two, amount: 2 },
                  { type: 'ability', ability: one, amount: 1 },
                ] as Effect[],
              })),
          ),
          {
            id: 'spread',
            name: `+1 to all three (${abilities.map((a) => a.toUpperCase()).join(', ')})`,
            effects: abilities.map((ability) => ({ type: 'ability', ability, amount: 1 })) as Effect[],
          },
        ],
      },
    },
    ...extraChoices,
    // The SRD names one specific feat per background, but the app still asks:
    // plenty of tables let you swap it, and seeing the alternatives is how a
    // player learns what an Origin feat even is.
    { id: 'feat', prompt: `Origin feat — this background grants ${featName}`, source: { kind: 'collection', collection: 'feats', tag: 'origin' } },
  ],
})

const GAMING_SETS = ['Dice set', 'Dragonchess set', 'Playing card set', 'Three-Dragon Ante set']

export const backgrounds: Collection = {
  id: 'backgrounds',
  label: 'Backgrounds',
  singular: 'Background',
  entries: [
    background(
      'acolyte',
      'Acolyte',
      '🕯️',
      'You served a temple, and its people still know you.',
      'Two cantrips and a spell from the Cleric list, before your class gives you anything.',
      ['int', 'wis', 'cha'],
      ['insight', 'religion'],
      "Calligrapher's supplies",
      'Magic Initiate',
      [item("Calligrapher's supplies"), item('Book (prayers)'), item('Holy symbol'), item('Parchment', 10), item('Robes'), item('Gold pieces', 8)],
    ),
    background(
      'criminal',
      'Criminal',
      '🗝️',
      'You worked outside the law, and were good enough to still be here.',
      'Proficiency added to Initiative, and the ability to hand your place in the order to an ally.',
      ['dex', 'con', 'int'],
      ['sleight-of-hand', 'stealth'],
      "Thieves' tools",
      'Alert',
      [item('Dagger', 2), item("Thieves' tools"), item('Crowbar'), item('Pouch', 2), item('Travelers clothes'), item('Gold pieces', 16)],
    ),
    background(
      'sage',
      'Sage',
      '📚',
      'You spent years with books, and it shows.',
      'Two cantrips and a spell from the Wizard list, before your class gives you anything.',
      ['con', 'int', 'wis'],
      ['arcana', 'history'],
      "Calligrapher's supplies",
      'Magic Initiate',
      [item('Quarterstaff'), item("Calligrapher's supplies"), item('Book (history)'), item('Parchment', 8), item('Robes'), item('Gold pieces', 8)],
    ),
    background(
      'soldier',
      'Soldier',
      '⚔️',
      'You were trained to fight in a line, and you did.',
      'Reroll your weapon damage once a turn and keep whichever result you like better.',
      ['str', 'dex', 'con'],
      ['athletics', 'intimidation'],
      '',
      'Savage Attacker',
      [item('Spear'), item('Shortbow'), item('Arrows', 20), item("Healer's kit"), item('Quiver'), item('Travelers clothes'), item('Gold pieces', 14)],
      [{ id: 'gaming-set', prompt: 'Tool proficiency — one gaming set', source: { kind: 'proficiencies', category: 'tool', from: GAMING_SETS } }],
    ),
  ],
}
