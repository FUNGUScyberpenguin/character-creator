import type { DerivedStat, Ruleset, Step } from '../../engine/types'
import { abilities, abilityMethods, proficiencyCategories, skills } from './basics'
import { backgrounds } from './backgrounds'
import { classes } from './classes'
import { equipment } from './equipment'
import { fightingStyles, invocations, metamagic, pactBoons, subclasses } from './features'
import { races, subraces } from './races'
import { spellCollection } from './spells'
import { applyActionTimings } from './timings'

/**
 * Spell slot progressions. Each row is a character level (row 0 is level 1) and
 * each column a spell level (column 0 is 1st-level slots).
 */
const FULL_CASTER: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

const HALF_CASTER: number[][] = [
  [],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
]

/**
 * Pact Magic. Warlocks get a handful of slots that are always cast at the
 * highest level they have unlocked, so each row holds a single non-zero column.
 */
const WARLOCK: number[][] = (() => {
  const counts = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4]
  const slotLevels = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
  return counts.map((count, index) => {
    const slotLevel = slotLevels[index]!
    const row = new Array<number>(slotLevel).fill(0)
    row[slotLevel - 1] = count
    return row
  })
})()

const derived: DerivedStat[] = [
  {
    id: 'hp',
    label: 'Hit Points',
    slot: 'primary',
    formula: 'stat.hitDie + con.mod + (level - 1) * (floor(stat.hitDie / 2) + 1 + con.mod) + level * stat.hpPerLevel',
    description: 'Maximum hit points, taking the fixed average on each level after the first.',
  },
  {
    id: 'ac',
    label: 'Armor Class',
    slot: 'primary',
    formula:
      'if(stat.unarmoredDefense, 10 + dex.mod + con.mod, if(stat.unarmoredDefenseWis, 10 + dex.mod + wis.mod, if(stat.draconicResilience, 13 + dex.mod, 10 + dex.mod))) + stat.acBonus',
    description: 'Your AC with no armor worn. Wearing armor replaces the 10 + DEX base — see your equipment list.',
  },
  {
    id: 'initiative',
    label: 'Initiative',
    slot: 'primary',
    signed: true,
    formula: 'dex.mod',
  },
  {
    id: 'speed',
    label: 'Speed',
    slot: 'primary',
    formula: 'stat.speed + stat.monkSpeed',
    description: 'Walking speed in feet, including any class or racial adjustment.',
  },
  {
    id: 'proficiency',
    label: 'Proficiency Bonus',
    slot: 'secondary',
    signed: true,
    formula: 'prof',
  },
  {
    id: 'passive-perception',
    label: 'Passive Perception',
    slot: 'secondary',
    formula: '10 + skill.perception',
  },
  {
    id: 'passive-investigation',
    label: 'Passive Investigation',
    slot: 'secondary',
    formula: '10 + skill.investigation',
  },
  {
    id: 'hit-dice',
    label: 'Hit Dice',
    slot: 'secondary',
    formula: 'level',
    format: '{value}d{stat.hitDie}',
    description: 'One hit die per level, of your class’s size. Spent to heal on a short rest.',
  },
]

const collections = [
  races,
  subraces,
  classes,
  backgrounds,
  subclasses,
  fightingStyles,
  metamagic,
  invocations,
  pactBoons,
  equipment,
  spellCollection,
]

// Stamp "when do I use this" onto every feature that has an answer.
applyActionTimings(collections)

