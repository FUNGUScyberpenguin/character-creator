import type { Collection, Effect, Entry } from '../../engine/types'

/**
 * Subclasses, fighting styles, metamagic, invocations and epic boons for
 * SRD 5.2.
 *
 * Two structural changes from 2014 shape this file:
 *
 * - **Every class takes its subclass at 3rd level.** In 2014 clerics, druids,
 *   sorcerers, warlocks and wizards chose at 1st or 2nd. Here the subclass step
 *   lands in the same place for all twelve, which is why nothing in this file
 *   needs a per-class level.
 * - **19th level is an Epic Boon, not an Ability Score Improvement.** Boons are
 *   a collection like any other, so the choice is offered the same way a
 *   subclass is.
 *
 * As with the rest of this module, the contents are what SRD 5.2 publishes: one
 * subclass per class, four Fighting Style feats, ten Metamagic options,
 * twenty-seven invocations and seven Epic Boons.
 */

const feature = (name: string, description: string, uses?: string, action?: string): Effect => ({
  type: 'feature',
  name,
  description,
  ...(uses ? { uses } : {}),
  ...(action ? { action } : {}),
})

const subclass = (
  id: string,
  tag: string,
  name: string,
  summary: string,
  atTheTable: string,
  effects: Effect[],
  choices?: Entry['choices'],
): Entry => ({
  id,
  name,
  tags: [tag],
  summary,
  atTheTable,
  effects,
  ...(choices ? { choices } : {}),
})

// ---------------------------------------------------------------------------
// Subclasses — one per class, which is what the SRD publishes
// ---------------------------------------------------------------------------

