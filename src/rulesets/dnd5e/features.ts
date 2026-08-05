import type { Collection, Effect, Entry } from '../../engine/types'

/**
 * Collections that exist to be chosen *from* rather than walked through:
 * subclasses, fighting styles, metamagic, invocations, and pact boons.
 */

const feature = (name: string, description: string, uses?: string): Effect => ({
  type: 'feature',
  name,
  description,
  ...(uses ? { uses } : {}),
})

// ---------------------------------------------------------------------------
// Subclasses
// ---------------------------------------------------------------------------

const subclassEntries: Entry[] = [
  {
    id: 'berserker',
    name: 'Path of the Berserker',
    tags: ['barbarian'],
    icon: '💢',
    summary: 'Rage without restraint — extra attacks at the cost of exhaustion.',
    levels: [
      { level: 3, effects: [feature('Frenzy', 'While raging, you can go into a frenzy for a bonus-action melee attack each turn. When the rage ends you gain one level of exhaustion.')] },
      { level: 6, effects: [feature('Mindless Rage', 'You cannot be charmed or frightened while raging.')] },
      { level: 10, effects: [feature('Intimidating Presence', 'As an action, frighten one creature within 30 feet with a Wisdom save against 8 + your proficiency bonus + your Charisma modifier.')] },
      { level: 14, effects: [feature('Retaliation', 'When a creature within 5 feet damages you, make a melee weapon attack against it as a reaction.')] },
    ],
  },
  {
    id: 'college-of-lore',
    name: 'College of Lore',
    tags: ['bard'],
    icon: '📜',
    summary: 'Knowledge as a weapon — undercut enemy rolls and borrow spells from anywhere.',
    levels: [
      {
        level: 3,
        effects: [feature('Cutting Words', 'As a reaction, spend Bardic Inspiration to subtract the die from a creature’s attack roll, ability check, or damage roll.')],
        choices: [{ id: 'lore-skills', prompt: 'Bonus Proficiencies — three skills', count: 3, source: { kind: 'skills' } }],
      },
      { level: 6, effects: [feature('Additional Magical Secrets', 'Learn two spells from any class’s spell list. They count as bard spells for you.')] },
      { level: 14, effects: [feature('Peerless Skill', 'Spend Bardic Inspiration to add the die to your own ability check.')] },
    ],
  },
  {
    id: 'life-domain',
    name: 'Life Domain',
    tags: ['cleric'],
    icon: '💚',
    summary: 'The strongest healer in the game, in heavy armour.',
    effects: [
      { type: 'proficiency', category: 'armor', value: 'Heavy armor' },
      feature('Disciple of Life', 'Your healing spells restore an extra 2 + the spell’s level hit points.'),
      { type: 'note', text: 'Domain spells are always prepared and do not count against your prepared limit: bless, cure wounds, lesser restoration, spiritual weapon, beacon of hope, revivify, death ward, guardian of faith, mass cure wounds, raise dead.' },
    ],
    levels: [
      { level: 2, effects: [feature('Channel Divinity: Preserve Life', 'Restore hit points equal to five times your cleric level, divided among creatures within 30 feet, up to half each one’s maximum.')] },
      { level: 6, effects: [feature('Blessed Healer', 'When you heal someone else with a spell of 1st level or higher, you regain 2 + the spell’s level hit points.')] },
      { level: 8, effects: [feature('Divine Strike', 'Once a turn, your weapon hits deal an extra 1d8 radiant damage, rising to 2d8 at 14th level.')] },
      { level: 17, effects: [feature('Supreme Healing', 'Your healing spells restore the maximum possible amount instead of rolling.')] },
    ],
  },
  {
    id: 'circle-of-the-land',
    name: 'Circle of the Land',
    tags: ['druid'],
    icon: '🌾',
    summary: 'A scholar-druid tied to one landscape, with bonus spells and slot recovery.',
    levels: [
      {
        level: 2,
        effects: [
          feature('Bonus Cantrip', 'You learn one additional druid cantrip.'),
          feature('Natural Recovery', 'On a short rest, recover spell slots with a combined level up to half your druid level, rounded up.', '1/long rest'),
        ],
      },
      {
        level: 3,
        effects: [feature('Circle Spells', 'Your bond with the land grants extra always-prepared spells that do not count against your limit.')],
        choices: [
          {
            id: 'land',
            prompt: 'Your land',
            source: {
              kind: 'options',
              options: [
                { id: 'arctic', name: 'Arctic', summary: 'hold person, spike growth, sleet storm, slow…' },
                { id: 'coast', name: 'Coast', summary: 'mirror image, misty step, water breathing…' },
                { id: 'desert', name: 'Desert', summary: 'blur, silence, create food and water…' },
                { id: 'forest', name: 'Forest', summary: 'barkskin, spider climb, call lightning…' },
                { id: 'grassland', name: 'Grassland', summary: 'invisibility, pass without trace, daylight…' },
                { id: 'mountain', name: 'Mountain', summary: 'spider climb, spike growth, lightning bolt…' },
                { id: 'swamp', name: 'Swamp', summary: 'darkness, acid arrow, water walk, stinking cloud…' },
                { id: 'underdark', name: 'Underdark', summary: 'spider climb, web, gaseous form, stinking cloud…' },
              ].map((option) => ({
                ...option,
                effects: [{ type: 'note', text: `Circle of the Land (${option.name}): ${option.summary}` } as Effect],
              })),
            },
          },
        ],
      },
      { level: 6, effects: [feature('Land’s Stride', 'Nonmagical difficult terrain costs no extra movement, and you have advantage on saves against plants that impede movement.')] },
      { level: 10, effects: [feature('Nature’s Ward', 'You cannot be charmed or frightened by elementals or fey, and are immune to poison and disease.')] },
      { level: 14, effects: [feature('Nature’s Sanctuary', 'Beasts and plants must pass a Wisdom save to attack you.')] },
    ],
  },
  {
    id: 'champion',
    name: 'Champion',
    tags: ['fighter'],
    icon: '🏆',
    summary: 'Simple and relentless — crits on 19, and physical excellence across the board.',
    levels: [
      { level: 3, effects: [feature('Improved Critical', 'Your weapon attacks score a critical hit on a roll of 19 or 20.')] },
      { level: 7, effects: [feature('Remarkable Athlete', 'Add half your proficiency bonus to Strength, Dexterity, and Constitution checks that do not already use it, and your running long jump improves.')] },
      {
        level: 10,
        effects: [feature('Additional Fighting Style', 'You choose a second Fighting Style.')],
        choices: [{ id: 'second-style', prompt: 'Second Fighting Style', source: { kind: 'collection', collection: 'fighting-styles' } }],
      },
      { level: 15, effects: [feature('Superior Critical', 'Your weapon attacks score a critical hit on a roll of 18 to 20.')] },
      { level: 18, effects: [feature('Survivor', 'At the start of each turn you regain hit points if you are below half, provided you are not at 0.')] },
    ],
  },
  {
    id: 'open-hand',
    name: 'Way of the Open Hand',
    tags: ['monk'],
    icon: '🌸',
    summary: 'The purest martial artist — knock down, push back, and eventually kill with a touch.',
    levels: [
      { level: 3, effects: [feature('Open Hand Technique', 'When you hit with Flurry of Blows you can knock the target prone, push it 15 feet, or deny it reactions.')] },
      { level: 6, effects: [feature('Wholeness of Body', 'As an action, regain hit points equal to three times your monk level.', '1/long rest')] },
      { level: 11, effects: [feature('Tranquility', 'You end a long rest under a sanctuary effect that lasts until your next long rest.')] },
      { level: 17, effects: [feature('Quivering Palm', 'Spend 3 ki to set up lethal vibrations you can trigger later, forcing a Constitution save or reducing the target to 0 hit points.')] },
    ],
  },
  {
    id: 'oath-of-devotion',
    name: 'Oath of Devotion',
    tags: ['paladin'],
    icon: '✨',
    summary: 'The paladin of legend: honesty, courage, and a weapon wreathed in light.',
    levels: [
      {
        level: 3,
        effects: [
          feature('Channel Divinity: Sacred Weapon', 'For 1 minute, add your Charisma modifier to attack rolls with a weapon that also emits bright light.'),
          feature('Channel Divinity: Turn the Unholy', 'Fiends and undead within 30 feet must make a Wisdom save or be turned for 1 minute.'),
          { type: 'note', text: 'Oath spells always prepared: protection from evil and good, sanctuary, lesser restoration, zone of truth, beacon of hope, dispel magic, freedom of movement, guardian of faith, commune, flame strike.' },
        ],
      },
      { level: 7, effects: [feature('Aura of Devotion', 'You and friendly creatures within your aura cannot be charmed.')] },
      { level: 15, effects: [feature('Purity of Spirit', 'You are always under the effect of protection from evil and good.')] },
      { level: 20, effects: [feature('Holy Nimbus', 'For 1 minute, sunlight radiates from you, damaging fiends and undead and giving you advantage on saves against their spells.', '1/long rest')] },
    ],
  },
  {
    id: 'hunter',
    name: 'Hunter',
    tags: ['ranger'],
    icon: '🎯',
    summary: 'A specialist against whatever you most need to kill.',
    levels: [
      {
        level: 3,
        choices: [
          {
            id: 'hunters-prey',
            prompt: 'Hunter’s Prey',
            source: {
              kind: 'options',
              options: [
                { id: 'colossus-slayer', name: 'Colossus Slayer', summary: 'Once a turn, deal an extra 1d8 to a damaged target.', effects: [feature('Colossus Slayer', 'Your strikes find the seams. Once on each of your turns, deal an extra 1d8 damage to a creature below its hit point maximum.')] },
                { id: 'giant-killer', name: 'Giant Killer', summary: 'React to attacks by Large or larger creatures.', effects: [feature('Giant Killer', 'When a Large or larger creature within 5 feet hits or misses you, use your reaction to attack it.')] },
                { id: 'horde-breaker', name: 'Horde Breaker', summary: 'Once a turn, hit a second adjacent target.', effects: [feature('Horde Breaker', 'Once on each of your turns, make another attack against a different creature within 5 feet of your target.')] },
              ],
            },
          },
        ],
      },
      { level: 7, effects: [feature('Defensive Tactics', 'Choose Escape the Horde, Multiattack Defense, or Steel Will.')] },
      { level: 11, effects: [feature('Multiattack', 'Choose Volley (attack any number of creatures in a 10-foot radius) or Whirlwind Attack.')] },
      { level: 15, effects: [feature('Superior Hunter’s Defense', 'Choose Evasion, Stand Against the Tide, or Uncanny Dodge.')] },
    ],
  },
  {
    id: 'thief',
    name: 'Thief',
    tags: ['rogue'],
    icon: '🧤',
    summary: 'Fast hands, faster feet, and eventually the ability to use any magic item.',
    levels: [
      {
        level: 3,
        effects: [
          feature('Fast Hands', 'Use your Cunning Action bonus action for Sleight of Hand, thieves’ tools, or the Use an Object action.'),
          feature('Second-Story Work', 'Climbing costs no extra movement, and your running jump distance increases by your Dexterity modifier in feet.'),
        ],
      },
      { level: 9, effects: [feature('Supreme Sneak', 'You have advantage on Stealth checks if you move no more than half your speed on that turn.')] },
      { level: 13, effects: [feature('Use Magic Device', 'You ignore all class, race, and level requirements on the use of magic items.')] },
      { level: 17, effects: [feature('Thief’s Reflexes', 'Take two turns during the first round of combat, the second at initiative minus 10.')] },
    ],
  },
  {
    id: 'draconic-bloodline',
    name: 'Draconic Bloodline',
    tags: ['sorcerer'],
    icon: '🐲',
    summary: 'Dragon blood: tougher than any other sorcerer, with an elemental affinity.',
    effects: [
      { type: 'bonus', stat: 'hpPerLevel', amount: 1 },
      { type: 'set', stat: 'draconicResilience', value: 1 },
      feature('Dragon Ancestor', 'Choose a dragon type. You can speak Draconic, and double your proficiency bonus on Charisma checks when dealing with dragons.'),
      feature('Draconic Resilience', 'Your hit point maximum increases by 1 per sorcerer level, and your AC is 13 + your Dexterity modifier while you wear no armor.'),
      { type: 'proficiency', category: 'language', value: 'Draconic' },
    ],
    choices: [
      {
        id: 'dragon',
        prompt: 'Dragon ancestor',
        source: {
          kind: 'options',
          options: [
            { id: 'black', name: 'Black — acid' },
            { id: 'blue', name: 'Blue — lightning' },
            { id: 'brass', name: 'Brass — fire' },
            { id: 'bronze', name: 'Bronze — lightning' },
            { id: 'copper', name: 'Copper — acid' },
            { id: 'gold', name: 'Gold — fire' },
            { id: 'green', name: 'Green — poison' },
            { id: 'red', name: 'Red — fire' },
            { id: 'silver', name: 'Silver — cold' },
            { id: 'white', name: 'White — cold' },
          ],
        },
      },
    ],
    levels: [
      { level: 6, effects: [feature('Elemental Affinity', 'Add your Charisma modifier to one damage roll of a spell matching your ancestry’s damage type, and spend 1 sorcery point for resistance to it for an hour.')] },
      { level: 14, effects: [feature('Dragon Wings', 'Sprout wings as a bonus action and gain a flying speed equal to your walking speed.')] },
      { level: 18, effects: [feature('Draconic Presence', 'Spend 5 sorcery points to awe or frighten creatures within 60 feet for 1 minute.')] },
    ],
  },
  {
    id: 'the-fiend',
    name: 'The Fiend',
    tags: ['warlock'],
    icon: '😈',
    summary: 'A bargain with something from the lower planes — temporary hit points on every kill.',
    effects: [
      { type: 'note', text: 'Expanded spell list: burning hands, command, blindness/deafness, scorching ray, fireball, stinking cloud, fire shield, wall of fire, flame strike, hallow.' },
      feature('Dark One’s Blessing', 'When you reduce a hostile creature to 0 hit points, gain temporary hit points equal to your Charisma modifier + your warlock level.'),
    ],
    levels: [
      { level: 6, effects: [feature('Dark One’s Own Luck', 'Add a d10 to an ability check or saving throw after rolling.', '1/short rest')] },
      { level: 10, effects: [feature('Fiendish Resilience', 'After a rest, choose one damage type; you have resistance to it until you choose another.')] },
      { level: 14, effects: [feature('Hurl Through Hell', 'When you hit a creature, banish it through the lower planes for 10d10 psychic damage.', '1/long rest')] },
    ],
  },
  {
    id: 'school-of-evocation',
    name: 'School of Evocation',
    tags: ['wizard'],
    icon: '💥',
    summary: 'Blasting, refined — carve your allies out of your own fireballs.',
    levels: [
      {
        level: 2,
        effects: [
          feature('Evocation Savant', 'Copying an evocation spell into your spellbook costs half the usual time and gold.'),
          feature('Sculpt Spells', 'When you cast an evocation spell, a number of creatures equal to 1 + the spell’s level automatically succeed on their save and take no damage.'),
        ],
      },
      { level: 6, effects: [feature('Potent Cantrip', 'Creatures that succeed on a save against your damaging cantrips still take half damage.')] },
      { level: 10, effects: [feature('Empowered Evocation', 'Add your Intelligence modifier to one damage roll of any evocation spell you cast.')] },
      { level: 14, effects: [feature('Overchannel', 'Deal maximum damage with a spell of 5th level or lower, at the cost of necrotic damage to yourself after the first use.')] },
    ],
  },
]