const steps: Step[] = [
  {
    id: 'intro',
    kind: 'intro',
    title: 'Let’s build a character',
    subtitle: 'Nine short steps. Nothing is permanent — you can go back and change anything.',
    body: [
      'This wizard walks you through every decision D&D asks of a new character, in the order that makes them easiest to answer. Each screen explains what the choice actually does at the table.',
      'Your work is saved in this browser as you go. Nothing is uploaded anywhere, and there is no account to create.',
      'At the end you get a filled-in PDF character sheet to print or hand to your DM, plus a JSON file you can reload here later.',
    ],
  },
  {
    id: 'level',
    kind: 'level',
    title: 'What level are you starting at?',
    subtitle: 'Most new campaigns start at level 1. Ask your DM if you are joining one already in progress.',
  },
  {
    id: 'race',
    kind: 'pick',
    collection: 'races',
    title: 'Choose a race',
    subtitle: 'Your race sets your size and speed, adjusts your ability scores, and grants a few traits you keep forever.',
  },
  {
    id: 'class',
    kind: 'pick',
    collection: 'classes',
    title: 'Choose a class',
    subtitle: 'This is the big one. Your class decides what you do on your turn, how tough you are, and whether you cast spells.',
  },
  {
    id: 'background',
    kind: 'pick',
    collection: 'backgrounds',
    title: 'Choose a background',
    subtitle: 'What you did before adventuring. Backgrounds give you skills, some kit, and a hook for the DM to pull on.',
  },
  {
    id: 'abilities',
    kind: 'abilities',
    title: 'Set your ability scores',
    subtitle: 'Six numbers that underpin nearly every roll. Pick a method, then assign them.',
  },
  {
    id: 'choices',
    kind: 'choices',
    title: 'Finishing touches',
    subtitle: 'Anything still outstanding from your race, class, or background shows up here.',
  },
  {
    id: 'equipment',
    kind: 'equipment',
    collection: 'equipment',
    title: 'Equipment',
    subtitle: 'Your starting gear is already listed. Add anything else you have bought or been given.',
  },
  {
    id: 'spells',
    kind: 'spells',
    collection: 'spells',
    title: 'Spells',
    subtitle: 'Choose the spells you know or prepare. Skip this step entirely if you do not cast.',
  },
  {
    id: 'identity',
    kind: 'identity',
    title: 'Who are they?',
    subtitle:
      'The part everyone remembers. These are prompts, not a form — answer the two or three that spark something and leave the rest blank.',
    fields: [
      { id: 'pronouns', label: 'Pronouns', kind: 'text', placeholder: 'they/them' },
      {
        id: 'alignment',
        label: 'Alignment',
        kind: 'select',
        hint: 'A rough compass heading. Plenty of tables ignore it entirely.',
        options: ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'],
      },
      { id: 'age', label: 'Age', kind: 'text', placeholder: '27' },
      {
        id: 'appearance',
        label: 'What does someone notice first?',
        kind: 'textarea',
        hint: 'One physical detail beats a full description. Give the table something to picture.',
        suggestions: [
          'A soldier’s posture they have never managed to drop.',
          'Ink stains on every finger, no matter how recently they washed.',
          'A laugh far too loud for their size.',
          'They never quite meet your eye, and they always know where the exits are.',
        ],
      },
      {
        id: 'motivation',
        label: 'Why are they out here adventuring?',
        kind: 'textarea',
        hint: 'The most useful single line in a backstory. Your character needs a reason to leave home and keep going.',
        suggestions: [
          'They owe someone dangerous a great deal of money.',
          'They are looking for a person who walked out ten years ago.',
          'They were thrown out and intend to come back rich enough to matter.',
          'Someone has to do it, and everyone else said no.',
        ],
      },
      {
        id: 'connection',
        label: 'Name one person who is still alive and matters to them',
        kind: 'textarea',
        hint: 'Living people give your DM someone to write into the story. A dead family is a closed door; a living sister is a hook.',
        suggestions: [
          'Their old mentor, who still writes and still disapproves.',
          'A younger sibling they send money to every month.',
          'The friend they left behind, who does not know why.',
          'A creditor who is patient, for now.',
        ],
      },
      {
        id: 'loves',
        label: 'Something they love',
        kind: 'textarea',
        hint: 'Not a tragedy — a pleasure. A food, a song, a habit. This is what makes a character feel like a person at the table.',
        suggestions: [
          'Cheap pastry, eaten walking, ideally stolen.',
          'Arguing about things that do not matter.',
          'Being the first one awake in a quiet camp.',
          'Any dog. Every dog.',
        ],
      },
      {
        id: 'flaws',
        label: 'What reliably gets them into trouble?',
        kind: 'textarea',
        hint: 'Give the DM permission to complicate your life. A flaw you actually play is worth more than a heroic backstory.',
        suggestions: [
          'They cannot walk away from a bet.',
          'They assume they are the smartest person in the room, and say so.',
          'They lie first and think about it afterwards.',
          'They would rather be liked than be right.',
        ],
      },
      {
        id: 'ideals',
        label: 'What do they believe is worth doing?',
        kind: 'textarea',
        hint: 'Optional. Useful when a decision splits the party.',
      },
      {
        id: 'backstory',
        label: 'Anything else',
        kind: 'textarea',
        hint: 'A paragraph is plenty. Your DM will read it — keep it short enough that they enjoy doing so.',
      },
    ],
  },
  {
    id: 'review',
    kind: 'review',
    title: 'Your character',
    subtitle: 'Everything in one place. Download the PDF when you are happy with it.',
  },
]

export const dnd5e: Ruleset = {
  id: 'dnd5e-srd',
  name: 'D&D 5e (SRD 5.1)',
  version: '1.0.0',
  summary:
    'The fifth-edition rules published by Wizards of the Coast in the Systems Reference Document 5.1, covering twelve classes, nine races, and the full SRD spell list.',
  license: {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/legalcode',
    notice:
      'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License.',
  },
  maxLevel: 20,
  proficiencyBonus: '2 + floor((level - 1) / 4)',
  abilityScoreMax: 20,
  abilities,
  skills,
  proficiencyCategories,
  abilityMethods,
  collections,
  steps,
  derived,
  spellSlotTables: {
    full: FULL_CASTER,
    half: HALF_CASTER,
    warlock: WARLOCK,
  },
  baseStats: {
    speed: 30,
    size: 'Medium',
    hitDie: 8,
    hpPerLevel: 0,
    acBonus: 0,
    darkvision: 0,
    monkSpeed: 0,
    unarmoredDefense: 0,
    unarmoredDefenseWis: 0,
    draconicResilience: 0,
  },
  spellcastingFormulas: {
    saveDC: '8 + prof + castingMod',
    attackBonus: 'prof + castingMod',
  },
  actionTimings: [
    { id: 'action', label: 'Action' },
    { id: 'bonus', label: 'Bonus action' },
    { id: 'reaction', label: 'Reaction' },
    { id: 'free', label: 'No action' },
    { id: 'passive', label: 'Always on' },
  ],
  weapons: {
    collection: 'equipment',
    tag: 'weapon',
    proficiencyCategory: 'weapon',
    abilityRules: [
      // Finesse lets you use whichever of Strength or Dexterity is better.
      { property: 'Finesse', abilities: ['str', 'dex'] },
      { tag: 'ranged', abilities: ['dex'] },
      { abilities: ['str'] },
    ],
    blanketProficiencies: {
      simple: 'Simple weapons',
      martial: 'Martial weapons',
    },
    attackFormula: 'weaponMod + if(proficient, prof, 0)',
    damageBonusFormula: 'weaponMod',
  },
}
