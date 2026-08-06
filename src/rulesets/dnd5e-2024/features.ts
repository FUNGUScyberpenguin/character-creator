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
 */

const feature = (name: string, description: string, uses?: string, action?: string): Effect => ({
  type: 'feature',
  name,
  description,
  ...(uses ? { uses } : {}),
  ...(action ? { action } : {}),
})

const subclass = (id: string, tag: string, name: string, summary: string, atTheTable: string, effects: Effect[]): Entry => ({
  id,
  name,
  tags: [tag],
  summary,
  atTheTable,
  effects,
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
      'Rage into an extra attack, and frighten what is left standing.',
      'Rage, then take a bonus-action attack every round. Later your rage terrifies anything nearby.',
      [
        feature('Frenzy', 'While raging, when you use Reckless Attack you deal extra damage: a number of d6s equal to your Rage Damage bonus, on the first hit each turn.', undefined, 'free'),
        feature('Mindless Rage', 'From 6th level you are immune to the Charmed and Frightened conditions while raging. If either is already on you, it is suspended.', undefined, 'passive'),
        feature('Retaliation', 'From 10th level, as a Reaction when a creature within 5 feet damages you, you can make a melee attack against it.', undefined, 'reaction'),
        feature('Intimidating Presence', 'From 14th level, as a Bonus Action you frighten creatures within 30 feet that fail a Wisdom save against DC 8 + your Strength modifier + your proficiency bonus.', 'proficiency bonus/long rest', 'bonus'),
      ],
    ),
    subclass(
      'lore',
      'bard',
      'College of Lore',
      'More skills, sharper words, and spells stolen from anyone else’s list.',
      'Spend Bardic Inspiration as a Reaction to spoil an enemy roll, and pick up spells no bard should have.',
      [
        { type: 'proficiency', category: 'skill', value: 'arcana' },
        feature('Cutting Words', 'As a Reaction when a creature you can see within 60 feet makes a damage roll or a D20 Test, expend one use of Bardic Inspiration to subtract that die from their roll.', undefined, 'reaction'),
        feature('Magical Discoveries', 'At 6th level you learn two spells of your choice from the Cleric, Druid or Wizard lists, and can cast them without a material component.', undefined, 'passive'),
        feature('Peerless Skill', 'From 14th level, expend a use of Bardic Inspiration to add the die to a failed ability check or attack roll of your own.', undefined, 'reaction'),
      ],
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
        feature('Life Domain Spells', 'You always have Aid, Bless, Cure Wounds, Lesser Restoration, Mass Healing Word, Revivify, Death Ward, Guardian of Faith, Greater Restoration and Mass Cure Wounds prepared, and they do not count against your prepared total.', undefined, 'passive'),
        feature('Preserve Life', 'As a Magic action, expend a use of Channel Divinity to restore hit points equal to five times your cleric level, divided as you like among creatures within 30 feet. No creature can go above half its hit point maximum this way.', undefined, 'action'),
        feature('Blessed Healer', 'From 6th level, when you cast a spell with a slot that restores hit points to someone else, you regain 2 plus the slot’s level in hit points yourself.', undefined, 'passive'),
        feature('Supreme Healing', 'From 17th level, whenever you would roll dice to restore hit points, use the highest number possible on each die instead.', undefined, 'passive'),
      ],
    ),
    subclass(
      'circle-of-the-land',
      'druid',
      'Circle of the Land',
      'A spell list shaped by where you come from, and magic that recharges itself.',
      'Cast from an extra list tied to your terrain, and spend Wild Shape uses to get spell slots back instead of transforming.',
      [
        feature('Circle of the Land Spells', 'Choose a land type — arid, polar, temperate or tropical. You always have that land’s spells prepared, and they do not count against your prepared total. You can change the land whenever you finish a Long Rest.', undefined, 'passive'),
        feature('Land’s Aid', 'As a Magic action, expend a Wild Shape use to make a 10-foot-radius sphere within 60 feet bloom with life: each enemy there takes 2d6 necrotic damage on a failed Constitution save, and one creature you choose regains 2d6 hit points.', undefined, 'action'),
        feature('Natural Recovery', 'From 6th level you can cast your circle spells once per long rest without a slot, and on a Short Rest recover spell slots totalling half your druid level.', '1/long rest', 'free'),
        feature('Nature’s Ward', 'From 10th level you are immune to the Poisoned condition and have resistance to the damage type associated with your current land.', undefined, 'passive'),
        feature('Nature’s Sanctuary', 'From 14th level, as a Magic action you can expend a Wild Shape use to create a 15-foot cube of protective terrain for 1 minute, giving Half Cover and your land’s damage resistance to allies inside it.', undefined, 'action'),
      ],
    ),
    subclass(
      'champion',
      'fighter',
      'Champion',
      'Critical hits on 19, and nothing else to remember.',
      'Attack. Crit more often than anyone else. There is genuinely nothing to track.',
      [
        feature('Improved Critical', 'Your attack rolls with weapons and unarmed strikes score a critical hit on a 19 or 20.', undefined, 'passive'),
        feature('Remarkable Athlete', 'You have advantage on Initiative rolls and Strength (Athletics) checks, and after a critical hit you can move up to half your Speed without provoking Opportunity Attacks.', undefined, 'passive'),
        feature('Additional Fighting Style', 'At 7th level you take a second Fighting Style feat.', undefined, 'passive'),
        feature('Heroic Warrior', 'From 10th level, during combat you give yourself Heroic Inspiration at the start of your turn if you do not already have it.', undefined, 'free'),
        feature('Superior Critical', 'From 15th level your attacks score a critical hit on an 18, 19 or 20.', undefined, 'passive'),
        feature('Survivor', 'From 18th level you have advantage on Death Saving Throws, and at the start of each of your turns you regain 5 plus your Constitution modifier in hit points if you are below half your maximum and not at 0.', undefined, 'passive'),
      ],
    ),
    subclass(
      'open-hand',
      'monk',
      'Warrior of the Open Hand',
      'The purest martial artist: knock down, push back, and eventually kill with a touch.',
      'Every Flurry of Blows can also topple or shove. Later you heal yourself as a bonus action, and at 17th you can drop a creature days after hitting it.',
      [
        feature('Open Hand Technique', 'Whenever you hit a creature with a Flurry of Blows attack, you can also impose one of: Addle (no Opportunity Attacks until its next turn), Push (15 feet away on a failed Strength save), or Topple (Prone on a failed Dexterity save).', undefined, 'free'),
        feature('Wholeness of Body', 'From 6th level, as a Bonus Action you regain hit points equal to three rolls of your Martial Arts die plus your Wisdom modifier.', 'proficiency bonus/long rest', 'bonus'),
        feature('Fleet Step', 'From 11th level, whenever you take a Bonus Action other than Step of the Wind, you also take Step of the Wind immediately after it.', undefined, 'free'),
        feature('Quivering Palm', 'From 17th level, when you hit with an Unarmed Strike you can spend 4 Focus Points to start imperceptible vibrations that last for a number of days equal to your monk level. As an Action you end them: the creature takes 10d12 force damage, or drops to 0 hit points on a failed Constitution save.', undefined, 'action'),
      ],
    ),
    subclass(
      'devotion',
      'paladin',
      'Oath of Devotion',
      'The knight in shining armour, with a weapon that cannot miss much.',
      'Burn Channel Divinity to make your weapon a beacon that adds your Charisma to every attack with it.',
      [
        feature('Sacred Weapon', 'As a Bonus Action, expend a use of Channel Divinity to charge one weapon for 10 minutes. You add your Charisma modifier to attack rolls with it, it emits bright light, and it counts as magical.', undefined, 'bonus'),
        feature('Oath of Devotion Spells', 'You always have Protection from Evil and Good, Shield of Faith, Aid, Zone of Truth, Beacon of Hope, Dispel Magic, Freedom of Movement, Guardian of Faith, Commune and Flame Strike prepared.', undefined, 'passive'),
        feature('Aura of Devotion', 'From 7th level, you and allies in your Aura of Protection are immune to the Charmed condition.', undefined, 'passive'),
        feature('Smite of Protection', 'From 15th level, whenever you cast Divine Smite, allies in your aura gain Half Cover until the start of your next turn.', undefined, 'free'),
        feature('Holy Nimbus', 'From 20th level, as a Bonus Action you become an emblem of your oath for 10 minutes: bright light, advantage on saves against spells cast by Fiends and Undead, and radiant damage to enemies who start their turn in your aura.', '1/long rest', 'bonus'),
      ],
    ),
    subclass(
      'hunter',
      'ranger',
      'Hunter',
      'A specialist killer of whatever is in front of you.',
      'Pick the enemy your build punishes — big single targets or crowds — and switch as the campaign changes.',
      [
        feature('Hunter’s Prey', 'Choose Colossus Slayer (an extra 1d8 once per turn against a damaged creature) or Horde Breaker (one extra attack against a different creature within 5 feet of your target). You can change the choice on a Long Rest.', undefined, 'free'),
        feature('Defensive Tactics', 'From 6th level, choose Escape the Horde (Opportunity Attacks against you have disadvantage) or Multiattack Defense (+4 AC against a creature that has already hit you this turn).', undefined, 'passive'),
        feature('Superior Hunter’s Prey', 'From 11th level, once per turn when you damage a creature with Hunter’s Mark, you deal the mark’s extra damage to a different creature you can see nearby.', undefined, 'free'),
        feature('Superior Hunter’s Defense', 'From 17th level, as a Reaction when you take damage you gain resistance to that damage type until the start of your next turn.', undefined, 'reaction'),
      ],
    ),
    subclass(
      'thief',
      'rogue',
      'Thief',
      'The fastest hands at the table, and the one who can climb anything.',
      'Use an object as a bonus action every turn, and from 17th level take two whole turns in a row.',
      [
        feature('Fast Hands', 'As a Bonus Action you can make a Sleight of Hand check, use Thieves’ Tools to disarm a trap or open a lock, or take the Utilize action.', undefined, 'bonus'),
        feature('Second-Story Work', 'You have a Climb Speed equal to your Speed, and your running jump distance increases by a number of feet equal to your Dexterity modifier.', undefined, 'passive'),
        feature('Supreme Sneak', 'From 9th level, when you use Cunning Action to take the Hide action you have advantage on it, and moving up to half your Speed does not break it.', undefined, 'free'),
        feature('Use Magic Device', 'From 13th level you can attune to four magic items at once, use any Spell Scroll, and get an extra charge out of a chargeable item at the risk of destroying it.', undefined, 'passive'),
        feature('Thief’s Reflexes', 'From 17th level, at the start of combat you take two turns in the first round: one at your Initiative and one at your Initiative minus 10.', undefined, 'free'),
      ],
    ),
    subclass(
      'draconic-sorcery',
      'sorcerer',
      'Draconic Sorcery',
      'Dragon blood: more hit points, better armour, and eventually wings.',
      'You are the durable caster. From 14th you fly, and your dragon-flavoured spells hurt more.',
      [
        feature('Draconic Resilience', 'Your hit point maximum increases by your sorcerer level, and while you are not wearing armour your AC equals 10 + your Dexterity modifier + your Charisma modifier.', undefined, 'passive'),
        feature('Draconic Spells', 'You always have Alter Self, Chromatic Orb, Command, Dragon’s Breath, Fear, Fly, Arcane Eye, Charm Monster, Legend Lore and Summon Dragon prepared.', undefined, 'passive'),
        feature('Elemental Affinity', 'From 6th level, choose a damage type from your dragon ancestry. You have resistance to it, and when you cast a spell that deals it you add your Charisma modifier to one damage roll.', undefined, 'free'),
        feature('Dragon Wings', 'From 14th level, as a Bonus Action you sprout wings for 1 hour, gaining a Fly Speed equal to twice your Speed.', 'proficiency bonus/long rest', 'bonus'),
        feature('Dragon Companion', 'From 18th level you can cast Summon Dragon once without a spell slot, and while it is present you can direct it with a Bonus Action.', '1/long rest', 'action'),
        { type: 'set', stat: 'draconicResilience', value: 1 },
        { type: 'bonus', stat: 'hpPerLevel', amount: 1 },
      ],
    ),
    subclass(
      'fiend-patron',
      'warlock',
      'Fiend Patron',
      'A devil’s bargain: temporary hit points on every kill, and luck you can spend.',
      'Kill something, take hit points from it. When a roll matters, roll a d10 and add it.',
      [
        feature('Dark One’s Blessing', 'When you reduce a creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier plus your warlock level.', undefined, 'free'),
        feature('Fiend Spells', 'You always have Burning Hands, Command, Scorching Ray, Suggestion, Fireball, Stinking Cloud, Fire Shield, Wall of Fire, Geas and Insect Plague prepared.', undefined, 'passive'),
        feature('Dark One’s Own Luck', 'From 6th level, when you make an ability check or saving throw you can add a d10 to it, after seeing the roll but before knowing the result.', 'proficiency bonus/long rest', 'free'),
        feature('Fiendish Resilience', 'From 10th level, at the end of a Short or Long Rest choose one damage type other than force. You have resistance to it until you choose a different one.', undefined, 'passive'),
        feature('Hurl Through Hell', 'From 14th level, once per turn when you hit a creature with an attack you can banish it through the Lower Planes. It vanishes until the end of your next turn, then returns taking 8d10 psychic damage.', 'proficiency bonus/long rest', 'free'),
      ],
    ),
    subclass(
      'evoker',
      'wizard',
      'Evoker',
      'Blasting, but your fireballs stop hitting your friends.',
      'Carve allies out of the blast radius, then start doing minimum damage even when they save.',
      [
        feature('Evocation Savant', 'Whenever you gain a level in this class you can replace one of your free spells with an Evocation spell, and Evocation spells cost you half the usual gold and time to copy into your spellbook.', undefined, 'passive'),
        feature('Potent Cantrip', 'Cantrips you cast that require a saving throw still deal half damage on a success.', undefined, 'passive'),
        feature('Sculpt Spells', 'From 6th level, when you cast an Evocation spell that affects other creatures you can choose a number of them equal to 1 plus the spell’s level. They automatically succeed on their saves and take no damage from it.', undefined, 'free'),
        feature('Empowered Evocation', 'From 10th level you add your Intelligence modifier to one damage roll of any Evocation spell you cast.', undefined, 'free'),
        feature('Overchannel', 'From 14th level, when you cast a spell of 1st to 5th level that deals damage you can deal maximum damage instead of rolling. Using this again before a Long Rest costs you necrotic damage you cannot reduce.', undefined, 'free'),
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
      feature('Fighting Style: Archery', 'You gain a +2 bonus to attack rolls you make with ranged weapons.', undefined, 'passive'),
    ]),
    style('blind-fighting', 'Blind Fighting', 'You can see in the dark, within 10 feet, without light.', [
      feature('Fighting Style: Blind Fighting', 'You have Blindsight with a range of 10 feet.', undefined, 'passive'),
    ]),
    style('defense', 'Defense', '+1 AC while wearing armour.', [
      feature('Fighting Style: Defense', 'While you are wearing Light, Medium or Heavy armor, you gain a +1 bonus to Armor Class.', undefined, 'passive'),
      { type: 'bonus', stat: 'acBonus', amount: 1 },
    ]),
    style('dueling', 'Dueling', '+2 damage when wielding one weapon in one hand.', [
      feature('Fighting Style: Dueling', 'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.', undefined, 'passive'),
    ]),
    style('great-weapon', 'Great Weapon Fighting', 'Damage dice that roll 1 or 2 become 3.', [
      feature('Fighting Style: Great Weapon Fighting', 'When you roll damage for a weapon you are wielding with two hands, treat any 1 or 2 on a damage die as a 3.', undefined, 'passive'),
    ]),
    style('interception', 'Interception', 'Reduce damage dealt to someone next to you.', [
      feature('Fighting Style: Interception', 'As a Reaction when a creature you can see hits someone within 5 feet of you, reduce the damage by 1d10 plus your proficiency bonus.', undefined, 'reaction'),
    ]),
    style('protection', 'Protection', 'Impose disadvantage on an attack against a nearby ally.', [
      feature('Fighting Style: Protection', 'As a Reaction when a creature you can see attacks someone within 5 feet of you, you can impose Disadvantage on the roll if you are holding a Shield.', undefined, 'reaction'),
    ]),
    style('thrown-weapon', 'Thrown Weapon Fighting', 'Draw and throw in one motion, for extra damage.', [
      feature('Fighting Style: Thrown Weapon Fighting', 'When you hit with a thrown weapon, you gain a +2 bonus to the damage roll.', undefined, 'passive'),
    ]),
    style('two-weapon', 'Two-Weapon Fighting', 'Add your ability modifier to the off-hand attack.', [
      feature('Fighting Style: Two-Weapon Fighting', 'When you make an extra attack with a light weapon in your other hand, you can add your ability modifier to its damage.', undefined, 'passive'),
    ]),
    style('unarmed-fighting', 'Unarmed Fighting', 'Your fists hit like a weapon.', [
      feature('Fighting Style: Unarmed Fighting', 'Your Unarmed Strike deals 1d6 bludgeoning damage (1d8 with both hands free), and you deal 1d4 to a creature you are grappling at the start of each of your turns.', undefined, 'passive'),
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
    meta('careful', 'Careful Spell', '1 sorcery point', 'When you cast a spell that forces a saving throw, protect a number of creatures up to your Charisma modifier: they automatically succeed.'),
    meta('distant', 'Distant Spell', '1 sorcery point', 'Double the range of a spell, or give a touch spell a range of 30 feet.'),
    meta('empowered', 'Empowered Spell', '1 sorcery point', 'Reroll a number of damage dice up to your Charisma modifier and use the new rolls.'),
    meta('extended', 'Extended Spell', '1 sorcery point', 'Double a spell’s duration, to a maximum of 24 hours. If it has Concentration, it lasts for the full duration without one.'),
    meta('heightened', 'Heightened Spell', '2 sorcery points', 'One target of the spell has Disadvantage on saves against it.'),
    meta('quickened', 'Quickened Spell', '2 sorcery points', 'Change a spell’s casting time from an action to a Bonus Action.'),
    meta('seeking', 'Seeking Spell', '1 sorcery point', 'Reroll a missed spell attack roll.'),
    meta('subtle', 'Subtle Spell', '1 sorcery point', 'Cast without Verbal, Somatic or Material components, so nobody can tell you are casting.'),
    meta('transmuted', 'Transmuted Spell', '1 sorcery point', 'Change a spell’s acid, cold, fire, lightning, poison or thunder damage to another of those types.'),
    meta('twinned', 'Twinned Spell', 'sorcery points equal to the slot level', 'A spell that targets only one creature targets a second creature within range.'),
  ],
}

