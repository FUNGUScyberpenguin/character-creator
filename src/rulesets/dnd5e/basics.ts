import type { AbilityDef, AbilityMethod, ProficiencyCategory, SkillDef } from '../../engine/types'

export const abilities: AbilityDef[] = [
  { id: 'str', name: 'Strength', abbr: 'STR', description: 'Raw physical power, athletics, and how hard you hit.' },
  { id: 'dex', name: 'Dexterity', abbr: 'DEX', description: 'Agility, reflexes, balance, and finesse.' },
  { id: 'con', name: 'Constitution', abbr: 'CON', description: 'Health, stamina, and how much punishment you soak up.' },
  { id: 'int', name: 'Intelligence', abbr: 'INT', description: 'Recall, reasoning, and study.' },
  { id: 'wis', name: 'Wisdom', abbr: 'WIS', description: 'Perception, intuition, and force of insight.' },
  { id: 'cha', name: 'Charisma', abbr: 'CHA', description: 'Confidence, presence, and force of personality.' },
]

export const skills: SkillDef[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: 'Arcana', ability: 'int' },
  { id: 'athletics', name: 'Athletics', ability: 'str' },
  { id: 'deception', name: 'Deception', ability: 'cha' },
  { id: 'history', name: 'History', ability: 'int' },
  { id: 'insight', name: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: 'Investigation', ability: 'int' },
  { id: 'medicine', name: 'Medicine', ability: 'wis' },
  { id: 'nature', name: 'Nature', ability: 'int' },
  { id: 'perception', name: 'Perception', ability: 'wis' },
  { id: 'performance', name: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: 'Religion', ability: 'int' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Stealth', ability: 'dex' },
  { id: 'survival', name: 'Survival', ability: 'wis' },
]

export const allSkillIds = skills.map((skill) => skill.id)

export const proficiencyCategories: ProficiencyCategory[] = [
  { id: 'skill', label: 'Skills', usesAbilityModifier: true },
  { id: 'save', label: 'Saving Throws', usesAbilityModifier: true },
  { id: 'armor', label: 'Armor' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'tool', label: 'Tools' },
  { id: 'language', label: 'Languages' },
]

/** Point-buy costs from the SRD: 8 is free, 14 and 15 cost extra. */
const pointBuyCosts: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
}

export const abilityMethods: AbilityMethod[] = [
  {
    id: 'standard-array',
    name: 'Standard array',
    description: 'Assign the fixed set 15, 14, 13, 12, 10, 8. Fast, balanced, and the easiest place to start.',
    kind: 'array',
    array: [15, 14, 13, 12, 10, 8],
  },
  {
    id: 'point-buy',
    name: 'Point buy',
    description: 'Spend 27 points to raise each score from 8 to at most 15. The most control, at the cost of some maths.',
    kind: 'point-buy',
    points: 27,
    min: 8,
    max: 15,
    costs: pointBuyCosts,
  },
  {
    id: 'roll',
    name: 'Roll 4d6, drop lowest',
    description: 'Roll six scores and assign them how you like. Swingy — you might end up a hero or a liability.',
    kind: 'roll',
    dice: '4d6kh3',
  },
  {
    id: 'manual',
    name: 'Enter manually',
    description: 'Type the numbers straight in. Use this if your table rolled at the table or uses a house rule.',
    kind: 'manual',
    min: 1,
    max: 30,
  },
]

export const languages = [
  'Common',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
  'Abyssal',
  'Celestial',
  'Draconic',
  'Deep Speech',
  'Infernal',
  'Primordial',
  'Sylvan',
  'Undercommon',
]

/** Languages a player may pick, excluding the one everyone already speaks. */
export const selectableLanguages = languages.filter((language) => language !== 'Common')

export const toolProficiencies = [
  "Alchemist's supplies",
  "Brewer's supplies",
  "Calligrapher's supplies",
  "Carpenter's tools",
  "Cartographer's tools",
  "Cobbler's tools",
  "Cook's utensils",
  "Glassblower's tools",
  "Jeweler's tools",
  "Leatherworker's tools",
  "Mason's tools",
  "Painter's supplies",
  "Potter's tools",
  "Smith's tools",
  "Tinker's tools",
  "Weaver's tools",
  "Woodcarver's tools",
  'Disguise kit',
  'Forgery kit',
  'Herbalism kit',
  "Navigator's tools",
  "Poisoner's kit",
  "Thieves' tools",
  'Dice set',
  'Playing card set',
  'Bagpipes',
  'Drum',
  'Dulcimer',
  'Flute',
  'Lute',
  'Lyre',
  'Horn',
  'Pan flute',
  'Shawm',
  'Viol',
]