export const subclasses: Collection = {
  id: 'subclasses',
  label: 'Subclasses',
  singular: 'Subclass',
  entries: subclassEntries,
}

// ---------------------------------------------------------------------------
// Fighting styles
// ---------------------------------------------------------------------------

export const fightingStyles: Collection = {
  id: 'fighting-styles',
  label: 'Fighting Styles',
  singular: 'Fighting Style',
  entries: [
    {
      id: 'archery',
      name: 'Archery',
      tags: ['fighter', 'ranger'],
      icon: '🎯',
      summary: '+2 to attack rolls with ranged weapons.',
      effects: [feature('Fighting Style: Archery', 'You gain a +2 bonus to attack rolls you make with ranged weapons.')],
    },
    {
      id: 'defense',
      name: 'Defense',
      tags: ['fighter', 'paladin', 'ranger'],
      icon: '🛡️',
      summary: '+1 AC while wearing armour.',
      effects: [
        feature('Fighting Style: Defense', 'While you are wearing armor, you gain a +1 bonus to AC.'),
        { type: 'bonus', stat: 'acBonus', amount: 1 },
      ],
    },
    {
      id: 'dueling',
      name: 'Dueling',
      tags: ['fighter', 'paladin', 'ranger'],
      icon: '🤺',
      summary: '+2 damage with a single one-handed weapon.',
      effects: [feature('Fighting Style: Dueling', 'When wielding a melee weapon in one hand and no other weapon, you gain a +2 bonus to damage rolls with it.')],
    },
    {
      id: 'great-weapon-fighting',
      name: 'Great Weapon Fighting',
      tags: ['fighter', 'paladin'],
      icon: '🗡️',
      summary: 'Reroll 1s and 2s on two-handed weapon damage.',
      effects: [feature('Fighting Style: Great Weapon Fighting', 'When you roll a 1 or 2 on a damage die for a two-handed or versatile melee weapon, you can reroll it once.')],
    },
    {
      id: 'protection',
      name: 'Protection',
      tags: ['fighter', 'paladin'],
      icon: '🚧',
      summary: 'Impose disadvantage on attacks against a nearby ally.',
      effects: [feature('Fighting Style: Protection', 'When a creature attacks a target other than you within 5 feet, use your reaction and shield to impose disadvantage on the attack roll.')],
    },
    {
      id: 'two-weapon-fighting',
      name: 'Two-Weapon Fighting',
      tags: ['fighter', 'ranger'],
      icon: '⚔️',
      summary: 'Add your ability modifier to off-hand damage.',
      effects: [feature('Fighting Style: Two-Weapon Fighting', 'When you fight with two weapons, you can add your ability modifier to the damage of the second attack.')],
    },
  ],
}

