import type { Collection, DerivedStat, Effect, Entry, Ruleset, Step } from '../../engine/types'

/**
 * Embers — a compact original system, and the proof that the wizard is not a
 * D&D app with the serial numbers filed off.
 *
 * It differs from the bundled 5e ruleset on every axis the engine exposes:
 *
 *   · four abilities, not six, and they *are* the modifier — no 10-and-divide
 *   · ten levels, not twenty
 *   · armour adds to Defence rather than replacing an unarmoured base
 *   · magic costs Strain from a pool; there are no spell slots and no levels
 *   · its own action economy, with its own labels
 *
 * Everything here is original and released under the repository's MIT licence,
 * so it can be copied, rewritten, or used as the template for a real system.
 */

const feature = (name: string, description: string, uses?: string, action?: string): Effect => ({
  type: 'feature',
  name,
  description,
  ...(uses ? { uses } : {}),
  ...(action ? { action } : {}),
})

const skill = (value: string): Effect => ({ type: 'proficiency', category: 'skill', value })
const gear = (value: string): Effect => ({ type: 'proficiency', category: 'gear', value })
const setStat = (stat: string, value: number | string): Effect => ({ type: 'set', stat, value })
const item = (name: string, quantity = 1): Effect => ({ type: 'item', item: name, quantity })

// ---------------------------------------------------------------------------
// Abilities and skills
// ---------------------------------------------------------------------------

const abilities = [
  { id: 'might', name: 'Might', abbr: 'MGT', description: 'Force, endurance, and the willingness to use both.' },
  { id: 'grace', name: 'Grace', abbr: 'GRC', description: 'Speed, balance, and precision.' },
  { id: 'wits', name: 'Wits', abbr: 'WIT', description: 'Observation, memory, and quick thinking.' },
  { id: 'heart', name: 'Heart', abbr: 'HRT', description: 'Conviction, presence, and the nerve to hold to it.' },
]

const skills = [
  { id: 'brawl', name: 'Brawl', ability: 'might' },
  { id: 'endure', name: 'Endure', ability: 'might' },
  { id: 'labour', name: 'Labour', ability: 'might' },
  { id: 'move', name: 'Move', ability: 'grace' },
  { id: 'sleight', name: 'Sleight', ability: 'grace' },
  { id: 'shoot', name: 'Shoot', ability: 'grace' },
  { id: 'notice', name: 'Notice', ability: 'wits' },
  { id: 'lore', name: 'Lore', ability: 'wits' },
  { id: 'craft', name: 'Craft', ability: 'wits' },
  { id: 'sway', name: 'Sway', ability: 'heart' },
  { id: 'read', name: 'Read People', ability: 'heart' },
  { id: 'resolve', name: 'Resolve', ability: 'heart' },
]

const allSkills = skills.map((entry) => entry.id)

// ---------------------------------------------------------------------------
// Kin
// ---------------------------------------------------------------------------

const kin: Collection = {
  id: 'kin',
  label: 'Kin',
  singular: 'Kin',
  entries: [
    {
      id: 'ashborn',
      name: 'Ashborn',
      icon: '🌋',
      summary: 'Born in the caldera towns. Heat means nothing to you.',
      atTheTable: 'You shrug off the first hit that would stagger anyone else, and fire simply does not frighten you.',
      meta: { Speed: '6', Size: 'Medium' },
      effects: [
        { type: 'ability', ability: 'might', amount: 1 },
        setStat('speed', 6),
        setStat('size', 'Medium'),
        feature('Cinder-Skinned', 'You ignore the first 2 damage from any source of fire or heat.', undefined, 'passive'),
        feature('Ash Lungs', 'You do not need to breathe clean air, and smoke does not blind you.', undefined, 'passive'),
      ],
    },
    {
      id: 'tideglass',
      name: 'Tideglass',
      icon: '🌊',
      summary: 'Coastal folk with a knack for reading people and weather alike.',
      atTheTable: 'You notice the thing nobody said out loud, and you are very hard to lie to.',
      meta: { Speed: '6', Size: 'Medium' },
      effects: [
        { type: 'ability', ability: 'heart', amount: 1 },
        setStat('speed', 6),
        setStat('size', 'Medium'),
        skill('read'),
        feature('Salt-Read', 'You always know roughly what the weather will do in the next few hours.', undefined, 'passive'),
      ],
    },
    {
      id: 'underfolk',
      name: 'Underfolk',
      icon: '🕯️',
      summary: 'Raised below ground. Small, quiet, and impossible to lose.',
      atTheTable: 'You go where others cannot fit, see in the dark, and never need a map twice.',
      meta: { Speed: '5', Size: 'Small' },
      effects: [
        { type: 'ability', ability: 'grace', amount: 1 },
        setStat('speed', 5),
        setStat('size', 'Small'),
        setStat('darkSight', 1),
        feature('Dark-Sighted', 'You see in complete darkness as though it were dim light.', undefined, 'passive'),
        feature('Never Lost', 'You can always retrace a route you have walked once, underground or above it.', undefined, 'passive'),
      ],
    },
    {
      id: 'wayfarer',
      name: 'Wayfarer',
      icon: '🧳',
      summary: 'No homeland worth the name. You have been everywhere and belong nowhere.',
      atTheTable: 'You have a contact in most towns and a passable answer for most situations.',
      meta: { Speed: '6', Size: 'Medium' },
      effects: [
        { type: 'ability', ability: 'wits', amount: 1 },
        setStat('speed', 6),
        setStat('size', 'Medium'),
        feature('Somebody Owes You', 'Once per session, declare that you know someone useful here. The table decides how much they like you.', '1/session', 'action'),
      ],
      choices: [{ id: 'kin-skill', prompt: 'A trade you picked up on the road', count: 1, source: { kind: 'skills', from: allSkills } }],
    },
  ],
}

