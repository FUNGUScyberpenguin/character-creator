import type { Collection, Effect, Entry } from '../../engine/types'
import { allSkillIds, selectableLanguages } from './basics'

/**
 * The nine races of SRD 5.1. Each SRD race publishes exactly one subrace, so
 * those traits are folded straight into the parent entry rather than hidden
 * behind a choice with a single option.
 */

const darkvision = (range: number): Effect => ({ type: 'set', stat: 'darkvision', value: range })
const speed = (feet: number): Effect => ({ type: 'set', stat: 'speed', value: feet })
const size = (value: string): Effect => ({ type: 'set', stat: 'size', value })
const language = (name: string): Effect => ({ type: 'proficiency', category: 'language', value: name })

const extraLanguage = (id: string, prompt: string) => ({
  id,
  prompt,
  count: 1,
  source: { kind: 'proficiencies' as const, category: 'language', from: selectableLanguages },
})

const dragonAncestries: { id: string; name: string; damage: string; breath: string }[] = [
  { id: 'black', name: 'Black', damage: 'Acid', breath: '5 by 30 ft. line (DEX save)' },
  { id: 'blue', name: 'Blue', damage: 'Lightning', breath: '5 by 30 ft. line (DEX save)' },
  { id: 'brass', name: 'Brass', damage: 'Fire', breath: '5 by 30 ft. line (DEX save)' },
  { id: 'bronze', name: 'Bronze', damage: 'Lightning', breath: '5 by 30 ft. line (DEX save)' },
  { id: 'copper', name: 'Copper', damage: 'Acid', breath: '5 by 30 ft. line (DEX save)' },
  { id: 'gold', name: 'Gold', damage: 'Fire', breath: '15 ft. cone (DEX save)' },
  { id: 'green', name: 'Green', damage: 'Poison', breath: '15 ft. cone (CON save)' },
  { id: 'red', name: 'Red', damage: 'Fire', breath: '15 ft. cone (DEX save)' },
  { id: 'silver', name: 'Silver', damage: 'Cold', breath: '15 ft. cone (CON save)' },
  { id: 'white', name: 'White', damage: 'Cold', breath: '15 ft. cone (CON save)' },
]