export const subclasses: Collection = {
  id: 'subclasses',
  label: 'Subclasses',
  singular: 'Subclass',
  entries: [
    subclass(
      'berserker',
      'barbarian',
      'Path of the Berserker',
      'Reckless attacks hit far harder, and your rage eventually terrifies the room.',
      'Attack recklessly every round for a pile of extra d6s. Later your rage frightens everything within 30 feet.',
      [
        feature('Frenzy', 'If you use Reckless Attack while raging, the first target you hit on your turn with a Strength-based attack takes extra damage: roll a number of d6s equal to your Rage Damage bonus.', undefined, 'free'),
        feature('Mindless Rage', 'From 6th level you have Immunity to the Charmed and Frightened conditions while raging. If either is on you when you enter your Rage, it ends.', undefined, 'passive'),
        feature('Retaliation', 'From 10th level, as a Reaction when a creature within 5 feet damages you, you can make one melee attack against it.', undefined, 'reaction'),
        feature('Intimidating Presence', 'From 14th level, as a Bonus Action each creature you choose in a 30-foot Emanation makes a Wisdom save (DC 8 + your Strength modifier + your proficiency bonus) or is Frightened for 1 minute. You can restore a use by expending a Rage.', '1/long rest', 'bonus'),
      ],
    ),
    subclass(
      'lore',
      'bard',
      'College of Lore',
      'Three more skills, a reaction that spoils enemy rolls, and spells from other classes.',
      'Spend Bardic Inspiration as a Reaction to turn an enemy’s success into a failure, and pick up spells no bard should have.',
      [
        feature('Cutting Words', 'As a Reaction when a creature you can see within 60 feet makes a damage roll, or succeeds on an ability check or attack roll, expend one use of Bardic Inspiration and subtract the die from their roll.', undefined, 'reaction'),
        feature('Magical Discoveries', 'From 6th level you learn two spells of your choice from the Cleric, Druid or Wizard lists. They are always prepared, and you can swap one whenever you gain a Bard level.', undefined, 'passive'),
        feature('Peerless Skill', 'From 14th level, when you fail an ability check or attack roll you can expend a use of Bardic Inspiration and add the die to the d20. On a failure the use is not spent.', undefined, 'free'),
      ],
      [{ id: 'bonus-proficiencies', prompt: 'Bonus Proficiencies — three skills', count: 3, source: { kind: 'skills' } }],
    ),
    subclass(
      'life-domain',
      'cleric',
      'Life Domain',
      'The best healer in the game, in heavy armour.',
      'Heal more than the dice say, and burn Channel Divinity to put a whole party back on its feet at once.',
      [
        { type: 'proficiency', category: 'armor', value: 'Heavy armor' },
        feature('Disciple of Life', 'Whenever a spell you cast with a spell slot restores hit points, the target regains extra hit points equal to 2 plus the slot’s level.', undefined, 'passive'),
        feature('Life Domain Spells', 'You always have prepared: Aid, Bless, Cure Wounds and Lesser Restoration at 3rd level; Mass Healing Word and Revivify at 5th; Aura of Life and Death Ward at 7th; Greater Restoration and Mass Cure Wounds at 9th.', undefined, 'passive'),
        feature('Preserve Life', 'As a Magic action, present your Holy Symbol and expend a use of Channel Divinity to restore hit points equal to five times your cleric level, divided among Bloodied creatures within 30 feet. No creature can go above half its hit point maximum this way.', undefined, 'action'),
        feature('Blessed Healer', 'From 6th level, immediately after you cast a spell with a slot that restores hit points to someone else, you regain 2 plus the slot’s level in hit points.', undefined, 'passive'),
        feature('Supreme Healing', 'From 17th level, when you would roll dice to restore hit points with a spell or Channel Divinity, use the highest number possible on each die instead.', undefined, 'passive'),
      ],
    ),
    subclass(
      'circle-of-the-land',
      'druid',
      'Circle of the Land',
      'A spell list shaped by where you are, and magic that recharges itself.',
      'Pick a land each morning for a free set of prepared spells, and spend Wild Shape uses on a damage-and-heal burst instead of transforming.',
      [
        feature('Circle of the Land Spells', 'Whenever you finish a Long Rest, choose arid, polar, temperate or tropical. You have that land’s spells prepared for your level and lower — for example, temperate gives Misty Step, Shocking Grasp and Sleep at 3rd level, Lightning Bolt at 5th, Freedom of Movement at 7th, and Tree Stride at 9th.', undefined, 'passive'),
        feature('Land’s Aid', 'As a Magic action, expend a Wild Shape use to fill a 10-foot-radius Sphere within 60 feet with flowers and thorns. Creatures you choose there take 2d6 necrotic damage on a failed Constitution save, half on a success, and one creature you choose regains 2d6 hit points. Both rise at 10th (3d6) and 14th (4d6) level.', undefined, 'action'),
        feature('Natural Recovery', 'From 6th level you can cast one of your prepared Circle spells of level 1 or higher without a slot, once per Long Rest. On a Short Rest you can also recover spell slots totalling half your druid level, rounded up, none of them level 6 or higher.', undefined, 'free'),
        feature('Nature’s Ward', 'From 10th level you have Immunity to the Poisoned condition and Resistance to the damage type associated with your current land.', undefined, 'passive'),
        feature('Nature’s Sanctuary', 'From 14th level, as a Magic action you can expend a Wild Shape use to create a 15-foot Cube of spectral flora for 1 minute, giving you and your allies inside Half Cover and your land’s damage resistance.', undefined, 'action'),
      ],
    ),
    subclass(
      'champion',
      'fighter',
      'Champion',
      'Critical hits on 19, and nothing else to remember.',
      'Attack. Crit more often than anyone else. There is genuinely nothing to track.',
      [
        feature('Improved Critical', 'Your attack rolls with weapons and Unarmed Strikes score a Critical Hit on a 19 or 20.', undefined, 'passive'),
        feature('Remarkable Athlete', 'You have advantage on Initiative rolls and Strength (Athletics) checks. Immediately after a Critical Hit you can move up to half your Speed without provoking Opportunity Attacks.', undefined, 'passive'),
        feature('Additional Fighting Style', 'At 7th level you gain another Fighting Style feat of your choice.', undefined, 'passive'),
        feature('Heroic Warrior', 'From 10th level, during combat you can give yourself Heroic Inspiration whenever you start your turn without it.', undefined, 'free'),
        feature('Superior Critical', 'From 15th level your attacks score a Critical Hit on an 18, 19 or 20.', undefined, 'passive'),
        feature('Survivor', 'From 18th level you have advantage on Death Saving Throws and treat an 18–20 on one as a 20. At the start of each of your turns you regain 5 plus your Constitution modifier in hit points if you are Bloodied and above 0.', undefined, 'passive'),
      ],
    ),
    subclass(
      'open-hand',
      'monk',
      'Warrior of the Open Hand',
      'The purest martial artist: knock down, push back, and eventually kill with a touch.',
      'Every Flurry of Blows hit can also topple, shove, or stop Opportunity Attacks. Later you heal as a bonus action.',
      [
        feature('Open Hand Technique', 'Whenever you hit a creature with a Flurry of Blows attack, you can impose one of: Addle (no Opportunity Attacks until the start of its next turn), Push (15 feet away on a failed Strength save), or Topple (Prone on a failed Dexterity save).', undefined, 'free'),
        feature('Wholeness of Body', 'From 6th level, as a Bonus Action roll your Martial Arts die and regain that many hit points plus your Wisdom modifier.', 'wisdom modifier/long rest', 'bonus'),
        feature('Fleet Step', 'From 11th level, whenever you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after it.', undefined, 'free'),
        feature('Quivering Palm', 'From 17th level, when you hit with an Unarmed Strike you can spend 4 Focus Points to start imperceptible vibrations lasting a number of days equal to your monk level. Ending them costs an action: the target takes 10d12 force damage on a failed Constitution save, half on a success. Only one creature at a time.', undefined, 'action'),
      ],
    ),
    subclass(
      'devotion',
      'paladin',
      'Oath of Devotion',
      'The knight in shining armour, with a weapon that barely misses.',
      'Burn Channel Divinity to add your Charisma to every attack with one weapon for ten minutes.',
      [
        feature('Sacred Weapon', 'When you take the Attack action, expend a use of Channel Divinity to charge one melee weapon you are holding for 10 minutes. You add your Charisma modifier to attack rolls with it (minimum +1), it can deal radiant damage, and it sheds bright light.', undefined, 'free'),
        feature('Oath of Devotion Spells', 'You always have prepared: Protection from Evil and Good and Shield of Faith at 3rd level; Aid and Zone of Truth at 5th; Beacon of Hope and Dispel Magic at 9th; Freedom of Movement and Guardian of Faith at 13th; Commune and Flame Strike at 17th.', undefined, 'passive'),
        feature('Aura of Devotion', 'From 7th level, you and your allies have Immunity to the Charmed condition while in your Aura of Protection.', undefined, 'passive'),
        feature('Smite of Protection', 'From 15th level, whenever you cast Divine Smite, you and your allies have Half Cover while in your Aura of Protection until the start of your next turn.', undefined, 'free'),
        feature('Holy Nimbus', 'From 20th level, as a Bonus Action you fill your Aura of Protection with holy power for 10 minutes: bright light, advantage on saves forced by Fiends and Undead, and radiant damage to enemies in the aura. You can restore a use by expending a level 5 spell slot.', '1/long rest', 'bonus'),
      ],
    ),
    subclass(
      'hunter',
      'ranger',
      'Hunter',
      'A specialist killer of whatever is in front of you.',
      'Pick the option your build punishes — big single targets or crowds — and swap it on any rest as the campaign changes.',
      [
        feature('Hunter’s Lore', 'While a creature is marked by your Hunter’s Mark, you know whether it has any Immunities, Resistances or Vulnerabilities, and what they are.', undefined, 'passive'),
        feature('Hunter’s Prey', 'Choose Colossus Slayer (an extra 1d8 once per turn against a creature missing hit points) or Horde Breaker (once per turn, one more attack against a different creature within 5 feet of your target). You can swap on any rest.', undefined, 'free'),
        feature('Defensive Tactics', 'From 7th level, choose Escape the Horde (Opportunity Attacks against you have disadvantage) or Multiattack Defense (a creature that hits you has disadvantage on its other attacks against you that turn). You can swap on any rest.', undefined, 'passive'),
        feature('Superior Hunter’s Prey', 'From 11th level, once per turn when you damage a creature marked by Hunter’s Mark, you deal the spell’s extra damage to a different creature you can see within 30 feet of the first.', undefined, 'free'),
        feature('Superior Hunter’s Defense', 'From 15th level, as a Reaction when you take damage you gain Resistance to that damage type until the end of the turn.', undefined, 'reaction'),
      ],
    ),
    subclass(
      'thief',
      'rogue',
      'Thief',
      'The fastest hands at the table, and the one who can climb anything.',
      'Use an object as a bonus action every turn, and from 17th level take two whole turns in the first round.',
      [
        feature('Fast Hands', 'As a Bonus Action you can make a Dexterity (Sleight of Hand) check to pick a lock, disarm a trap or pick a pocket, or take the Utilize action, or take the Magic action to use a magic item.', undefined, 'bonus'),
        feature('Second-Story Work', 'You have a Climb Speed equal to your Speed, and you can work out your jump distance using Dexterity instead of Strength.', undefined, 'passive'),
        feature('Supreme Sneak', 'From 9th level you gain the Stealth Attack Cunning Strike option (cost 1d6): if you have the Hide action’s Invisible condition, the attack does not end it so long as you end your turn behind Three-Quarters or Total Cover.', undefined, 'free'),
        feature('Use Magic Device', 'From 13th level you can attune to four magic items at once, use any Spell Scroll with Intelligence as your casting ability, and on a roll of 6 on 1d6 spend no charge when using a magic item property.', undefined, 'passive'),
        feature('Thief’s Reflexes', 'From 17th level you take two turns during the first round of combat: one at your Initiative and one at your Initiative minus 10.', undefined, 'free'),
      ],
    ),
    subclass(
      'draconic-sorcery',
      'sorcerer',
      'Draconic Sorcery',
      'Dragon blood: more hit points, scaled armour, and eventually flight.',
      'You are the durable caster. From 14th you fly at 60 feet, and your affinity damage type hits harder.',
      [
        feature('Draconic Resilience', 'Your hit point maximum increases by 3, and by 1 more whenever you gain a sorcerer level. While you are not wearing armour, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers.', undefined, 'passive'),
        feature('Draconic Spells', 'You always have prepared: Alter Self, Chromatic Orb, Command and Dragon’s Breath at 3rd level; Fear and Fly at 5th; Arcane Eye and Charm Monster at 7th; Legend Lore and Summon Dragon at 9th.', undefined, 'passive'),
        feature('Elemental Affinity', 'From 6th level, choose acid, cold, fire, lightning or poison. You have Resistance to it, and when you cast a spell that deals it you can add your Charisma modifier to one damage roll.', undefined, 'free'),
        feature('Dragon Wings', 'From 14th level, as a Bonus Action you sprout wings for 1 hour, gaining a Fly Speed of 60 feet. You can restore a use by spending 3 Sorcery Points.', '1/long rest', 'bonus'),
        feature('Dragon Companion', 'From 18th level you can cast Summon Dragon without its Material component, and once per Long Rest without a spell slot. You can also cast it without Concentration, for a 1-minute duration.', undefined, 'action'),
        { type: 'set', stat: 'draconicResilience', value: 1 },
        // "+3, and +1 whenever you gain another Sorcerer level" — taken at 3rd
        // level, that is exactly one extra hit point per character level.
        { type: 'bonus', stat: 'hpPerLevel', amount: 1 },
      ],
    ),
    subclass(
      'fiend-patron',
      'warlock',
      'Fiend Patron',
      'A devil’s bargain: temporary hit points on every kill, and luck you can spend.',
      'Kill something, take hit points from it. When a roll matters, add a d10 after seeing it.',
      [
        feature('Dark One’s Blessing', 'When you reduce an enemy to 0 hit points — or someone else does so within 10 feet of you — you gain temporary hit points equal to your Charisma modifier plus your warlock level.', undefined, 'free'),
        feature('Fiend Spells', 'You always have prepared: Burning Hands, Command, Scorching Ray and Suggestion at 3rd level; Fireball and Stinking Cloud at 5th; Fire Shield and Wall of Fire at 7th; Geas and Insect Plague at 9th.', undefined, 'passive'),
        feature('Dark One’s Own Luck', 'From 6th level, when you make an ability check or saving throw you can add 1d10 to it, after seeing the roll but before its effects occur.', 'charisma modifier/long rest', 'free'),
        feature('Fiendish Resilience', 'From 10th level, whenever you finish a Short or Long Rest choose one damage type other than force. You have Resistance to it until you choose a different one.', undefined, 'passive'),
        feature('Hurl Through Hell', 'From 14th level, once per turn when you hit a creature with an attack roll it must succeed on a Charisma save or hurtle through the Lower Planes: 8d10 psychic damage unless it is a Fiend, and Incapacitated until the end of your next turn. You can restore a use by expending a Pact Magic slot.', '1/long rest', 'free'),
      ],
    ),
    subclass(
      'evoker',
      'wizard',
      'Evoker',
      'Blasting, but your fireballs stop hitting your friends.',
      'Carve allies out of the blast radius, then start dealing maximum damage on demand.',
      [
        feature('Evocation Savant', 'Choose two Wizard spells from the Evocation school of level 2 or lower and add them to your spellbook for free. Whenever you gain access to a new level of spell slots, add one more Evocation spell for free.', undefined, 'passive'),
        feature('Potent Cantrip', 'When you cast a cantrip at a creature and miss, or it succeeds on its save, it still takes half the cantrip’s damage — though no other effect.', undefined, 'passive'),
        feature('Sculpt Spells', 'From 6th level, when you cast an Evocation spell that affects other creatures you can see, choose a number of them equal to 1 plus the spell’s level. They automatically succeed on their saves and take no damage from it.', undefined, 'free'),
        feature('Empowered Evocation', 'From 10th level you can add your Intelligence modifier to one damage roll of any Wizard Evocation spell you cast.', undefined, 'free'),
        feature('Overchannel', 'From 14th level, when you cast a Wizard spell of level 1–5 that deals damage you can deal maximum damage with it. Using this again before a Long Rest costs you 2d12 necrotic damage per slot level, rising by 1d12 each further use.', undefined, 'free'),
      ],
    ),
  ],
}