// ---------------------------------------------------------------------------
// Callings
// ---------------------------------------------------------------------------

/** Callings advance to 10; features are sparse and deliberately readable. */
const callings: Collection = {
  id: 'callings',
  label: 'Callings',
  singular: 'Calling',
  facets: [
    {
      id: 'role',
      label: 'What do you want to be doing?',
      options: [
        { value: 'role-fight', label: 'Winning fights', description: 'Front line, weapons, staying up' },
        { value: 'role-magic', label: 'Working magic', description: 'Spending Strain to bend things' },
        { value: 'role-talk', label: 'Talking and scheming', description: 'People are the puzzle' },
        { value: 'role-scout', label: 'Going first, quietly', description: 'Scouting, traps, ranged work' },
      ],
    },
  ],
  entries: [
    {
      id: 'blade',
      name: 'Blade',
      icon: '⚔️',
      tags: ['role-fight'],
      summary: 'You solve problems by being better at violence than the problem is.',
      atTheTable: 'Hit something, then hit it again. Spend Grit to shrug off a wound or take an extra swing.',
      meta: { Vitality: 'd10', Primary: 'Might' },
      effects: [
        setStat('vitalityDie', 10),
        gear('All weapons'),
        gear('All armour'),
        feature('Grit', 'A pool you spend to push through. Refills after a night’s rest.', 'level + might', 'passive'),
        { type: 'resource', name: 'Grit', formula: 'level + might' },
      ],
      choices: [{ id: 'skills', prompt: 'Choose two skills', count: 2, source: { kind: 'skills', from: ['brawl', 'endure', 'labour', 'move', 'shoot', 'notice', 'resolve'] } }],
      levels: [
        { level: 1, effects: [feature('Press the Attack', 'Spend 1 Grit to make a second weapon attack.', '1 Grit', 'swift')] },
        { level: 2, effects: [feature('Shake It Off', 'Spend 1 Grit to ignore all damage from one hit.', '1 Grit', 'reaction')] },
        { level: 3, choices: [{ id: 'path', prompt: 'Your fighting path', descriptor: true, source: { kind: 'collection', collection: 'paths', tag: 'blade' } }] },
        { level: 5, effects: [feature('Second Wind', 'Once per rest, recover Vitality equal to your level plus Might.', '1/rest', 'swift')] },
        { level: 7, effects: [feature('Unbroken', 'When you would drop, you stay up with 1 Vitality instead.', '1/rest', 'passive')] },
        { level: 9, effects: [feature('Whirl', 'Your Press the Attack hits every adjacent enemy.', '1 Grit', 'swift')] },
      ],
    },
    {
      id: 'adept',
      name: 'Adept',
      icon: '🔮',
      tags: ['role-magic'],
      summary: 'You have read the things you were told not to, and they worked.',
      atTheTable: 'Spend Strain to work magic. Push too far and the magic pushes back.',
      meta: { Vitality: 'd6', Primary: 'Wits' },
      effects: [
        setStat('vitalityDie', 6),
        gear('Simple weapons'),
        {
          type: 'spellcasting',
          id: 'adept',
          label: 'Workings',
          ability: 'wits',
          preparation: 'known',
          list: 'adept',
          cantripsKnown: 'stat.workingsKnown',
        },
        feature('Strain', 'Magic costs Strain. At 0 Strain you can still work magic, but each one costs you Vitality instead.', undefined, 'passive'),
      ],
      choices: [{ id: 'skills', prompt: 'Choose two skills', count: 2, source: { kind: 'skills', from: ['lore', 'craft', 'notice', 'sleight', 'resolve', 'read'] } }],
      levels: [
        { level: 1, effects: [setStat('workingsKnown', 3), feature('Read the Weave', 'You can tell when magic has been worked nearby within the last day.', undefined, 'action')] },
        { level: 2, effects: [setStat('workingsKnown', 4)] },
        { level: 3, effects: [setStat('workingsKnown', 5)], choices: [{ id: 'path', prompt: 'Your tradition', descriptor: true, source: { kind: 'collection', collection: 'paths', tag: 'adept' } }] },
        { level: 4, effects: [setStat('workingsKnown', 6)] },
        { level: 5, effects: [setStat('workingsKnown', 7), feature('Overreach', 'Spend Vitality in place of Strain, at two Vitality per Strain.', undefined, 'passive')] },
        { level: 6, effects: [setStat('workingsKnown', 8)] },
        { level: 7, effects: [setStat('workingsKnown', 9), feature('Steady Hand', 'Working magic no longer requires your hands free.', undefined, 'passive')] },
        { level: 8, effects: [setStat('workingsKnown', 10)] },
        { level: 9, effects: [setStat('workingsKnown', 11)] },
        { level: 10, effects: [setStat('workingsKnown', 12), feature('Deep Well', 'Your Strain pool doubles.', undefined, 'passive'), { type: 'bonus', stat: 'strainBonus', amount: 6 }] },
      ],
    },
    {
      id: 'voice',
      name: 'Voice',
      icon: '🎙️',
      tags: ['role-talk', 'role-magic'],
      summary: 'You talk. Things happen. Sometimes that is magic and sometimes it is just you.',
      atTheTable: 'Rewrite a scene with a few words, and back it up with small workings when words are not enough.',
      meta: { Vitality: 'd8', Primary: 'Heart' },
      effects: [
        setStat('vitalityDie', 8),
        gear('Simple weapons'),
        gear('Light armour'),
        {
          type: 'spellcasting',
          id: 'voice',
          label: 'Workings',
          ability: 'heart',
          preparation: 'known',
          list: 'voice',
          cantripsKnown: 'stat.workingsKnown',
        },
      ],
      choices: [{ id: 'skills', prompt: 'Choose three skills', count: 3, source: { kind: 'skills', from: ['sway', 'read', 'lore', 'notice', 'sleight', 'resolve', 'move'] } }],
      levels: [
        { level: 1, effects: [setStat('workingsKnown', 2), feature('Take the Room', 'When you speak first in a scene, one listener treats you as an old friend until you give them reason not to.', '1/scene', 'action')] },
        { level: 2, effects: [setStat('workingsKnown', 3), feature('Cold Read', 'Name one thing a person present wants. The table tells you if you are right.', '1/scene', 'action')] },
        { level: 3, effects: [setStat('workingsKnown', 4)], choices: [{ id: 'path', prompt: 'What you are known for', descriptor: true, source: { kind: 'collection', collection: 'paths', tag: 'voice' } }] },
        { level: 5, effects: [setStat('workingsKnown', 5), feature('Rally', 'Spend 1 Strain to let an ally reroll any check.', '1 Strain', 'reaction')] },
        { level: 7, effects: [setStat('workingsKnown', 6)] },
        { level: 9, effects: [setStat('workingsKnown', 7), feature('Last Word', 'Once per session, end a conversation on your terms. Nobody argues until the scene changes.', '1/session', 'action')] },
      ],
    },
    {
      id: 'warden',
      name: 'Warden',
      icon: '🏹',
      tags: ['role-scout', 'role-fight'],
      summary: 'You go ahead of everyone else, and you come back.',
      atTheTable: 'Scout, shoot, and make sure the party never walks into the thing you already spotted.',
      meta: { Vitality: 'd8', Primary: 'Grace' },
      effects: [
        setStat('vitalityDie', 8),
        gear('Simple weapons'),
        gear('Bows'),
        gear('Light armour'),
        skill('notice'),
        feature('First Look', 'You always act first in the round after you were the one who spotted the danger.', undefined, 'passive'),
      ],
      choices: [{ id: 'skills', prompt: 'Choose two skills', count: 2, source: { kind: 'skills', from: ['move', 'shoot', 'sleight', 'endure', 'craft', 'lore'] } }],
      levels: [
        { level: 1, effects: [feature('Mark', 'Name a target. Your attacks against it deal 2 extra damage until it drops.', undefined, 'swift')] },
        { level: 2, effects: [feature('Silent Step', 'Moving at half speed makes you effectively silent.', undefined, 'passive')] },
        { level: 3, choices: [{ id: 'path', prompt: 'Your ranging style', descriptor: true, source: { kind: 'collection', collection: 'paths', tag: 'warden' } }] },
        { level: 5, effects: [feature('Second Shot', 'Attack twice at range on your turn.', undefined, 'passive')] },
        { level: 7, effects: [feature('Read the Ground', 'You cannot be surprised outdoors.', undefined, 'passive')] },
        { level: 9, effects: [feature('Two Marks', 'You may have two targets Marked at once.', undefined, 'passive')] },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Paths, origins, talents
// ---------------------------------------------------------------------------

const path = (id: string, name: string, tag: string, summary: string, effects: Effect[]): Entry => ({
  id,
  name,
  tags: [tag],
  summary,
  effects,
})

const paths: Collection = {
  id: 'paths',
  label: 'Paths',
  singular: 'Path',
  entries: [
    path('bulwark', 'Bulwark', 'blade', 'You are where the line holds.', [
      feature('Hold', 'Enemies adjacent to you cannot move past you without taking a hit.', undefined, 'passive'),
      { type: 'bonus', stat: 'defenceBonus', amount: 1 },
    ]),
    path('duellist', 'Duellist', 'blade', 'One opponent, full attention.', [
      feature('Single Focus', 'Against a single adjacent enemy, your attacks deal 2 extra damage.', undefined, 'passive'),
    ]),
    path('kindler', 'Kindler', 'adept', 'Fire, and what it leaves behind.', [
      feature('Kindled', 'Your damaging workings set their target alight for 2 more damage next round.', undefined, 'passive'),
    ]),
    path('warder', 'Warder', 'adept', 'Wards, seals, and things kept out.', [
      feature('Standing Ward', 'You may keep one ward working active without paying its Strain upkeep.', undefined, 'passive'),
    ]),
    path('orator', 'Orator', 'voice', 'Crowds, courts, and the useful lie.', [
      feature('Carry the Crowd', 'When you sway a group, you affect everyone who can hear you rather than one listener.', undefined, 'passive'),
    ]),
    path('confidant', 'Confidant', 'voice', 'One person at a time, very thoroughly.', [
      feature('Trusted', 'A person you have spoken with alone will hear you out once, even under orders not to.', undefined, 'passive'),
    ]),
    path('tracker', 'Tracker', 'warden', 'Nothing you have seen gets away.', [
      feature('Never Shakes You', 'You can follow a trail up to a week old, in any weather.', undefined, 'passive'),
    ]),
    path('sharpshooter', 'Sharpshooter', 'warden', 'Distance is not a problem.', [
      feature('Long Eye', 'Ignore all penalties for range and cover.', undefined, 'passive'),
    ]),
  ],
}

const origin = (id: string, name: string, icon: string, summary: string, effects: Effect[]): Entry => ({
  id,
  name,
  icon,
  summary,
  effects,
})

const origins: Collection = {
  id: 'origins',
  label: 'Origins',
  singular: 'Origin',
  entries: [
    origin('caravanner', 'Caravanner', '🐫', 'You grew up between towns rather than in one.', [
      skill('endure'),
      skill('read'),
      item('Travel kit'),
      item('Coin purse (20 marks)'),
      feature('Road Rights', 'Caravans will take you and yours along in exchange for a watch shift.', undefined, 'passive'),
    ]),
    origin('foundry', 'Foundry Hand', '🔨', 'You know metal, heat, and long shifts.', [
      skill('craft'),
      skill('labour'),
      item('Tool roll'),
      item('Coin purse (15 marks)'),
      feature('Knows the Trade', 'You can tell where a piece of metalwork was made, and roughly by whom.', undefined, 'passive'),
    ]),
    origin('archivist', 'Archivist', '📚', 'You spent years with documents that outlived their authors.', [
      skill('lore'),
      skill('notice'),
      item('Writing case'),
      item('Coin purse (15 marks)'),
      feature('Reading Rights', 'Archives and record houses will admit you as one of their own.', undefined, 'passive'),
    ]),
    origin('cutpurse', 'Cutpurse', '🪙', 'You were quick, and the city was not kind.', [
      skill('sleight'),
      skill('move'),
      item('Lockpicks'),
      item('Coin purse (10 marks)'),
      feature('Back Ways', 'In any city you have spent a week in, you know a route the watch does not use.', undefined, 'passive'),
    ]),
    origin('field-medic', 'Field Medic', '🩹', 'You have patched more people than you would like to count.', [
      skill('craft'),
      skill('resolve'),
      item('Medical kit'),
      item('Coin purse (15 marks)'),
      feature('Steady Hands', 'You can stabilise a dying person without a check, given a minute and a kit.', undefined, 'action'),
    ]),
    origin('hedge-witch', 'Hedge Witch', '🌿', 'You learned small magics from someone who learned them the same way.', [
      skill('lore'),
      skill('sway'),
      item('Herb satchel'),
      item('Coin purse (10 marks)'),
      feature('Village Welcome', 'Rural households will feed and shelter you in exchange for a remedy.', undefined, 'passive'),
    ]),
  ],
}

const talent = (id: string, name: string, summary: string, effects: Effect[]): Entry => ({ id, name, summary, effects })

const talents: Collection = {
  id: 'talents',
  label: 'Talents',
  singular: 'Talent',
  entries: [
    talent('tough', 'Tough', '+3 Vitality, and +1 more each level after this.', [
      { type: 'bonus', stat: 'vitalityBonus', amount: 3 },
      { type: 'bonus', stat: 'vitalityPerLevel', amount: 1 },
      feature('Tough', 'You have more Vitality than your calling suggests.', undefined, 'passive'),
    ]),
    talent('quick', 'Quick', 'Your Speed increases by 2.', [
      { type: 'bonus', stat: 'speed', amount: 2 },
      feature('Quick', 'You move noticeably faster than the people around you.', undefined, 'passive'),
    ]),
    talent('deft', 'Deft', 'Add +1 to Defence.', [
      { type: 'bonus', stat: 'defenceBonus', amount: 1 },
      feature('Deft', 'You are hard to land a clean hit on.', undefined, 'passive'),
    ]),
    talent('studied', 'Studied', 'Gain two more skills.', [feature('Studied', 'You picked up two more trades along the way.', undefined, 'passive')]),
    talent('deep-reserves', 'Deep Reserves', '+3 Strain.', [
      { type: 'bonus', stat: 'strainBonus', amount: 3 },
      feature('Deep Reserves', 'You can push magic further than most before it costs you.', undefined, 'passive'),
    ]),
    talent('hard-to-kill', 'Hard to Kill', 'Once per session, refuse to die.', [
      feature('Hard to Kill', 'Once per session, when you would die, you do not. You are still in a very bad way.', '1/session', 'reaction'),
    ]),
    talent('opportunist', 'Opportunist', 'Deal 2 extra damage to anyone who has not acted yet.', [
      feature('Opportunist', 'You deal 2 extra damage to a target that has not yet taken a turn this fight.', undefined, 'passive'),
    ]),
    talent('unshakeable', 'Unshakeable', 'You cannot be frightened or charmed.', [
      feature('Unshakeable', 'Fear and persuasion magic simply do not take on you.', undefined, 'passive'),
    ]),
  ],
}

// ---------------------------------------------------------------------------
// Gear
// ---------------------------------------------------------------------------

const weapon = (id: string, name: string, damage: string, properties: string, category: 'simple' | 'martial' | 'bow', reach: 'melee' | 'ranged'): Entry => ({
  id,
  name,
  tags: ['weapon', category, reach],
  summary: `${damage}${properties ? ` · ${properties}` : ''}`,
  meta: { Damage: damage, Properties: properties || '—', Cost: '10 marks' },
})

const armour = (id: string, name: string, bonus: number, category: string, note: string): Entry => ({
  id,
  name,
  tags: ['armour', category],
  summary: `Defence +${bonus}${note ? ` · ${note}` : ''}`,
  meta: { Defence: `+${bonus}`, Notes: note || '—', Cost: '25 marks', acBase: bonus, acDexMax: 0 },
})

const kit = (id: string, name: string, summary = ''): Entry => ({ id, name, tags: ['kit'], summary, meta: { Cost: '5 marks' } })

const gearCollection: Collection = {
  id: 'gear',
  label: 'Gear',
  singular: 'Item',
  entries: [
    weapon('knife', 'Knife', '1d4', 'Light, thrown', 'simple', 'melee'),
    weapon('staff', 'Staff', '1d6', 'Two-handed', 'simple', 'melee'),
    weapon('spear', 'Spear', '1d6', 'Reach', 'simple', 'melee'),
    weapon('sword', 'Sword', '1d8', '', 'martial', 'melee'),
    weapon('axe', 'Axe', '1d8', 'Heavy', 'martial', 'melee'),
    weapon('greatblade', 'Greatblade', '1d12', 'Heavy, two-handed', 'martial', 'melee'),
    weapon('sling', 'Sling', '1d4', 'Ammunition', 'simple', 'ranged'),
    weapon('shortbow', 'Shortbow', '1d6', 'Ammunition, two-handed', 'bow', 'ranged'),
    weapon('longbow', 'Longbow', '1d8', 'Ammunition, two-handed', 'bow', 'ranged'),

    armour('padded-coat', 'Padded coat', 1, 'light', ''),
    armour('scale-jack', 'Scale jack', 2, 'medium', 'Noisy'),
    armour('plated-harness', 'Plated harness', 3, 'heavy', 'Slow, noisy'),
    { id: 'buckler', name: 'Buckler', tags: ['armour', 'shield'], summary: 'Defence +1', meta: { Defence: '+1', Notes: '—', Cost: '10 marks', acBonus: 1 } },

    kit('travel-kit', 'Travel kit', 'Bedroll, tinder, rations for three days'),
    kit('tool-roll', 'Tool roll', 'Hand tools for a trade'),
    kit('writing-case', 'Writing case', 'Ink, pens, and paper'),
    kit('lockpicks', 'Lockpicks', 'For doors that were not meant for you'),
    kit('medical-kit', 'Medical kit', 'Bandages, needle, thread, spirits'),
    kit('herb-satchel', 'Herb satchel', 'Dried remedies and a mortar'),
    kit('lantern', 'Lantern', 'Burns for six hours on a flask of oil'),
    kit('rope', 'Rope (15 paces)'),
    kit('arrows', 'Arrows (20)'),
    kit('coin-purse', 'Coin purse (10 marks)'),
  ],
}

// ---------------------------------------------------------------------------
// Workings — magic without slots or spell levels
// ---------------------------------------------------------------------------

const working = (name: string, lists: string[], strain: number, range: string, text: string): Entry => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  summary: text,
  tags: [...lists, 'level-0'],
  meta: { level: 0, Strain: strain, Range: range },
})

const workings: Collection = {
  id: 'workings',
  label: 'Workings',
  singular: 'Working',
  entries: [
    working('Ember', ['adept'], 1, '20 paces', 'A fistful of fire. 2d6 damage, and flammable things catch.'),
    working('Shard', ['adept'], 1, '20 paces', 'A splinter of hard light. 1d8 damage, never misses.'),
    working('Ward', ['adept', 'voice'], 1, 'Self', 'Until your next rest, the first hit against you deals no damage.'),
    working('Mend', ['adept', 'voice'], 2, 'Touch', 'Restore 2d6 Vitality. Cannot be used twice on the same person before a rest.'),
    working('Lift', ['adept'], 1, '20 paces', 'Move an object no heavier than you, slowly, by looking at it.'),
    working('Still', ['adept'], 2, '10 paces', 'One creature cannot move or speak for a round unless it beats your Wits.'),
    working('Unseen', ['adept', 'voice'], 2, 'Self', 'You are unseen while you stay still and silent.'),
    working('Farspeak', ['adept', 'voice'], 1, 'Anywhere known', 'Speak a sentence into the ear of someone you have met.'),
    working('Douse', ['adept'], 1, '20 paces', 'Put out every fire and light in a room.'),
    working('Seal', ['adept'], 1, 'Touch', 'A door or container will not open for anyone but you until your next rest.'),
    working('Read the Grain', ['adept'], 1, 'Touch', 'Learn the last strong thing that happened to an object.'),
    working('Cinderstep', ['adept'], 2, '10 paces', 'Step from one shadow to another you can see.'),

    working('Turn Aside', ['voice'], 1, '10 paces', 'One creature must find a reason not to attack you this round.'),
    working('Hearten', ['voice'], 1, '10 paces', 'An ally adds your Heart to their next roll.'),
    working('Sway', ['voice'], 2, '10 paces', 'A listener genuinely believes one reasonable thing you say, until proved otherwise.'),
    working('Silence the Room', ['voice'], 2, '10 paces', 'No sound leaves the room until you leave it.'),
    working('Borrowed Face', ['voice'], 2, 'Self', 'You appear to be someone else of similar build until you speak your own name.'),
    working('Call to Account', ['voice'], 3, '10 paces', 'One creature must answer your next question truthfully or take 2d6 damage.'),
  ],
}

// ---------------------------------------------------------------------------
// Derived statistics
// ---------------------------------------------------------------------------

const derived: DerivedStat[] = [
  // Edge comes first because Defence builds on it.
  { id: 'edge', label: 'Edge', slot: 'secondary', signed: true, formula: 'prof', description: 'Added to anything you are trained in.' },
  {
    id: 'vitality',
    label: 'Vitality',
    slot: 'primary',
    formula: 'stat.vitalityDie + might + (level - 1) * (floor(stat.vitalityDie / 2) + 1 + might) + stat.vitalityBonus + level * stat.vitalityPerLevel',
    description: 'How much punishment you take before you go down.',
  },
  {
    id: 'defence',
    label: 'Defence',
    slot: 'primary',
    // Armour *adds* here rather than replacing a base, which is the opposite of
    // how the 5e ruleset works — and needs no engine change to express.
    formula: '8 + edge + grace + stat.armorAC + stat.shieldBonus + stat.defenceBonus',
    description: 'The number an attack must beat. Armour and shields add to it.',
  },
  { id: 'initiative', label: 'Initiative', slot: 'primary', signed: true, formula: 'grace + wits' },
  { id: 'speed', label: 'Speed', slot: 'primary', formula: 'stat.speed', format: '{value} paces' },
  { id: 'strain', label: 'Strain', slot: 'secondary', formula: 'max(0, level + heart + stat.strainBonus)', description: 'The pool magic is paid from.' },
  { id: 'recovery', label: 'Recovery Dice', slot: 'secondary', formula: 'level', format: '{value}d{stat.vitalityDie}' },
  { id: 'notice', label: 'Passive Notice', slot: 'secondary', formula: '8 + skill.notice' },
]

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const steps: Step[] = [
  {
    id: 'intro',
    kind: 'intro',
    title: 'Embers',
    subtitle: 'A compact game. Four abilities, ten levels, and magic that costs you something.',
    body: [
      'Embers is a small original system built to show that this wizard is not tied to any one game. It is complete and playable, and every part of it is MIT-licensed — copy it, rewrite it, use it as the shape of your own.',
      'Abilities here run from -1 to +3 and are used directly: there is no score to convert. Magic costs Strain rather than slots, and armour adds to your Defence rather than replacing it.',
    ],
  },
  { id: 'level', kind: 'level', title: 'What level are you starting at?', subtitle: 'Most games of Embers start at 1 and run to about 6.' },
  { id: 'kin', kind: 'pick', collection: 'kin', title: 'Choose your kin', subtitle: 'Where you come from, and what that did to you.' },
  { id: 'calling', kind: 'pick', collection: 'callings', title: 'Choose your calling', subtitle: 'What you do when things go wrong. This decides most of your turn.' },
  { id: 'origin', kind: 'pick', collection: 'origins', title: 'Choose your origin', subtitle: 'The work you did before any of this started.' },
  { id: 'abilities', kind: 'abilities', title: 'Set your abilities', subtitle: 'Four numbers, from -1 to +3. They are added to rolls directly.' },
  { id: 'choices', kind: 'choices', title: 'Finishing touches', subtitle: 'Anything still outstanding from your kin, calling, or origin.' },
  { id: 'gear', kind: 'equipment', collection: 'gear', title: 'Gear', subtitle: 'Mark what you are wearing — armour only counts when worn.' },
  { id: 'workings', kind: 'spells', collection: 'workings', title: 'Workings', subtitle: 'The magic you know. Skip this if your calling does not work magic.' },
  {
    id: 'identity',
    kind: 'identity',
    title: 'Who are they?',
    subtitle: 'Two or three answers is plenty. Leave the rest.',
    fields: [
      { id: 'pronouns', label: 'Pronouns', kind: 'text', placeholder: 'they/them' },
      {
        id: 'why',
        label: 'Why are they out here?',
        kind: 'textarea',
        hint: 'The single most useful line you can write. Give yourself a reason to keep going.',
        suggestions: ['They are walking away from something and have not stopped yet.', 'Someone paid them, and the money is already spent.', 'They saw something nobody believed, and they intend to prove it.'],
      },
      {
        id: 'who',
        label: 'Who is waiting for them?',
        kind: 'textarea',
        hint: 'Someone alive. Living people give your GM a thread to pull.',
        suggestions: ['A sibling who writes every month and never gets a reply.', 'The person who trained them, now too old to travel.', 'A child they have never met.'],
      },
      {
        id: 'joy',
        label: 'Something they love',
        kind: 'textarea',
        hint: 'Not a wound. A pleasure — that is what makes a character feel real.',
        suggestions: ['Card games they are visibly bad at.', 'Being the first one awake.', 'Arguing about food.'],
      },
      { id: 'trouble', label: 'What gets them into trouble?', kind: 'textarea', hint: 'Give your GM permission.' },
    ],
  },
  { id: 'review', kind: 'review', title: 'Your character', subtitle: 'Everything in one place. Download the sheet when you are ready.' },
]

export const embers: Ruleset = {
  id: 'embers',
  name: 'Embers',
  version: '1.0.0',
  summary:
    'A compact original system: four abilities used directly as modifiers, ten levels, magic paid for with Strain rather than spell slots, and armour that adds to your Defence. Written for this project and MIT-licensed.',
  license: {
    name: 'MIT',
    notice: 'Embers is original to the Character Creator project and released under the MIT Licence. Copy it, change it, or use it as the shape of your own system.',
  },
  maxLevel: 10,
  proficiencyBonus: '1 + floor(level / 3)',
  // Abilities here *are* the modifier, so no conversion happens at all.
  abilityModifier: 'score',
  abilities,
  skills,
  proficiencyCategories: [
    { id: 'skill', label: 'Skills', usesAbilityModifier: true },
    { id: 'gear', label: 'Gear Training' },
    { id: 'language', label: 'Languages' },
  ],
  abilityMethods: [
    {
      id: 'array',
      name: 'Standard spread',
      description: 'Assign +3, +2, +1, and 0. The usual way to start.',
      kind: 'array',
      array: [3, 2, 1, 0],
    },
    {
      id: 'gritty',
      name: 'Gritty spread',
      description: 'Assign +2, +2, +1, and -1. Sharper edges, one real weakness.',
      kind: 'array',
      array: [2, 2, 1, -1],
    },
    { id: 'manual', name: 'Enter manually', description: 'For a table with a house rule.', kind: 'manual', min: -2, max: 4 },
  ],
  collections: [kin, callings, paths, origins, talents, gearCollection, workings],
  steps,
  derived,
  baseStats: {
    speed: 6,
    size: 'Medium',
    vitalityDie: 6,
    vitalityBonus: 0,
    vitalityPerLevel: 0,
    defenceBonus: 0,
    strainBonus: 0,
    workingsKnown: 0,
    darkSight: 0,
    armorAC: 0,
    shieldBonus: 0,
    wearingArmor: 0,
  },
  actionTimings: [
    { id: 'action', label: 'Main action' },
    { id: 'swift', label: 'Swift action' },
    { id: 'reaction', label: 'Reaction' },
    { id: 'passive', label: 'Always on' },
  ],
  armor: {
    collection: 'gear',
    tag: 'armour',
    shieldTag: 'shield',
    ability: 'grace',
    proficiencyCategory: 'gear',
    blanketProficiencies: {
      light: ['Light armour', 'All armour'],
      medium: ['Medium armour', 'All armour'],
      heavy: ['Heavy armour', 'All armour'],
      shield: ['All armour', 'Light armour'],
    },
  },
  weapons: {
    collection: 'gear',
    tag: 'weapon',
    proficiencyCategory: 'gear',
    abilityRules: [
      { tag: 'ranged', abilities: ['grace'] },
      { property: 'Light', abilities: ['grace', 'might'] },
      { abilities: ['might'] },
    ],
    blanketProficiencies: {
      simple: 'Simple weapons',
      martial: 'All weapons',
      bow: 'Bows',
    },
    attackFormula: 'weaponMod + if(proficient, prof, 0)',
    damageBonusFormula: 'weaponMod',
  },
}
