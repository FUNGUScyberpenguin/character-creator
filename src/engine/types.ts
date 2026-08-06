/**
 * Core, system-agnostic types.
 *
 * Nothing in this file knows about D&D, Pathfinder, or any other game. A
 * "ruleset" is data: it declares which abilities exist, what the player picks
 * and in what order, what those picks grant, and how the numbers on the final
 * sheet are computed. The engine walks that data; the UI renders it.
 *
 * See docs/RULESET_FORMAT.md for a guided tour.
 */

/** An expression evaluated by `src/engine/expression.ts`, e.g. `"10 + mod(dex)"`. */
export type Expression = string

/**
 * When something is used on your turn. Rulesets with a different action economy
 * declare their own labels in `Ruleset.actionTimings`.
 */
export type ActionTiming = string

// ---------------------------------------------------------------------------
// Abilities, skills, proficiencies
// ---------------------------------------------------------------------------

export interface AbilityDef {
  id: string
  name: string
  /** Short form used on the sheet, e.g. "STR". */
  abbr: string
  description?: string
}

export interface SkillDef {
  id: string
  name: string
  /** Ability id whose modifier this skill adds. */
  ability: string
  description?: string
}

/**
 * Categories a character can be proficient in. Rulesets declare their own, so a
 * system with "lores" or "disciplines" instead of "tools" simply says so.
 */
export interface ProficiencyCategory {
  id: string
  /** Plural label for sheet sections, e.g. "Tools". */
  label: string
  /** When true, the sheet lists these next to the relevant ability modifier. */
  usesAbilityModifier?: boolean
}

// ---------------------------------------------------------------------------
// Effects — the only way content changes a character
// ---------------------------------------------------------------------------

export type Effect =
  /** Raise (or lower, with a negative amount) an ability score. */
  | { type: 'ability'; ability: string; amount: number }
  /** Become proficient in something. `category` matches a ProficiencyCategory id. */
  | { type: 'proficiency'; category: string; value: string; expertise?: boolean }
  /** Write a value into the stat bag, where derived expressions can read it. */
  | { type: 'set'; stat: string; value: number | string }
  /** Add to a numeric stat already in the bag (defaults to 0 if absent). */
  | { type: 'bonus'; stat: string; amount: number }
  /** A descriptive feature that appears on the sheet. */
  | {
      type: 'feature'
      name: string
      description: string
      /** Optional "3/long rest"-style usage note. */
      uses?: string
      /**
       * When this is used, if it is something you *do*. Features carrying a
       * timing are collected into the sheet's "on your turn" section, which is
       * the part players actually read mid-combat.
       */
      action?: ActionTiming
    }
  /** A tracked, numeric pool such as Rage uses or Ki points. */
  | { type: 'resource'; name: string; formula: Expression }
  /** Marks the character as a spellcaster and configures the spells step. */
  | {
      type: 'spellcasting'
      /** Distinguishes multiple casting sources on one sheet. */
      id: string
      label: string
      ability: string
      /** "prepared" casters choose daily; "known" casters lock choices in. */
      preparation: 'prepared' | 'known'
      /** Id of the spell list (a tag on spell entries) this source draws from. */
      list: string
      /** Key into `Ruleset.spellSlotTables`. */
      slots?: string
      cantripsKnown?: Expression
      spellsKnown?: Expression
    }
  /** Put an item in the character's pack. */
  | { type: 'item'; item: string; quantity?: number }
  /** Free-form line for anything the sheet should simply state. */
  | { type: 'note'; text: string }

// ---------------------------------------------------------------------------
// Choices — decisions deferred to the player
// ---------------------------------------------------------------------------

export interface ChoiceOption {
  id: string
  name: string
  summary?: string
  description?: string
  effects?: Effect[]
  /** Options may themselves open further choices (a subclass, say). */
  choices?: Choice[]
}

export type ChoiceSource =
  /** Pick skills. Omit `from` to allow any skill in the ruleset. */
  | { kind: 'skills'; from?: string[] }
  /** Pick abilities to raise by `amount` each. */
  | { kind: 'abilities'; amount: number; from?: string[] }
  /** Pick proficiencies of one category from a list. */
  | { kind: 'proficiencies'; category: string; from: string[] }
  /** Pick entries out of a named collection, optionally filtered by tag. */
  | { kind: 'collection'; collection: string; tag?: string }
  /** An explicit, hand-written list of options. */
  | { kind: 'options'; options: ChoiceOption[] }