// ---------------------------------------------------------------------------
// Eldritch invocations
// ---------------------------------------------------------------------------

const invocation = (id: string, name: string, description: string, minLevel?: number, effects: Effect[] = []): Entry => ({
  id,
  name,
  summary: minLevel ? `Warlock level ${minLevel}+` : undefined,
  meta: minLevel ? { Requires: `Level ${minLevel}` } : undefined,
  effects: [feature(name, description, undefined, 'passive'), ...effects],
})

export const invocations: Collection = {
  id: 'invocations',
  label: 'Eldritch Invocations',
  singular: 'Invocation',
  entries: [
    invocation('agonizing-blast', 'Agonizing Blast', 'Choose one of your known warlock cantrips that deals damage. You add your Charisma modifier to that spell’s damage.'),
    invocation('armor-of-shadows', 'Armor of Shadows', 'You can cast Mage Armor on yourself without a spell slot or material components.'),
    invocation('devils-sight', 'Devil’s Sight', 'You can see normally in dim light and darkness, both magical and nonmagical, out to 120 feet.'),
    invocation('eldritch-mind', 'Eldritch Mind', 'You have advantage on Constitution saving throws to maintain Concentration.'),
    invocation('eldritch-spear', 'Eldritch Spear', 'Choose one warlock cantrip with a range of at least 10 feet. Its range becomes a number of feet equal to 30 times your Charisma modifier.'),
    invocation('fiendish-vigor', 'Fiendish Vigor', 'You can cast False Life on yourself without a spell slot, always at 1st level and always for the maximum 4 temporary hit points plus 1d4.'),
    invocation('gaze-of-two-minds', 'Gaze of Two Minds', 'As a Magic action, touch a willing creature and perceive through its senses until the end of your next turn.'),
    invocation('mask-of-many-faces', 'Mask of Many Faces', 'You can cast Disguise Self without a spell slot.'),
    invocation('misty-visions', 'Misty Visions', 'You can cast Silent Image without a spell slot or material components.'),
    invocation('pact-of-the-blade', 'Pact of the Blade', 'As a Bonus Action you conjure a pact weapon in your hand. You are proficient with it, it counts as magical, and you can use your spellcasting ability for its attack and damage rolls.'),
    invocation('pact-of-the-chain', 'Pact of the Chain', 'You learn Find Familiar and can cast it as a Magic action without a spell slot. Your familiar can take the Attack action when you forgo one of your own.'),
    invocation('pact-of-the-tome', 'Pact of the Tome', 'Your Book of Shadows holds three cantrips and two 1st-level spells from any list, castable without slots once per Long Rest.'),
    invocation('repelling-blast', 'Repelling Blast', 'When you hit a creature with a warlock cantrip that deals damage, you can push it up to 10 feet away in a straight line.'),
    invocation('ascendant-step', 'Ascendant Step', 'You can cast Levitate on yourself without a spell slot or material components.', 5),
    invocation('lifedrinker', 'Lifedrinker', 'Once per turn when you hit with your pact weapon, you deal extra necrotic damage equal to your Charisma modifier and regain that many hit points.', 9),
    invocation('otherworldly-leap', 'Otherworldly Leap', 'You can cast Jump on yourself without a spell slot or material components.', 5),
    invocation('devouring-blade', 'Devouring Blade', 'Your pact weapon lets you attack twice, instead of once, when you take the Attack action.', 12),
    invocation('visions-of-distant-realms', 'Visions of Distant Realms', 'You can cast Arcane Eye without a spell slot.', 9),
    invocation('witch-sight', 'Witch Sight', 'You can see the true form of any shapechanger or creature concealed by illusion or transmutation magic within 30 feet.', 15),
  ],
}

