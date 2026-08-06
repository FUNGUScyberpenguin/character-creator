import type { Collection, Effect, Entry } from '../../engine/types'

/**
 * Species, backgrounds and origin feats from SRD 5.2 (the 2024 rules).
 *
 * The headline structural change from 2014: **species grant no ability score
 * increases**. Those come from your background, along with an origin feat. That
 * single change is why this cannot be expressed as a patch over the 5.1
 * ruleset, and why it is a separate module.
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
const language = (value: string): Effect => ({ type: 'proficiency', category: 'language', value })
const setStat = (stat: string, value: number | string): Effect => ({ type: 'set', stat, value })
const item = (name: string, quantity = 1): Effect => ({ type: 'item', item: name, quantity })

const size = (value: string): Effect => setStat('size', value)
const speed = (feet: number): Effect => setStat('speed', feet)
const darkvision = (range: number): Effect => setStat('darkvision', range)

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

const speciesEntries: Entry[] = [
  {
    id: 'aasimar',
    name: 'Aasimar',
    icon: '😇',
    summary: 'Touched by the Upper Planes. You can let the light out when you need to.',
    atTheTable: 'Heal a little at a touch, and once per rest unfurl something celestial that damages or terrifies everyone nearby.',
    meta: { Speed: '30 ft.', Size: 'Small or Medium', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      darkvision(60),
      feature('Celestial Resistance', 'You have resistance to necrotic damage and radiant damage.', undefined, 'passive'),
      feature('Healing Hands', 'As a Magic action, touch a creature and roll a number of d4s equal to your proficiency bonus. It regains that many hit points.', '1/long rest', 'action'),
      feature('Light Bearer', 'You know the Light cantrip. Charisma is your spellcasting ability for it.', undefined, 'passive'),
      feature(
        'Celestial Revelation',
        'From 3rd level, as a Bonus Action you transform for 1 minute: Heavenly Wings, Inner Radiance, or Necrotic Shroud. Once per turn while transformed, add your proficiency bonus in extra damage to one hit.',
        '1/long rest',
        'bonus',
      ),
    ],
    choices: [
      {
        id: 'size',
        prompt: 'Your size',
        source: {
          kind: 'options',
          options: [
            { id: 'small', name: 'Small', effects: [size('Small')] },
            { id: 'medium', name: 'Medium', effects: [size('Medium')] },
          ],
        },
      },
    ],
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    icon: '🐉',
    summary: 'Draconic ancestry, a breath weapon, and eventually wings.',
    atTheTable: 'Breathe destruction over a line or cone instead of attacking, and from 5th level sprout wings to get above the fight.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(60),
      feature(
        'Breath Weapon',
        'When you take the Attack action you can replace one attack with a burst of your ancestry’s damage type. The save DC is 8 + your Constitution modifier + your proficiency bonus. Damage starts at 1d10 and rises at 5th, 11th and 17th level.',
        'proficiency bonus/long rest',
        'action',
      ),
      feature('Draconic Flight', 'From 5th level, as a Bonus Action you sprout spectral wings for 10 minutes, gaining a Fly Speed equal to your Speed.', '1/long rest', 'bonus'),
    ],
    choices: [
      {
        id: 'ancestry',
        prompt: 'Draconic ancestry',
        descriptor: false,
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
              feature('Draconic Ancestry', `Your Breath Weapon deals ${damage!.toLowerCase()} damage, and you have resistance to ${damage!.toLowerCase()} damage.`, undefined, 'passive'),
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
    summary: 'Stone-hardy, poison-resistant, and able to feel the ground move.',
    atTheTable: 'Very hard to poison, harder to kill than your class suggests, and you sense anything moving through the stone around you.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '120 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(120),
      feature('Dwarven Resilience', 'You have resistance to poison damage and advantage on saving throws against being poisoned.', undefined, 'passive'),
      feature('Dwarven Toughness', 'Your hit point maximum increases by 1, and by 1 again every time you gain a level.', undefined, 'passive'),
      { type: 'bonus', stat: 'hpPerLevel', amount: 1 },
      feature('Stonecunning', 'As a Bonus Action, gain Tremorsense out to 60 feet for 10 minutes, so long as you are on a stone surface.', 'proficiency bonus/long rest', 'bonus'),
    ],
  },
  {
    id: 'elf',
    name: 'Elf',
    icon: '🏹',
    summary: 'Keen senses, fey ancestry, and a lineage that grants spells as you grow.',
    atTheTable: 'You notice things others miss, cannot be put to sleep, and pick up a small spell at 1st, 3rd and 5th level.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(60),
      feature('Fey Ancestry', 'You have advantage on saving throws to avoid or end the Charmed condition.', undefined, 'passive'),
      feature('Keen Senses', 'You have proficiency in one of Insight, Perception, or Survival.', undefined, 'passive'),
      feature('Trance', 'You do not need to sleep, and magic cannot put you to sleep. You finish a Long Rest in 4 hours of light meditation.', undefined, 'passive'),
    ],
    choices: [
      { id: 'keen-senses', prompt: 'Keen Senses — choose a skill', source: { kind: 'skills', from: ['insight', 'perception', 'survival'] } },
      { id: 'lineage', prompt: 'Elven Lineage', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'elf' } },
    ],
  },
  {
    id: 'gnome',
    name: 'Gnome',
    icon: '⚙️',
    summary: 'Small, quick-minded, and unusually resistant to magic that targets the mind.',
    atTheTable: 'You have advantage on the saving throws that most often take a character out of a fight.',
    meta: { Speed: '30 ft.', Size: 'Small', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      size('Small'),
      darkvision(60),
      feature('Gnomish Cunning', 'You have advantage on Intelligence, Wisdom, and Charisma saving throws.', undefined, 'passive'),
    ],
    choices: [{ id: 'lineage', prompt: 'Gnomish Lineage', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'gnome' } }],
  },
  {
    id: 'goliath',
    name: 'Goliath',
    icon: '🏔️',
    summary: 'Giant ancestry. Large, strong, and carrying a supernatural knack from your bloodline.',
    atTheTable: 'You carry far more than you should, and once per rest your giant ancestry does something dramatic on your turn.',
    meta: { Speed: '35 ft.', Size: 'Medium', 'Powerful Build': 'Yes' },
    effects: [
      speed(35),
      size('Medium'),
      feature('Large Form', 'From 5th level, as a Bonus Action you become Large for 10 minutes if you have room, with advantage on Strength checks and +10 feet of Speed.', '1/long rest', 'bonus'),
      feature('Powerful Build', 'You count as one size larger for carrying capacity and the weight you can push, drag, or lift.', undefined, 'passive'),
    ],
    choices: [{ id: 'ancestry', prompt: 'Giant Ancestry', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'goliath' } }],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    icon: '🍀',
    summary: 'Small, brave, and reliably lucky at the worst possible moment.',
    atTheTable: 'Turn your critical failures into rerolls, hide behind bigger creatures, and never be frightened.',
    meta: { Speed: '30 ft.', Size: 'Small' },
    effects: [
      speed(30),
      size('Small'),
      feature('Brave', 'You have advantage on saving throws to avoid or end the Frightened condition.', undefined, 'passive'),
      feature('Halfling Nimbleness', 'You can move through the space of any creature larger than you, but cannot stop there.', undefined, 'passive'),
      feature('Luck', 'When you roll a 1 on the d20 of a D20 Test, you can reroll and must use the new roll.', undefined, 'passive'),
      feature('Naturally Stealthy', 'You can take the Hide action even when obscured only by a creature at least one size larger than you.', undefined, 'free'),
    ],
  },
  {
    id: 'human',
    name: 'Human',
    icon: '🧭',
    summary: 'Resourceful and adaptable. You start with an extra feat and an extra skill.',
    atTheTable: 'Whatever you built, you are slightly better at it than anyone else would be, and you get a second wind of luck each rest.',
    meta: { Speed: '30 ft.', Size: 'Small or Medium' },
    effects: [
      speed(30),
      feature('Resourceful', 'You gain Heroic Inspiration whenever you finish a Long Rest.', undefined, 'passive'),
      feature('Skillful', 'You gain proficiency in one skill of your choice.', undefined, 'passive'),
      feature('Versatile', 'You gain an Origin feat of your choice.', undefined, 'passive'),
    ],
    choices: [
      {
        id: 'size',
        prompt: 'Your size',
        source: {
          kind: 'options',
          options: [
            { id: 'small', name: 'Small', effects: [size('Small')] },
            { id: 'medium', name: 'Medium', effects: [size('Medium')] },
          ],
        },
      },
      { id: 'skillful', prompt: 'Skillful — choose a skill', source: { kind: 'skills' } },
      { id: 'versatile', prompt: 'Versatile — choose an Origin feat', source: { kind: 'collection', collection: 'feats', tag: 'origin' } },
    ],
  },
  {
    id: 'orc',
    name: 'Orc',
    icon: '🪓',
    summary: 'Relentless. You get back up, and you close distance faster than anyone expects.',
    atTheTable: 'Dash as a bonus action to reach the fight, and when you would drop you stay standing instead.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '120 ft.' },
    effects: [
      speed(30),
      size('Medium'),
      darkvision(120),
      feature('Adrenaline Rush', 'You can take the Dash action as a Bonus Action, and gain temporary hit points equal to your proficiency bonus when you do.', 'proficiency bonus/short rest', 'bonus'),
      feature('Relentless Endurance', 'When reduced to 0 hit points but not killed outright, you drop to 1 hit point instead.', '1/long rest', 'passive'),
    ],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    icon: '🔥',
    summary: 'A fiendish legacy that grows into real spellcasting.',
    atTheTable: 'You pick up a cantrip at 1st level and a proper spell at 3rd and 5th, on top of whatever your class does.',
    meta: { Speed: '30 ft.', Size: 'Small or Medium', Darkvision: '60 ft.' },
    effects: [
      speed(30),
      darkvision(60),
      feature('Otherworldly Presence', 'You know the Thaumaturgy cantrip, cast with the ability chosen for your Fiendish Legacy.', undefined, 'passive'),
    ],
    choices: [
      {
        id: 'size',
        prompt: 'Your size',
        source: {
          kind: 'options',
          options: [
            { id: 'small', name: 'Small', effects: [size('Small')] },
            { id: 'medium', name: 'Medium', effects: [size('Medium')] },
          ],
        },
      },
      { id: 'legacy', prompt: 'Fiendish Legacy', descriptor: true, source: { kind: 'collection', collection: 'lineages', tag: 'tiefling' } },
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
// Lineages — the sub-choices several species make
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
    lineage('drow', 'Drow', 'elf', 'Superior Darkvision, and Dancing Lights into Faerie Fire and Darkness.', [
      { type: 'set', stat: 'darkvision', value: 120 },
      feature('Drow Lineage', 'Your Darkvision extends to 120 feet. You know Dancing Lights; at 3rd level you can cast Faerie Fire, and at 5th level Darkness, once per long rest each without a spell slot.', undefined, 'passive'),
    ]),
    lineage('high-elf', 'High Elf', 'elf', 'A wizard cantrip you can swap on a long rest, then Detect Magic and Misty Step.', [
      feature('High Elf Lineage', 'You know one Wizard cantrip, swappable whenever you finish a Long Rest. At 3rd level you can cast Detect Magic, and at 5th level Misty Step, once per long rest each without a spell slot.', undefined, 'passive'),
    ]),
    lineage('wood-elf', 'Wood Elf', 'elf', 'Faster on your feet, plus Druidcraft into Longstrider and Pass without Trace.', [
      { type: 'bonus', stat: 'speed', amount: 5 },
      feature('Wood Elf Lineage', 'Your Speed increases by 5 feet. You know Druidcraft; at 3rd level you can cast Longstrider, and at 5th level Pass without Trace, once per long rest each without a spell slot.', undefined, 'passive'),
    ]),

    lineage('forest-gnome', 'Forest Gnome', 'gnome', 'Minor Illusion, and you can talk to small animals.', [
      feature('Forest Gnome Lineage', 'You know the Minor Illusion cantrip, and you can cast Speak with Animals without a spell slot a number of times equal to your proficiency bonus per long rest.', undefined, 'passive'),
    ]),
    lineage('rock-gnome', 'Rock Gnome', 'gnome', 'Mending and Prestidigitation, plus tiny clockwork devices.', [
      { type: 'proficiency', category: 'tool', value: "Tinker's tools" },
      feature('Rock Gnome Lineage', 'You know Mending and Prestidigitation. With tinker’s tools you can spend 10 minutes making a Tiny clockwork device that produces a small effect.', undefined, 'passive'),
    ]),

    lineage('cloud-giant', 'Cloud’s Jaunt', 'goliath', 'Teleport 30 feet as a bonus action.', [
      feature('Cloud’s Jaunt', 'As a Bonus Action, magically teleport up to 30 feet to an unoccupied space you can see.', 'proficiency bonus/long rest', 'bonus'),
    ]),
    lineage('fire-giant', 'Fire’s Burn', 'goliath', 'Extra fire damage when you hit.', [
      feature('Fire’s Burn', 'When you hit a target with an attack roll, you can deal an extra 1d10 fire damage.', 'proficiency bonus/long rest', 'free'),
    ]),
    lineage('frost-giant', 'Frost’s Chill', 'goliath', 'Extra cold damage, and it slows them.', [
      feature('Frost’s Chill', 'When you hit a target with an attack roll, deal an extra 1d6 cold damage and reduce its Speed by 10 feet until your next turn.', 'proficiency bonus/long rest', 'free'),
    ]),
    lineage('hill-giant', 'Hill’s Tumble', 'goliath', 'Knock a Large or smaller target prone.', [
      feature('Hill’s Tumble', 'When you hit a Large or smaller creature with an attack roll, you can give it the Prone condition.', 'proficiency bonus/long rest', 'free'),
    ]),
    lineage('stone-giant', 'Stone’s Endurance', 'goliath', 'Reduce damage taken as a reaction.', [
      feature('Stone’s Endurance', 'As a Reaction when you take damage, reduce it by 1d12 plus your Constitution modifier.', 'proficiency bonus/long rest', 'reaction'),
    ]),
    lineage('storm-giant', 'Storm’s Thunder', 'goliath', 'Answer a hit with thunder damage.', [
      feature('Storm’s Thunder', 'As a Reaction when you take damage from a creature within 60 feet, deal 1d8 thunder damage to it.', 'proficiency bonus/long rest', 'reaction'),
    ]),

    lineage('abyssal', 'Abyssal Legacy', 'tiefling', 'Poison Spray, then Ray of Sickness and Hold Person.', [
      feature('Abyssal Legacy', 'You have resistance to poison damage and know Poison Spray. At 3rd level you can cast Ray of Sickness, and at 5th level Hold Person, once per long rest each without a spell slot.', undefined, 'passive'),
    ]),
    lineage('chthonic', 'Chthonic Legacy', 'tiefling', 'Chill Touch, then False Life and Ray of Enfeeblement.', [
      feature('Chthonic Legacy', 'You have resistance to necrotic damage and know Chill Touch. At 3rd level you can cast False Life, and at 5th level Ray of Enfeeblement, once per long rest each without a spell slot.', undefined, 'passive'),
    ]),
    lineage('infernal', 'Infernal Legacy', 'tiefling', 'Fire Bolt, then Hellish Rebuke and Darkness.', [
      feature('Infernal Legacy', 'You have resistance to fire damage and know Fire Bolt. At 3rd level you can cast Hellish Rebuke, and at 5th level Darkness, once per long rest each without a spell slot.', undefined, 'passive'),
    ]),
  ],
}

// ---------------------------------------------------------------------------
// Origin feats
// ---------------------------------------------------------------------------

const feat = (id: string, name: string, summary: string, effects: Effect[], choices?: Entry['choices']): Entry => ({
  id,
  name,
  tags: ['origin'],
  summary,
  effects,
  ...(choices ? { choices } : {}),
})

export const feats: Collection = {
  id: 'feats',
  label: 'Feats',
  singular: 'Feat',
  entries: [
    feat('alert', 'Alert', 'Add your proficiency bonus to Initiative, and swap Initiative with a willing ally.', [
      feature('Alert', 'You add your proficiency bonus to Initiative rolls, and can swap your Initiative with a willing ally’s.', undefined, 'passive'),
      { type: 'bonus', stat: 'initiativeProficiency', amount: 1 },
    ]),
    feat('crafter', 'Crafter', 'Tool proficiencies, a discount on gear, and faster crafting.', [
      feature('Crafter', 'You gain proficiency with three artisan’s tools, buy nonmagical gear at a 20% discount, and craft faster.', undefined, 'passive'),
    ], [
      { id: 'tools', prompt: 'Three artisan’s tools', count: 3, source: { kind: 'proficiencies', category: 'tool', from: ["Carpenter's tools", "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Smith's tools", "Tinker's tools", "Weaver's tools", "Woodcarver's tools", "Alchemist's supplies", "Cook's utensils"] } },
    ]),
    feat('healer', 'Healer', 'Spend a use of a Healer’s Kit to restore hit points as an action.', [
      feature('Healer', 'As a Utilize action, spend one use of a Healer’s Kit to let a creature spend a Hit Point Die and regain that much plus your proficiency bonus.', undefined, 'action'),
      { type: 'item', item: "Healer's kit" },
    ]),
    feat('lucky', 'Lucky', 'A pool of Luck Points to force advantage or spoil an attack.', [
      feature('Luck Points', 'You have Luck Points equal to your proficiency bonus, regained on a Long Rest. Spend one for advantage on a D20 Test, or to impose disadvantage on an attack against you.', 'proficiency bonus/long rest', 'free'),
      { type: 'resource', name: 'Luck Points', formula: 'prof' },
    ]),
    feat('magic-initiate-cleric', 'Magic Initiate (Cleric)', 'Two cleric cantrips and a 1st-level cleric spell.', [
      feature('Magic Initiate (Cleric)', 'You learn two cantrips and one 1st-level spell from the Cleric list. You can cast the 1st-level spell once per long rest without a slot, and Wisdom is your spellcasting ability for them.', undefined, 'passive'),
    ]),
    feat('magic-initiate-druid', 'Magic Initiate (Druid)', 'Two druid cantrips and a 1st-level druid spell.', [
      feature('Magic Initiate (Druid)', 'You learn two cantrips and one 1st-level spell from the Druid list. You can cast the 1st-level spell once per long rest without a slot, and Wisdom is your spellcasting ability for them.', undefined, 'passive'),
    ]),
    feat('magic-initiate-wizard', 'Magic Initiate (Wizard)', 'Two wizard cantrips and a 1st-level wizard spell.', [
      feature('Magic Initiate (Wizard)', 'You learn two cantrips and one 1st-level spell from the Wizard list. You can cast the 1st-level spell once per long rest without a slot, and Intelligence is your spellcasting ability for them.', undefined, 'passive'),
    ]),
    feat('musician', 'Musician', 'Instrument proficiencies, and hand out Heroic Inspiration after a rest.', [
      feature('Musician', 'You gain proficiency with three musical instruments. After a rest, you can give Heroic Inspiration to allies equal to your proficiency bonus.', undefined, 'passive'),
    ], [
      { id: 'instruments', prompt: 'Three instruments', count: 3, source: { kind: 'proficiencies', category: 'tool', from: ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre', 'Pan flute', 'Shawm', 'Viol'] } },
    ]),
    feat('savage-attacker', 'Savage Attacker', 'Reroll weapon damage once per turn and take the better result.', [
      feature('Savage Attacker', 'Once per turn when you hit with a weapon, you can reroll the damage dice and use either total.', undefined, 'free'),
    ]),
    feat('skilled', 'Skilled', 'Three more skill or tool proficiencies.', [
      feature('Skilled', 'You gain proficiency in three skills or tools of your choice.', undefined, 'passive'),
    ], [{ id: 'skills', prompt: 'Three skills', count: 3, source: { kind: 'skills' } }]),
    feat('tavern-brawler', 'Tavern Brawler', 'Better unarmed strikes, and you can push what you hit.', [
      feature('Tavern Brawler', 'Your Unarmed Strike deals 1d4 damage, you can reroll a 1 on that damage, and once per turn you can push a target 5 feet when you hit it.', undefined, 'passive'),
    ]),
    feat('tough', 'Tough', 'Twice your level in extra hit points.', [
      feature('Tough', 'Your hit point maximum increases by an amount equal to twice your character level.', undefined, 'passive'),
      { type: 'bonus', stat: 'hpPerLevel', amount: 2 },
    ]),
  ],
}

// ---------------------------------------------------------------------------
// Backgrounds — where ability score increases now live
// ---------------------------------------------------------------------------

/**
 * Every 2024 background grants three ability increases (+2/+1 or +1/+1/+1 across
 * its three listed abilities), two skills, one tool, and an origin feat.
 */
