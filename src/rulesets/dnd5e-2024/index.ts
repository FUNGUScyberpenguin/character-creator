import type { DerivedStat, Ruleset, Step } from '../../engine/types'
import { abilities, abilityMethods, proficiencyCategories, skills } from '../dnd5e/basics'
import { identityFields } from '../dnd5e/identity'
import { classes } from './classes'
import { equipment, masteries } from './equipment'
import { epicBoons, fightingStyles, invocations, metamagic, subclasses } from './features'
import { spellCollection } from './spells'
import { backgrounds, feats, lineages, species } from './origins'

/**
 * D&D 5e as published in SRD 5.2 — the 2024 revision.
 *
 * This is a sibling of the 5.1 ruleset, not a replacement. Both editions are in
 * active play, tables are split between them, and a character built under one
 * is not a character built under the other. The picker offers both and the
 * engine does not care which is chosen.
 *
 * Data is shared with the 5.1 module where the two editions genuinely agree —
 * the six abilities, the eighteen skills, the price of a longsword. It is
 * written out fresh wherever they do not, which is most of what a character
 * actually consists of, including the whole spell list.
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
  [2],
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
 * Pact Magic. Every slot is cast at the highest level the warlock has unlocked,
 * so each row holds a single non-zero column.
 */
const WARLOCK: number[][] = (() => {
  const counts = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4]
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
    // Worn armour replaces the unarmoured base entirely; shields and feature
    // bonuses stack on top of whichever applies. Draconic Resilience is a
    // Dexterity-and-Charisma calculation in 2024, where 2014 used a flat 13.
    formula:
      'if(stat.wearingArmor, stat.armorAC, if(stat.unarmoredDefense, 10 + dex.mod + con.mod, if(stat.unarmoredDefenseWis, 10 + dex.mod + wis.mod, if(stat.draconicResilience, 10 + dex.mod + cha.mod, 10 + dex.mod)))) + stat.shieldBonus + stat.acBonus',
    description: 'Includes whatever armor and shield you have equipped.',
  },
  {
    id: 'initiative',
    label: 'Initiative',
    slot: 'primary',
    signed: true,
    // The Alert origin feat adds proficiency to Initiative, which enough
    // characters take that it is worth reading here rather than as a note.
    formula: 'dex.mod + if(stat.initiativeProficiency, prof, 0)',
  },
  {
    id: 'speed',
    label: 'Speed',
    slot: 'primary',
    formula: 'stat.speed + stat.monkSpeed',
    description: 'Walking speed in feet, including any class or species adjustment.',
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
    label: 'Hit Point Dice',
    slot: 'secondary',
    formula: 'level',
    format: '{value}d{stat.hitDie}',
    description: 'One die per level, of your class’s size. Spent to heal on a Short Rest.',
  },
  {
    id: 'sneak-attack',
    label: 'Sneak Attack',
    slot: 'combat',
    formula: 'stat.sneakAttack',
    format: '{value}d6',
    description: 'Extra damage once per turn, when you have advantage or an ally is beside the target.',
  },
  {
    id: 'martial-arts',
    label: 'Martial Arts Die',
    slot: 'combat',
    formula: 'stat.martialArts',
    format: 'd{value}',
    description: 'The damage die for your Unarmed Strikes and Monk weapons.',
  },
]

const collections = [
  species,
  lineages,
  classes,
  backgrounds,
  feats,
  subclasses,
  fightingStyles,
  metamagic,
  invocations,
  epicBoons,
  masteries,
  equipment,
  spellCollection,
]

const steps: Step[] = [
  {
    id: 'intro',
    kind: 'intro',
    title: 'Let’s build a character',
    subtitle: 'Ten short steps. Nothing is permanent — you can go back and change anything.',
    body: [
      'These are the 2024 rules. The biggest change to character creation: your species no longer adjusts your ability scores. Your background does, and it also hands you your first feat.',
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
    id: 'species',
    kind: 'pick',
    collection: 'species',
    title: 'Choose a species',
    subtitle: 'Your species sets your size, speed and senses, and grants traits you keep forever. It does not change your ability scores — that comes later.',
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
    subtitle: 'What you did before adventuring — and, in these rules, where your ability score increases and your first feat come from.',
  },
  {
    id: 'abilities',
    kind: 'abilities',
    title: 'Set your ability scores',
    subtitle: 'Six numbers that underpin nearly every roll. Pick a method, assign them, and your background’s increases are added on top.',
  },
  {
    id: 'choices',
    kind: 'choices',
    title: 'Finishing touches',
    subtitle: 'Anything still outstanding from your species, class, or background shows up here.',
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
    subtitle: 'Choose the spells you prepare. Skip this step entirely if you do not cast.',
  },
  {
    id: 'identity',
    kind: 'identity',
    title: 'Who are they?',
    subtitle:
      'The part everyone remembers. These are prompts, not a form — answer the two or three that spark something and leave the rest blank.',
    fields: identityFields,
  },
  {
    id: 'review',
    kind: 'review',
    title: 'Your character',
    subtitle: 'Everything in one place. Download the PDF when you are happy with it.',
  },
]

export const dnd5e2024: Ruleset = {
  id: 'dnd5e-srd-52',
  name: 'D&D 5e (2024 rules, SRD 5.2)',
  version: '1.0.0',
  summary:
    'The 2024 revision of fifth edition, from Systems Reference Document 5.2. Species no longer change your ability scores — your background does, and it grants an origin feat as well. Adds weapon mastery, moves every subclass to 3rd level, and turns 19th level into an Epic Boon.',
  license: {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/legalcode',
    notice:
      'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License.',
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
    martialArts: 0,
    sneakAttack: 0,
    bardicDie: 0,
    favoredEnemy: 0,
    unarmoredDefense: 0,
    unarmoredDefenseWis: 0,
    draconicResilience: 0,
    initiativeProficiency: 0,
    cantripsKnown: 0,
    spellsPrepared: 0,
    channelDivinity: 0,
    secondWind: 0,
    wildShape: 0,
    rages: 0,
    rageDamage: 0,
    armorAC: 0,
    shieldBonus: 0,
    wearingArmor: 0,
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
  armor: {
    collection: 'equipment',
    tag: 'armor',
    shieldTag: 'shield',
    ability: 'dex',
    strengthAbility: 'str',
    proficiencyCategory: 'armor',
    blanketProficiencies: {
      light: ['Light armor', 'All armor', 'Light armor (nonmetal)'],
      medium: ['Medium armor', 'All armor', 'Medium armor (nonmetal)'],
      heavy: ['Heavy armor', 'All armor'],
      shield: ['Shields', 'Shields (nonmetal)'],
    },
  },
  weapons: {
    collection: 'equipment',
    tag: 'weapon',
    proficiencyCategory: 'weapon',
    abilityRules: [
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