export interface Choice {
  /** Unique within the entry or option that declares it. */
  id: string
  prompt: string
  /** How many options to select. Defaults to 1. */
  count?: number
  /** Allow the same option more than once (e.g. +1/+1 to one ability). */
  allowDuplicates?: boolean
  source: ChoiceSource
  /** Only offer this choice once the character reaches this level. */
  minLevel?: number
  /**
   * The selection helps name the character (a subrace, a bloodline) and so
   * belongs in the line under their name rather than only in their features.
   */
  descriptor?: boolean
}

// ---------------------------------------------------------------------------
// Content collections
// ---------------------------------------------------------------------------

/** Something gained at a specific character level, e.g. a class feature. */
export interface LevelGrant {
  level: number
  effects?: Effect[]
  choices?: Choice[]
}

export interface Entry {
  id: string
  name: string
  /** One line shown on the selection card. */
  summary?: string
  /** Longer prose shown when the card is expanded. */
  description?: string
  /** Emoji or short glyph used as the card's visual anchor. */
  icon?: string
  /** Small key/value chips shown on the card, e.g. { 'Hit Die': 'd10' }. */
  meta?: Record<string, string | number>
  /**
   * What a turn actually looks like, in plain language. Shown prominently,
   * because a new player cannot predict this from a list of granted features.
   */
  atTheTable?: string
  tags?: string[]
  effects?: Effect[]
  choices?: Choice[]
  /** Grants that unlock as the character levels up. */
  levels?: LevelGrant[]
}

/** A way to narrow a long list of entries by what the player wants, not by name. */
export interface Facet {
  id: string
  /** Question form, e.g. "What do you want to do at the table?" */
  label: string
  options: { value: string; label: string; description?: string }[]
}

export interface Collection {
  id: string
  /** Plural label, e.g. "Classes". */
  label: string
  /** Singular label used in prompts, e.g. "Class". */
  singular: string
  entries: Entry[]
  /** Optional filters shown above the cards; entries opt in via `tags`. */
  facets?: Facet[]
}

// ---------------------------------------------------------------------------
// Ability score generation
// ---------------------------------------------------------------------------

export interface AbilityMethod {
  id: string
  name: string
  description: string
  kind: 'array' | 'point-buy' | 'roll' | 'manual'
  /** For `array`: the fixed set of scores to assign. */
  array?: number[]
  /** For `point-buy`: total points, legal range, and cost per score. */
  points?: number
  min?: number
  max?: number
  costs?: Record<number, number>
  /** For `roll`: dice expression rolled per ability, e.g. "4d6kh3". */
  dice?: string
}

// ---------------------------------------------------------------------------
// Wizard steps
// ---------------------------------------------------------------------------

export interface IdentityField {
  id: string
  label: string
  kind: 'text' | 'textarea' | 'select'
  placeholder?: string
  options?: string[]
  /** Blocks progress until filled in. */
  required?: boolean
  /** A sentence explaining why this question is worth answering. */
  hint?: string
  /** Example answers, offered one at a time behind a "give me an idea" button. */
  suggestions?: string[]
}

export type Step =
  | { id: string; kind: 'intro'; title: string; subtitle?: string; body: string[] }
  | { id: string; kind: 'level'; title: string; subtitle?: string }
  | { id: string; kind: 'identity'; title: string; subtitle?: string; fields: IdentityField[] }
  | {
      id: string
      kind: 'pick'
      title: string
      subtitle?: string
      /** Collection to choose from. */
      collection: string
      /** How many entries to pick. Defaults to 1. */
      count?: number
    }
  | { id: string; kind: 'abilities'; title: string; subtitle?: string }
  | { id: string; kind: 'choices'; title: string; subtitle?: string }
  | { id: string; kind: 'equipment'; title: string; subtitle?: string; collection: string }
  | { id: string; kind: 'spells'; title: string; subtitle?: string; collection: string }
  | { id: string; kind: 'review'; title: string; subtitle?: string }

export type StepKind = Step['kind']

// ---------------------------------------------------------------------------
// Derived statistics
// ---------------------------------------------------------------------------

export interface DerivedStat {
  id: string
  label: string
  formula: Expression
  /** Where the sheet shows this value. */
  slot?: 'primary' | 'secondary' | 'combat'
  /** Render with a leading + or - (attack bonuses, initiative). */
  signed?: boolean
  /**
   * Template for how the value is written on the sheet. `{value}` is the result
   * of `formula`; any other `{name}` is looked up in the formula context, so
   * hit dice can read `"{value}d{stat.hitDie}"` and print `5d6`.
   */
  format?: string
  description?: string
}