// ---------------------------------------------------------------------------
// Fighting styles — feats in 2024, but chosen the same way
// ---------------------------------------------------------------------------

const style = (id: string, name: string, summary: string, effects: Effect[]): Entry => ({ id, name, summary, effects })

export const fightingStyles: Collection = {
  id: 'fighting-styles',
  label: 'Fighting Styles',
  singular: 'Fighting Style',
  entries: [
    style('archery', 'Archery', '+2 to attack rolls with ranged weapons.', [
      feature('Fighting Style: Archery', 'You gain a +2 bonus to attack rolls you make with Ranged weapons.', undefined, 'passive'),
    ]),
    style('defense', 'Defense', '+1 AC while wearing armour.', [
      feature('Fighting Style: Defense', 'While you are wearing Light, Medium or Heavy armor, you gain a +1 bonus to Armor Class.', undefined, 'passive'),
      { type: 'bonus', stat: 'acBonus', amount: 1 },
    ]),
    style('great-weapon', 'Great Weapon Fighting', 'Damage dice that roll 1 or 2 become 3.', [
      feature('Fighting Style: Great Weapon Fighting', 'When you roll damage for a melee weapon you are holding with two hands, treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property.', undefined, 'passive'),
    ]),
    style('two-weapon', 'Two-Weapon Fighting', 'Add your ability modifier to the off-hand attack.', [
      feature('Fighting Style: Two-Weapon Fighting', 'When you make an extra attack because of a weapon with the Light property, you can add your ability modifier to that attack’s damage if you are not already doing so.', undefined, 'passive'),
    ]),
  ],
}