// ---------------------------------------------------------------------------
// Metamagic, invocations, pact boons
// ---------------------------------------------------------------------------

const metamagicOption = (id: string, name: string, cost: string, description: string): Entry => ({
  id,
  name,
  summary: cost,
  effects: [feature(`Metamagic: ${name}`, description)],
})

export const metamagic: Collection = {
  id: 'metamagic',
  label: 'Metamagic',
  singular: 'Metamagic option',
  entries: [
    metamagicOption('careful', 'Careful Spell', '1 sorcery point', 'Choose up to your Charisma modifier in creatures; they automatically succeed on their saving throw against the spell.'),
    metamagicOption('distant', 'Distant Spell', '1 sorcery point', 'Double the range of a spell, or give a touch spell a 30-foot range.'),
    metamagicOption('empowered', 'Empowered Spell', '1 sorcery point', 'Reroll up to your Charisma modifier in damage dice.'),
    metamagicOption('extended', 'Extended Spell', '1 sorcery point', 'Double a spell’s duration, to a maximum of 24 hours.'),
    metamagicOption('heightened', 'Heightened Spell', '3 sorcery points', 'One target has disadvantage on its first saving throw against the spell.'),
    metamagicOption('quickened', 'Quickened Spell', '2 sorcery points', 'Cast a spell with a casting time of 1 action as a bonus action instead.'),
    metamagicOption('subtle', 'Subtle Spell', '1 sorcery point', 'Cast without verbal or somatic components.'),
    metamagicOption('twinned', 'Twinned Spell', 'spell level in points', 'A spell that targets one creature targets a second creature as well.'),
  ],
}