// ---------------------------------------------------------------------------
// The ruleset itself
// ---------------------------------------------------------------------------

export interface RulesetLicense {
  name: string
  url?: string
  /** Attribution text reproduced in the app and on exported sheets. */
  notice: string
}

export interface Ruleset {
  id: string
  name: string
  version: string
  /** One paragraph shown on the ruleset picker. */
  summary: string
  license: RulesetLicense
  maxLevel: number
  /** Expression in terms of `level`, e.g. "2 + floor((level - 1) / 4)". */
  proficiencyBonus: Expression
  abilities: AbilityDef[]
  skills: SkillDef[]
  proficiencyCategories: ProficiencyCategory[]
  abilityMethods: AbilityMethod[]
  collections: Collection[]
  steps: Step[]
  derived: DerivedStat[]
  /** Slot progressions keyed by name; each row is a character level (1-indexed). */
  spellSlotTables?: Record<string, number[][]>
  /** Defaults written into the stat bag before any effect is applied. */
  baseStats?: Record<string, number | string>
  /** Ceiling applied to every final ability score, if the system has one. */
  abilityScoreMax?: number
  /**
   * Per-source spellcasting numbers. Evaluated with the usual context plus
   * `castingMod`, the modifier of that source's casting ability.
   */
  spellcastingFormulas?: {
    saveDC?: Expression
    attackBonus?: Expression
  }
  /**
   * The order timings appear in on the sheet, and how they are labelled.
   * Anything a feature declares that is not listed here still shows, at the end.
   */
  actionTimings?: { id: ActionTiming; label: string }[]
  /**
   * How carried weapons become attack lines. Without this the sheet simply
   * lists equipment, which is what a system with no weapon attacks wants.
   */
  weapons?: WeaponRules
  /** How worn armour contributes to defence. Omit for systems without it. */
  armor?: ArmorRules
}

/**
 * How worn armour is read.
 *
 * The engine works out the armour's contribution and writes it into the stat
 * bag as `stat.armorAC`, `stat.shieldBonus` and `stat.wearingArmor`. The
 * ruleset's own Armor Class formula decides what to do with those, so a system
 * where armour subtracts from a target number expresses that in the formula
 * rather than needing different code.
 */
export interface ArmorRules {
  collection: string
  /** Tag marking a wearable entry. */
  tag: string
  /** Tag marking a shield, which stacks on top of body armour. */
  shieldTag?: string
  /** Ability whose modifier armour adds, subject to the armour's cap. */
  ability?: string
  /** Meta keys holding the structured rule. */
  baseKey?: string
  dexMaxKey?: string
  bonusKey?: string
  /** Meta key holding a minimum score in `strengthAbility` to wear it freely. */
  strengthKey?: string
  strengthAbility?: string
  /** Proficiency category checked; wearing armour you lack is flagged. */
  proficiencyCategory?: string
  /**
   * Proficiency values covering a whole tag, e.g. `{ heavy: 'Heavy armor' }`.
   * A blanket "All armor" value can be listed under every tag.
   */
  blanketProficiencies?: Record<string, string[]>
}

/**
 * Turns an item in the pack into a row of "what do I roll".
 *
 * The engine matches inventory against a collection by name, works out which
 * ability applies, checks proficiency, and evaluates the two formulas with
 * `weaponMod` (the chosen ability's modifier) and `proficient` (1 or 0) in
 * scope alongside the usual context.
 */
export interface WeaponRules {
  /** Collection holding the items — normally the equipment list. */
  collection: string
  /** Tag marking an entry as a weapon. */
  tag: string
  /** Proficiency category checked for weapon proficiency. */
  proficiencyCategory: string
  /**
   * Which ability a weapon uses, first match wins. `property` matches against
   * the entry's properties text, `tag` against its tags. Listing more than one
   * ability takes the best of them, which is how "finesse" works.
   */
  abilityRules: { property?: string; tag?: string; abilities: string[] }[]
  /**
   * Proficiency values that cover a whole tag, e.g. `{ martial: 'Martial weapons' }`
   * means holding "Martial weapons" makes you proficient with every martial tag.
   */
  blanketProficiencies?: Record<string, string>
  /** Meta key holding the damage dice, e.g. "Damage". */
  damageKey?: string
  /** Meta key holding the properties text, e.g. "Properties". */
  propertiesKey?: string
  attackFormula?: Expression
  damageBonusFormula?: Expression
}