// ---------------------------------------------------------------------------
// Metamagic
// ---------------------------------------------------------------------------

const meta = (id: string, name: string, cost: string, description: string): Entry => ({
  id,
  name,
  summary: cost,
  effects: [feature(`Metamagic: ${name}`, description, cost, 'free')],
})

export const metamagic: Collection = {
  id: 'metamagic',
  label: 'Metamagic',
  singular: 'Metamagic option',
  entries: [
    meta('careful', 'Careful Spell', '1 sorcery point', 'When you cast a spell that forces a saving throw, protect a number of creatures up to your Charisma modifier: they automatically succeed against it.'),
    meta('distant', 'Distant Spell', '1 sorcery point', 'Double the range of a spell with a range of 5 feet or more, or give a spell with a range of Touch a range of 30 feet.'),
    meta('empowered', 'Empowered Spell', '1 sorcery point', 'Reroll a number of the spell’s damage dice up to your Charisma modifier and use the new rolls.'),
    meta('extended', 'Extended Spell', '1 sorcery point', 'Double the duration of a spell with a duration of 1 minute or more, to a maximum of 24 hours. If it needs Concentration, you have advantage on saves to maintain it.'),
    meta('heightened', 'Heightened Spell', '2 sorcery points', 'One target of the spell has disadvantage on its first saving throw against it.'),
    meta('quickened', 'Quickened Spell', '2 sorcery points', 'Change a spell’s casting time from an action to a Bonus Action for this casting.'),
    meta('seeking', 'Seeking Spell', '1 sorcery point', 'Reroll a missed spell attack roll, and use the new roll.'),
    meta('subtle', 'Subtle Spell', '1 sorcery point', 'Cast without Verbal, Somatic or Material components — nobody can tell you are casting.'),
    meta('transmuted', 'Transmuted Spell', '1 sorcery point', 'Change a spell’s acid, cold, fire, lightning, poison or thunder damage to another of those types.'),
    meta('twinned', 'Twinned Spell', '1 sorcery point', 'A spell that targets only one creature and does not have a range of Self can target a second creature in range with the same casting.'),
  ],
}