const invocation = (id: string, name: string, description: string, prerequisite?: string): Entry => ({
  id,
  name,
  summary: prerequisite,
  effects: [feature(`Invocation: ${name}`, description)],
})

export const invocations: Collection = {
  id: 'invocations',
  label: 'Eldritch Invocations',
  singular: 'Invocation',
  entries: [
    invocation('agonizing-blast', 'Agonizing Blast', 'Add your Charisma modifier to the damage of each eldritch blast beam.', 'Requires eldritch blast'),
    invocation('armor-of-shadows', 'Armor of Shadows', 'Cast mage armor on yourself at will, without a slot or components.'),
    invocation('beast-speech', 'Beast Speech', 'Cast speak with animals at will, without a slot.'),
    invocation('beguiling-influence', 'Beguiling Influence', 'You gain proficiency in Deception and Persuasion.'),
    invocation('devils-sight', 'Devil’s Sight', 'You see normally in darkness, both magical and nonmagical, out to 120 feet.'),
    invocation('eldritch-sight', 'Eldritch Sight', 'Cast detect magic at will, without a slot.'),
    invocation('eldritch-spear', 'Eldritch Spear', 'Your eldritch blast has a range of 300 feet.', 'Requires eldritch blast'),
    invocation('eyes-of-the-rune-keeper', 'Eyes of the Rune Keeper', 'You can read all writing.'),
    invocation('fiendish-vigor', 'Fiendish Vigor', 'Cast false life on yourself at will as a 1st-level spell.'),
    invocation('gaze-of-two-minds', 'Gaze of Two Minds', 'Touch a willing humanoid and perceive through its senses until the end of your next turn.'),
    invocation('mask-of-many-faces', 'Mask of Many Faces', 'Cast disguise self at will, without a slot.'),
    invocation('misty-visions', 'Misty Visions', 'Cast silent image at will, without a slot or material components.'),
    invocation('repelling-blast', 'Repelling Blast', 'When you hit with eldritch blast, push the creature up to 10 feet away.', 'Requires eldritch blast'),
    invocation('thief-of-five-fates', 'Thief of Five Fates', 'Cast bane once per long rest using a warlock spell slot.'),
    invocation('ascendant-step', 'Ascendant Step', 'Cast levitate on yourself at will, without a slot.', 'Level 9+'),
    invocation('mire-the-mind', 'Mire the Mind', 'Cast slow once per long rest using a warlock spell slot.', 'Level 5+'),
    invocation('one-with-shadows', 'One with Shadows', 'In dim light or darkness, become invisible as an action until you move or act.', 'Level 5+'),
    invocation('sign-of-ill-omen', 'Sign of Ill Omen', 'Cast bestow curse once per long rest using a warlock spell slot.', 'Level 5+'),
    invocation('thirsting-blade', 'Thirsting Blade', 'You can attack twice with your pact weapon whenever you take the Attack action.', 'Level 5+, Pact of the Blade'),
    invocation('book-of-ancient-secrets', 'Book of Ancient Secrets', 'Inscribe two 1st-level rituals in your Book of Shadows and cast them as rituals.', 'Pact of the Tome'),
    invocation('voice-of-the-chain-master', 'Voice of the Chain Master', 'Communicate telepathically with your familiar and perceive through its senses at any distance.', 'Pact of the Chain'),
    invocation('lifedrinker', 'Lifedrinker', 'Your pact weapon deals extra necrotic damage equal to your Charisma modifier.', 'Level 12+, Pact of the Blade'),
  ],
}