const entries: Entry[] = [
  {
    id: 'dwarf',
    name: 'Dwarf (Hill Dwarf)',
    icon: '⛏️',
    summary: 'Stout, stubborn, and hard to put down. Tough enough to take a hit meant for someone else.',
    description:
      'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal. Hill dwarves add keen senses and remarkable resilience on top of that.',
    meta: { Speed: '25 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      { type: 'ability', ability: 'con', amount: 2 },
      { type: 'ability', ability: 'wis', amount: 1 },
      speed(25),
      size('Medium'),
      darkvision(60),
      language('Common'),
      language('Dwarvish'),
      { type: 'proficiency', category: 'weapon', value: 'Battleaxe' },
      { type: 'proficiency', category: 'weapon', value: 'Handaxe' },
      { type: 'proficiency', category: 'weapon', value: 'Light hammer' },
      { type: 'proficiency', category: 'weapon', value: 'Warhammer' },
      { type: 'bonus', stat: 'hpPerLevel', amount: 1 },
      {
        type: 'feature',
        name: 'Dwarven Resilience',
        description: 'You have advantage on saving throws against poison, and resistance against poison damage.',
      },
      {
        type: 'feature',
        name: 'Stonecunning',
        description:
          'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus.',
      },
      {
        type: 'feature',
        name: 'Dwarven Toughness',
        description: 'Your hit point maximum increases by 1, and by 1 again every time you gain a level.',
      },
      { type: 'note', text: 'Speed is not reduced by wearing heavy armor.' },
    ],
    choices: [
      {
        id: 'tools',
        prompt: 'Dwarven artisan training',
        source: {
          kind: 'proficiencies',
          category: 'tool',
          from: ["Smith's tools", "Brewer's supplies", "Mason's tools"],
        },
      },
    ],
  },

  {
    id: 'elf',
    name: 'Elf (High Elf)',
    icon: '🏹',
    summary: 'Graceful, long-lived, and quietly certain they have seen this all before.',
    description:
      'Elves are a magical people of otherworldly grace, living in places of ethereal beauty. High elves have a keen mind and a mastery of at least the basics of magic.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      { type: 'ability', ability: 'dex', amount: 2 },
      { type: 'ability', ability: 'int', amount: 1 },
      speed(30),
      size('Medium'),
      darkvision(60),
      language('Common'),
      language('Elvish'),
      { type: 'proficiency', category: 'skill', value: 'perception' },
      { type: 'proficiency', category: 'weapon', value: 'Longsword' },
      { type: 'proficiency', category: 'weapon', value: 'Shortsword' },
      { type: 'proficiency', category: 'weapon', value: 'Shortbow' },
      { type: 'proficiency', category: 'weapon', value: 'Longbow' },
      {
        type: 'feature',
        name: 'Fey Ancestry',
        description: 'You have advantage on saving throws against being charmed, and magic cannot put you to sleep.',
      },
      {
        type: 'feature',
        name: 'Trance',
        description:
          'You do not sleep. You meditate deeply for 4 hours a day and gain the same benefit others get from 8 hours of sleep.',
      },
      {
        type: 'feature',
        name: 'Cantrip',
        description: 'You know one cantrip of your choice from the wizard spell list. Intelligence is your casting ability for it.',
      },
    ],
    choices: [extraLanguage('language', 'Extra language')],
  },

  {
    id: 'halfling',
    name: 'Halfling (Lightfoot)',
    icon: '🍀',
    summary: 'Small, cheerful, and improbably lucky. Very good at not being seen.',
    description:
      'Halflings avoid trouble where they can, but they are braver than their size suggests. Lightfoot halflings are especially good at slipping out of sight.',
    meta: { Speed: '25 ft.', Size: 'Small' },
    effects: [
      { type: 'ability', ability: 'dex', amount: 2 },
      { type: 'ability', ability: 'cha', amount: 1 },
      speed(25),
      size('Small'),
      language('Common'),
      language('Halfling'),
      {
        type: 'feature',
        name: 'Lucky',
        description: 'When you roll a 1 on an attack roll, ability check, or saving throw, you may reroll and must use the new roll.',
      },
      {
        type: 'feature',
        name: 'Brave',
        description: 'You have advantage on saving throws against being frightened.',
      },
      {
        type: 'feature',
        name: 'Halfling Nimbleness',
        description: 'You can move through the space of any creature that is of a size larger than yours.',
      },
      {
        type: 'feature',
        name: 'Naturally Stealthy',
        description: 'You can attempt to hide even when obscured only by a creature at least one size larger than you.',
      },
    ],
  },

  {
    id: 'human',
    name: 'Human',
    icon: '🧭',
    summary: 'Adaptable and ambitious. Good at everything, master of whatever you decide.',
    description: 'Humans are the most adaptable and driven of the common races, found everywhere and trying everything.',
    meta: { Speed: '30 ft.', Size: 'Medium' },
    effects: [
      { type: 'ability', ability: 'str', amount: 1 },
      { type: 'ability', ability: 'dex', amount: 1 },
      { type: 'ability', ability: 'con', amount: 1 },
      { type: 'ability', ability: 'int', amount: 1 },
      { type: 'ability', ability: 'wis', amount: 1 },
      { type: 'ability', ability: 'cha', amount: 1 },
      speed(30),
      size('Medium'),
      language('Common'),
    ],
    choices: [extraLanguage('language', 'Extra language')],
  },

  {
    id: 'dragonborn',
    name: 'Dragonborn',
    icon: '🐉',
    summary: 'Draconic blood, a breath weapon, and a strong sense of what is owed.',
    description:
      'Dragonborn look like dragons standing erect in humanoid form. They value honour and skill above all, and carry the elemental legacy of their ancestors.',
    meta: { Speed: '30 ft.', Size: 'Medium' },
    effects: [
      { type: 'ability', ability: 'str', amount: 2 },
      { type: 'ability', ability: 'cha', amount: 1 },
      speed(30),
      size('Medium'),
      language('Common'),
      language('Draconic'),
      {
        type: 'feature',
        name: 'Breath Weapon',
        description:
          'You can exhale destructive energy in the shape set by your ancestry. The DC is 8 + your Constitution modifier + your proficiency bonus. Damage is 2d6, rising at 6th, 11th, and 16th level.',
        uses: '1/short rest',
      },
    ],
    choices: [
      {
        id: 'ancestry',
        prompt: 'Draconic ancestry',
        source: {
          kind: 'options',
          options: dragonAncestries.map((dragon) => ({
            id: dragon.id,
            name: `${dragon.name} Dragon`,
            summary: `${dragon.damage} damage — ${dragon.breath}`,
            effects: [
              { type: 'set', stat: 'breathDamage', value: dragon.damage },
              {
                type: 'feature',
                name: `Draconic Ancestry (${dragon.name})`,
                description: `Your breath weapon deals ${dragon.damage.toLowerCase()} damage in a ${dragon.breath}. You have resistance to ${dragon.damage.toLowerCase()} damage.`,
              },
            ],
          })),
        },
      },
    ],
  },

  {
    id: 'gnome',
    name: 'Gnome (Rock Gnome)',
    icon: '⚙️',
    summary: 'Small, brilliant, and endlessly curious. Prone to inventing things nobody asked for.',
    description:
      'A gnome’s energy and enthusiasm for living shines through every inch of their tiny body. Rock gnomes have a natural inventiveness and hardiness.',
    meta: { Speed: '25 ft.', Size: 'Small', Darkvision: '60 ft.' },
    effects: [
      { type: 'ability', ability: 'int', amount: 2 },
      { type: 'ability', ability: 'con', amount: 1 },
      speed(25),
      size('Small'),
      darkvision(60),
      language('Common'),
      language('Gnomish'),
      { type: 'proficiency', category: 'tool', value: "Tinker's tools" },
      {
        type: 'feature',
        name: 'Gnome Cunning',
        description: 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.',
      },
      {
        type: 'feature',
        name: "Artificer's Lore",
        description:
          'Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you add twice your proficiency bonus.',
      },
      {
        type: 'feature',
        name: 'Tinker',
        description:
          'Using tinker’s tools, you can spend 1 hour and 10 gp of materials to construct a Tiny clockwork device that lasts 24 hours.',
      },
    ],
  },

  {
    id: 'half-elf',
    name: 'Half-Elf',
    icon: '🌗',
    summary: 'At home in two worlds and fully of neither. Charming, versatile, restless.',
    description:
      'Half-elves combine what some say are the best qualities of their elf and human parents: human curiosity and ambition, elf senses and grace.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      { type: 'ability', ability: 'cha', amount: 2 },
      speed(30),
      size('Medium'),
      darkvision(60),
      language('Common'),
      language('Elvish'),
      {
        type: 'feature',
        name: 'Fey Ancestry',
        description: 'You have advantage on saving throws against being charmed, and magic cannot put you to sleep.',
      },
    ],
    choices: [
      {
        id: 'ability-bonus',
        prompt: 'Raise two other abilities by 1',
        count: 2,
        source: { kind: 'abilities', amount: 1, from: ['str', 'dex', 'con', 'int', 'wis'] },
      },
      {
        id: 'skills',
        prompt: 'Skill Versatility — choose two skills',
        count: 2,
        source: { kind: 'skills', from: allSkillIds },
      },
      extraLanguage('language', 'Extra language'),
    ],
  },

  {
    id: 'half-orc',
    name: 'Half-Orc',
    icon: '🪓',
    summary: 'Powerful, intimidating, and very hard to finish off.',
    description:
      'Half-orcs bear the mark of their orc heritage in their strength and their temper, and are judged for it more often than they deserve.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      { type: 'ability', ability: 'str', amount: 2 },
      { type: 'ability', ability: 'con', amount: 1 },
      speed(30),
      size('Medium'),
      darkvision(60),
      language('Common'),
      language('Orc'),
      { type: 'proficiency', category: 'skill', value: 'intimidation' },
      {
        type: 'feature',
        name: 'Relentless Endurance',
        description: 'When you are reduced to 0 hit points but not killed outright, you drop to 1 hit point instead.',
        uses: '1/long rest',
      },
      {
        type: 'feature',
        name: 'Savage Attacks',
        description:
          'When you score a critical hit with a melee weapon attack, roll one of the weapon’s damage dice one extra time and add it.',
      },
    ],
  },

  {
    id: 'tiefling',
    name: 'Tiefling',
    icon: '🔥',
    summary: 'Infernal heritage, innate magic, and a lifetime of sideways looks.',
    description:
      'Tieflings carry a bloodline touched by the Nine Hells. Most learn early that self-reliance is worth more than trust.',
    meta: { Speed: '30 ft.', Size: 'Medium', Darkvision: '60 ft.' },
    effects: [
      { type: 'ability', ability: 'int', amount: 1 },
      { type: 'ability', ability: 'cha', amount: 2 },
      speed(30),
      size('Medium'),
      darkvision(60),
      language('Common'),
      language('Infernal'),
      {
        type: 'feature',
        name: 'Hellish Resistance',
        description: 'You have resistance to fire damage.',
      },
      {
        type: 'feature',
        name: 'Infernal Legacy',
        description:
          'You know the thaumaturgy cantrip. At 3rd level you can cast hellish rebuke as a 2nd-level spell once per long rest; at 5th level you can cast darkness once per long rest. Charisma is your casting ability for these.',
      },
    ],
  },
]

export const races: Collection = {
  id: 'races',
  label: 'Races',
  singular: 'Race',
  entries,
}