// ---------------------------------------------------------------------------
// Eldritch invocations
// ---------------------------------------------------------------------------

const invocation = (id: string, name: string, description: string, minLevel = 1, prerequisite?: string): Entry => ({
  id,
  name,
  summary: [minLevel > 1 ? `Warlock level ${minLevel}+` : '', prerequisite ?? ''].filter(Boolean).join(' · ') || undefined,
  meta: { Requires: [minLevel > 1 ? `Level ${minLevel}` : 'None', prerequisite ?? ''].filter(Boolean).join(', ') },
  effects: [feature(name, description, undefined, 'passive')],
})

export const invocations: Collection = {
  id: 'invocations',
  label: 'Eldritch Invocations',
  singular: 'Invocation',
  entries: [
    invocation('agonizing-blast', 'Agonizing Blast', 'Choose one of your known Warlock cantrips that deals damage. You add your Charisma modifier to that spell’s damage rolls. Repeatable with a different cantrip.', 2, 'a damaging Warlock cantrip'),
    invocation('armor-of-shadows', 'Armor of Shadows', 'You can cast Mage Armor on yourself without expending a spell slot.'),
    invocation('ascendant-step', 'Ascendant Step', 'You can cast Levitate on yourself without expending a spell slot.', 5),
    invocation('devils-sight', 'Devil’s Sight', 'You can see normally in Dim Light and Darkness — both magical and nonmagical — within 120 feet.', 2),
    invocation('devouring-blade', 'Devouring Blade', 'The Extra Attack of your Thirsting Blade invocation confers two extra attacks rather than one.', 12, 'Thirsting Blade'),
    invocation('eldritch-mind', 'Eldritch Mind', 'You have advantage on Constitution saving throws to maintain Concentration.'),
    invocation('eldritch-smite', 'Eldritch Smite', 'Once per turn when you hit with your pact weapon, expend a Pact Magic slot to deal an extra 1d8 force damage plus 1d8 per slot level, and give a Huge or smaller target the Prone condition.', 5, 'Pact of the Blade'),
    invocation('eldritch-spear', 'Eldritch Spear', 'Choose one of your damaging Warlock cantrips with a range of 10 feet or more. Its range increases by 30 times your warlock level, in feet. Repeatable.', 2, 'a damaging Warlock cantrip'),
    invocation('fiendish-vigor', 'Fiendish Vigor', 'You can cast False Life on yourself without a spell slot, always getting the highest possible number of temporary hit points.', 2),
    invocation('gaze-of-two-minds', 'Gaze of Two Minds', 'As a Bonus Action, touch a willing creature and perceive through its senses until the end of your next turn. You can maintain the link with a Bonus Action each turn.', 5),
    invocation('gift-of-the-depths', 'Gift of the Depths', 'You can breathe underwater and have a Swim Speed equal to your Speed. You can also cast Water Breathing once per Long Rest without a spell slot.', 5),
    invocation('gift-of-the-protectors', 'Gift of the Protectors', 'A page in your Book of Shadows holds a number of names up to your Charisma modifier. Anyone named who drops to 0 hit points without being killed outright drops to 1 instead, once per Long Rest.', 9, 'Pact of the Tome'),
    invocation('investment-of-the-chain-master', 'Investment of the Chain Master', 'Your familiar gains a Fly or Swim Speed of 40 feet, can attack as your Bonus Action, can deal necrotic or radiant damage, uses your spell save DC, and can be given Resistance with your Reaction.', 5, 'Pact of the Chain'),
    invocation('lessons-of-the-first-ones', 'Lessons of the First Ones', 'You gain one Origin feat of your choice. Repeatable with a different feat.', 2),
    invocation('lifedrinker', 'Lifedrinker', 'Once per turn when you hit with your pact weapon, deal an extra 1d6 necrotic, psychic or radiant damage, and spend a Hit Point Die to regain that roll plus your Constitution modifier in hit points.', 9, 'Pact of the Blade'),
    invocation('mask-of-many-faces', 'Mask of Many Faces', 'You can cast Disguise Self without expending a spell slot.', 2),
    invocation('master-of-myriad-forms', 'Master of Myriad Forms', 'You can cast Alter Self without expending a spell slot.', 5),
    invocation('misty-visions', 'Misty Visions', 'You can cast Silent Image without expending a spell slot.', 2),
    invocation('one-with-shadows', 'One with Shadows', 'While in Dim Light or Darkness, you can cast Invisibility on yourself without expending a spell slot.', 5),
    invocation('otherworldly-leap', 'Otherworldly Leap', 'You can cast Jump on yourself without expending a spell slot.', 2),
    invocation('pact-of-the-blade', 'Pact of the Blade', 'As a Bonus Action, conjure a Simple or Martial melee pact weapon, or bond with a magic weapon you touch. You are proficient with it, can use Charisma for its attack and damage rolls, and can change its damage type to necrotic, psychic or radiant.'),
    invocation('pact-of-the-chain', 'Pact of the Chain', 'You learn Find Familiar and can cast it as a Magic action without a spell slot. Your familiar can take a special form, and can attack with its Reaction when you forgo one of your own attacks.'),
    invocation('pact-of-the-tome', 'Pact of the Tome', 'A Book of Shadows appears at the end of a rest, holding three cantrips and two level 1 Ritual spells from any class list. They count as prepared Warlock spells, and the book is a Spellcasting Focus.'),
    invocation('repelling-blast', 'Repelling Blast', 'Choose one of your Warlock cantrips that requires an attack roll. When you hit a Large or smaller creature with it, you can push the creature up to 10 feet straight away from you. Repeatable.', 2, 'a Warlock attack cantrip'),
    invocation('thirsting-blade', 'Thirsting Blade', 'You gain the Extra Attack feature for your pact weapon only, letting you attack twice with it instead of once when you take the Attack action.', 5, 'Pact of the Blade'),
    invocation('visions-of-distant-realms', 'Visions of Distant Realms', 'You can cast Arcane Eye without expending a spell slot.', 9),
    invocation('whispers-of-the-grave', 'Whispers of the Grave', 'You can cast Speak with Dead without expending a spell slot.', 7),
    invocation('witch-sight', 'Witch Sight', 'You have Truesight with a range of 30 feet.', 15),
  ],
}