export const pactBoons: Collection = {
  id: 'pact-boons',
  label: 'Pact Boons',
  singular: 'Pact Boon',
  entries: [
    {
      id: 'pact-of-the-chain',
      name: 'Pact of the Chain',
      icon: '⛓️',
      summary: 'A familiar that can take exotic forms and make its own attack.',
      effects: [
        feature('Pact of the Chain', 'You learn find familiar and can cast it as a ritual. Your familiar can take the form of an imp, pseudodragon, quasit, or sprite, and you can forgo one of your attacks to let it attack.'),
        { type: 'item', item: 'Find familiar (ritual)' },
      ],
    },
    {
      id: 'pact-of-the-blade',
      name: 'Pact of the Blade',
      icon: '🗡️',
      summary: 'Summon a magical weapon you are always proficient with.',
      effects: [
        feature('Pact of the Blade', 'As an action, create a pact weapon of any melee form. You are proficient with it, it counts as magical, and you can transform a magic weapon into your pact weapon.'),
      ],
    },
    {
      id: 'pact-of-the-tome',
      name: 'Pact of the Tome',
      icon: '📕',
      summary: 'A Book of Shadows holding three cantrips from any list.',
      effects: [
        feature('Pact of the Tome', 'Your patron gives you a Book of Shadows containing three cantrips of your choice from any class’s spell list. You can cast them at will.'),
        { type: 'item', item: 'Book of Shadows' },
      ],
    },
  ],
}