// ---------------------------------------------------------------------------
// Epic boons — what 19th level grants instead of an ASI
// ---------------------------------------------------------------------------

const boon = (id: string, name: string, summary: string, description: string, ability: string, extra: Effect[] = []): Entry => ({
  id,
  name,
  summary,
  effects: [
    feature(`Epic Boon of ${name.replace(/^Boon of /, '')}`, description, undefined, 'passive'),
    { type: 'ability', ability, amount: 1 },
    ...extra,
  ],
})

export const epicBoons: Collection = {
  id: 'epic-boons',
  label: 'Epic Boons',
  singular: 'Epic Boon',
  entries: [
    boon('combat-prowess', 'Boon of Combat Prowess', 'Turn one miss per turn into a hit.', 'Once on each of your turns, when you miss with a weapon attack against a creature you can see, you can change the miss into a hit. Your Strength score increases by 1, to a maximum of 30.', 'str'),
    boon('dimensional-travel', 'Boon of Dimensional Travel', 'Cast Misty Step without a slot, twice per rest.', 'As a Bonus Action you can cast Misty Step without a spell slot, a number of times equal to your proficiency bonus per Long Rest. Your Dexterity score increases by 1, to a maximum of 30.', 'dex'),
    boon('fate', 'Boon of Fate', 'Add 2d4 to someone’s roll, after seeing it.', 'When you or a creature within 60 feet succeeds or fails a D20 Test, you can roll 2d4 and add or subtract the total. Your Charisma score increases by 1, to a maximum of 30.', 'cha'),
    boon('irresistible-offense', 'Boon of Irresistible Offense', 'Your attacks ignore resistance, and crits hurt far more.', 'Your attacks bypass resistance to all damage types, and when you roll a 20 on a D20 Test you deal extra damage equal to your Strength or Dexterity score. That ability score increases by 1, to a maximum of 30.', 'str'),
    boon('recovery', 'Boon of Recovery', 'Heal yourself half your hit points as a bonus action.', 'As a Bonus Action you can regain hit points equal to half your hit point maximum, a number of times equal to your proficiency bonus per Long Rest. Your Constitution score increases by 1, to a maximum of 30.', 'con'),
    boon('skill', 'Boon of Skill', 'Proficiency in every skill, and expertise in three.', 'You gain proficiency in all skills, and Expertise in three skills of your choice. Your score in an ability of your choice increases by 1, to a maximum of 30.', 'wis'),
    boon('speed', 'Boon of Speed', 'Double speed, and you disengage every turn for free.', 'Your Speed increases by 30 feet, and you can take the Disengage action as a Bonus Action. Your Dexterity score increases by 1, to a maximum of 30.', 'dex', [{ type: 'bonus', stat: 'speed', amount: 30 }]),
    boon('truesight', 'Boon of Truesight', 'Truesight out to 60 feet.', 'You have Truesight with a range of 60 feet. Your Intelligence score increases by 1, to a maximum of 30.', 'int'),
  ],
}