// ---------------------------------------------------------------------------
// Epic boons — what 19th level grants instead of an ASI
// ---------------------------------------------------------------------------

const boon = (id: string, name: string, summary: string, description: string, ability: string, abilityPrompt: string, extra: Effect[] = []): Entry => ({
  id,
  name,
  summary,
  effects: [feature(name, description, undefined, 'passive'), ...extra],
  choices: [{ id: 'increase', prompt: abilityPrompt, source: { kind: 'abilities', amount: 1, ...(ability ? { from: ability.split(',') } : {}) } }],
})

const ANY_ABILITY = 'str,dex,con,int,wis,cha'

export const epicBoons: Collection = {
  id: 'epic-boons',
  label: 'Epic Boons',
  singular: 'Epic Boon',
  entries: [
    boon(
      'combat-prowess',
      'Boon of Combat Prowess',
      'Turn one miss per turn into a hit.',
      'Peerless Aim: when you miss with an attack roll, you can hit instead. You cannot use this again until the start of your next turn.',
      ANY_ABILITY,
      'Raise one ability score by 1 (to a maximum of 30)',
    ),
    boon(
      'dimensional-travel',
      'Boon of Dimensional Travel',
      'Teleport 30 feet after every Attack or Magic action.',
      'Blink Steps: immediately after you take the Attack action or the Magic action, you can teleport up to 30 feet to an unoccupied space you can see.',
      ANY_ABILITY,
      'Raise one ability score by 1 (to a maximum of 30)',
    ),
    boon(
      'fate',
      'Boon of Fate',
      'Add or subtract 2d4 on someone’s roll, after seeing it.',
      'Improve Fate: when you or a creature within 60 feet succeeds or fails a D20 Test, you can roll 2d4 and apply the total as a bonus or a penalty. You cannot use this again until you roll Initiative or finish a rest.',
      ANY_ABILITY,
      'Raise one ability score by 1 (to a maximum of 30)',
    ),
    boon(
      'irresistible-offense',
      'Boon of Irresistible Offense',
      'Your physical damage ignores resistance, and crits hurt far more.',
      'Overcome Defenses: your bludgeoning, piercing and slashing damage always ignores Resistance. Overwhelming Strike: when you roll a 20 on an attack roll, you deal extra damage equal to the ability score raised by this boon.',
      'str,dex',
      'Raise Strength or Dexterity by 1 (to a maximum of 30)',
    ),
    boon(
      'spell-recall',
      'Boon of Spell Recall',
      'Low-level spell slots sometimes cost nothing.',
      'Free Casting: whenever you cast a spell with a level 1–4 spell slot, roll 1d4. If the number rolled equals the slot’s level, the slot is not expended. Requires a Spellcasting feature.',
      'int,wis,cha',
      'Raise Intelligence, Wisdom or Charisma by 1 (to a maximum of 30)',
    ),
    boon(
      'night-spirit',
      'Boon of the Night Spirit',
      'In shadow you are nearly invulnerable, and can vanish at will.',
      'Merge with Shadows: while in Dim Light or Darkness you can give yourself the Invisible condition as a Bonus Action, ending it when you next act. Shadowy Form: while in Dim Light or Darkness you have Resistance to all damage except psychic and radiant.',
      ANY_ABILITY,
      'Raise one ability score by 1 (to a maximum of 30)',
    ),
    boon(
      'truesight',
      'Boon of Truesight',
      'Truesight out to 60 feet.',
      'You have Truesight with a range of 60 feet.',
      ANY_ABILITY,
      'Raise one ability score by 1 (to a maximum of 30)',
    ),
  ],
}