const background = (
  id: string,
  name: string,
  icon: string,
  summary: string,
  abilities: [string, string, string],
  skills: [string, string],
  toolProficiency: string,
  featId: string,
  equipment: Effect[],
): Entry => ({
  id,
  name,
  icon,
  summary,
  meta: { Abilities: abilities.map((a) => a.toUpperCase()).join(', '), Feat: featId.replace(/-/g, ' ') },
  effects: [skill(skills[0]), skill(skills[1]), tool(toolProficiency), ...equipment],
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
    { id: 'feat', prompt: 'Origin feat', source: { kind: 'collection', collection: 'feats', tag: 'origin' } },
  ],
})

export const backgrounds: Collection = {
  id: 'backgrounds',
  label: 'Backgrounds',
  singular: 'Background',
  entries: [
    background('acolyte', 'Acolyte', '🕯️', 'You served a temple, and its people still know you.', ['int', 'wis', 'cha'], ['insight', 'religion'], "Calligrapher's supplies", 'magic-initiate-cleric', [item('Holy symbol'), item("Calligrapher's supplies"), item('Prayer book'), item('Gold pieces', 8)]),
    background('artisan', 'Artisan', '🔨', 'You learned a trade properly, from someone who cared about it.', ['str', 'dex', 'int'], ['investigation', 'persuasion'], "Tinker's tools", 'crafter', [item("Tinker's tools"), item('Travelers clothes'), item('Gold pieces', 32)]),
    background('charlatan', 'Charlatan', '🎩', 'You have always been better at being someone else.', ['dex', 'con', 'cha'], ['deception', 'sleight-of-hand'], 'Forgery kit', 'skilled', [item('Forgery kit'), item('Fine clothes'), item('Gold pieces', 15)]),
    background('criminal', 'Criminal', '🗝️', 'You worked outside the law, and were good enough to still be here.', ['dex', 'con', 'int'], ['sleight-of-hand', 'stealth'], "Thieves' tools", 'alert', [item("Thieves' tools"), item('Crowbar'), item('Gold pieces', 16)]),
    background('entertainer', 'Entertainer', '🎭', 'You made a living on temporary stages.', ['str', 'dex', 'cha'], ['acrobatics', 'performance'], 'Lute', 'musician', [item('Lute'), item('Costume'), item('Gold pieces', 11)]),
    background('farmer', 'Farmer', '🌾', 'Hard work, early mornings, and a very practical education.', ['str', 'con', 'wis'], ['animal-handling', 'nature'], "Carpenter's tools", 'tough', [item("Carpenter's tools"), item('Sickle'), item('Gold pieces', 30)]),
    background('guard', 'Guard', '🛡️', 'You watched a wall, a gate, or a person, for years.', ['str', 'int', 'wis'], ['athletics', 'perception'], "Gaming set", 'alert', [item('Spear'), item('Light crossbow'), item('Gaming set'), item('Gold pieces', 12)]),
    background('guide', 'Guide', '🧭', 'You led people through country that could kill them.', ['dex', 'con', 'wis'], ['stealth', 'survival'], "Cartographer's tools", 'magic-initiate-druid', [item("Cartographer's tools"), item('Shortbow'), item('Gold pieces', 3)]),
    background('hermit', 'Hermit', '🕯️', 'You lived apart, and had time to think about why.', ['con', 'wis', 'cha'], ['medicine', 'religion'], 'Herbalism kit', 'healer', [item('Herbalism kit'), item('Quarterstaff'), item('Gold pieces', 16)]),
    background('merchant', 'Merchant', '⚖️', 'You bought, sold, and learned exactly what a thing is worth.', ['con', 'int', 'cha'], ['animal-handling', 'persuasion'], "Navigator's tools", 'lucky', [item("Navigator's tools"), item('Pouch'), item('Gold pieces', 22)]),
    background('noble', 'Noble', '👑', 'A name that opens doors, and the manners to match.', ['str', 'int', 'cha'], ['history', 'persuasion'], 'Gaming set', 'skilled', [item('Gaming set'), item('Fine clothes'), item('Gold pieces', 29)]),
    background('sage', 'Sage', '📚', 'You spent years with books, and it shows.', ['con', 'int', 'wis'], ['arcana', 'history'], "Calligrapher's supplies", 'magic-initiate-wizard', [item("Calligrapher's supplies"), item('Quarterstaff'), item('Gold pieces', 8)]),
    background('sailor', 'Sailor', '⚓', 'You worked a ship, and the sea did not drown you.', ['str', 'dex', 'wis'], ['acrobatics', 'perception'], "Navigator's tools", 'tavern-brawler', [item("Navigator's tools"), item('Dagger'), item('Silk rope (50 feet)'), item('Gold pieces', 20)]),
    background('scribe', 'Scribe', '🖋️', 'You copied documents until your hand was perfect and your eyes were not.', ['dex', 'int', 'wis'], ['investigation', 'perception'], "Calligrapher's supplies", 'skilled', [item("Calligrapher's supplies"), item('Fine clothes'), item('Gold pieces', 23)]),
    background('soldier', 'Soldier', '⚔️', 'You were trained to fight in a line, and you did.', ['str', 'dex', 'con'], ['athletics', 'intimidation'], 'Gaming set', 'savage-attacker', [item('Spear'), item('Shortbow'), item('Gaming set'), item('Gold pieces', 14)]),
    background('wayfarer', 'Wayfarer', '🪙', 'The street raised you, and you owe it nothing.', ['dex', 'wis', 'cha'], ['insight', 'stealth'], "Thieves' tools", 'lucky', [item("Thieves' tools"), item('Gaming set'), item('Dagger', 2), item('Gold pieces', 16)]),
  ],
}

export { language }
