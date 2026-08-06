import type { Collection, Entry } from '../../engine/types'

/** SRD 5.1 equipment: weapons, armour, packs, and adventuring gear. */

const weapon = (
  id: string,
  name: string,
  cost: string,
  damage: string,
  weight: string,
  properties: string,
  category: 'simple' | 'martial',
  reach: 'melee' | 'ranged',
): Entry => ({
  id,
  name,
  tags: ['weapon', category, reach],
  summary: `${damage} · ${properties || '—'}`,
  meta: { Cost: cost, Damage: damage, Weight: weight, Properties: properties || '—' },
})

/**
 * Armour carries its rule in structured form as well as prose. The display
 * string is for humans; `acBase`, `acDexMax` and `strengthMin` are what the
 * engine reads when working out your Armor Class.
 *
 * `acDexMax` is omitted for light armour, which adds the whole Dexterity
 * modifier, and is 0 for heavy armour, which adds none of it.
 */
const armor = (
  id: string,
  name: string,
  cost: string,
  weight: string,
  category: 'light' | 'medium' | 'heavy',
  rule: { acBase: number; acDexMax?: number; strengthMin?: number; stealthDisadvantage?: boolean },
): Entry => {
  const display =
    rule.acDexMax === 0
      ? String(rule.acBase)
      : rule.acDexMax === undefined
        ? `${rule.acBase} + DEX`
        : `${rule.acBase} + DEX (max ${rule.acDexMax})`

  const notes = [
    rule.strengthMin ? `Requires STR ${rule.strengthMin}` : '',
    rule.stealthDisadvantage ? 'Disadvantage on Stealth' : '',
  ]
    .filter(Boolean)
    .join(', ')

  return {
    id,
    name,
    tags: ['armor', category],
    summary: `AC ${display}${notes ? ` · ${notes}` : ''}`,
    meta: {
      Cost: cost,
      AC: display,
      Weight: weight,
      Notes: notes || '—',
      acBase: rule.acBase,
      ...(rule.acDexMax === undefined ? {} : { acDexMax: rule.acDexMax }),
      ...(rule.strengthMin ? { strengthMin: rule.strengthMin } : {}),
      ...(rule.stealthDisadvantage ? { stealthDisadvantage: 1 } : {}),
    },
  }
}

/** A shield stacks a flat bonus on top of whatever else you are wearing. */
const shield = (id: string, name: string, cost: string, weight: string, bonus: number): Entry => ({
  id,
  name,
  tags: ['armor', 'shield'],
  summary: `AC +${bonus}`,
  meta: { Cost: cost, AC: `+${bonus}`, Weight: weight, Notes: '—', acBonus: bonus },
})

const gear = (id: string, name: string, cost: string, weight: string, summary = ''): Entry => ({
  id,
  name,
  tags: ['gear'],
  summary,
  meta: { Cost: cost, Weight: weight },
})

const pack = (id: string, name: string, cost: string, contents: string): Entry => ({
  id,
  name,
  tags: ['pack'],
  summary: contents,
  meta: { Cost: cost },
})

const entries: Entry[] = [
  // --- Simple melee weapons ---
  weapon('club', 'Club', '1 sp', '1d4 bludgeoning', '2 lb.', 'Light', 'simple', 'melee'),
  weapon('dagger', 'Dagger', '2 gp', '1d4 piercing', '1 lb.', 'Finesse, light, thrown (20/60)', 'simple', 'melee'),
  weapon('greatclub', 'Greatclub', '2 sp', '1d8 bludgeoning', '10 lb.', 'Two-handed', 'simple', 'melee'),
  weapon('handaxe', 'Handaxe', '5 gp', '1d6 slashing', '2 lb.', 'Light, thrown (20/60)', 'simple', 'melee'),
  weapon('javelin', 'Javelin', '5 sp', '1d6 piercing', '2 lb.', 'Thrown (30/120)', 'simple', 'melee'),
  weapon('light-hammer', 'Light hammer', '2 gp', '1d4 bludgeoning', '2 lb.', 'Light, thrown (20/60)', 'simple', 'melee'),
  weapon('mace', 'Mace', '5 gp', '1d6 bludgeoning', '4 lb.', '', 'simple', 'melee'),
  weapon('quarterstaff', 'Quarterstaff', '2 sp', '1d6 bludgeoning', '4 lb.', 'Versatile (1d8)', 'simple', 'melee'),
  weapon('sickle', 'Sickle', '1 gp', '1d4 slashing', '2 lb.', 'Light', 'simple', 'melee'),
  weapon('spear', 'Spear', '1 gp', '1d6 piercing', '3 lb.', 'Thrown (20/60), versatile (1d8)', 'simple', 'melee'),

  // --- Simple ranged weapons ---
  weapon('light-crossbow', 'Light crossbow', '25 gp', '1d8 piercing', '5 lb.', 'Ammunition (80/320), loading, two-handed', 'simple', 'ranged'),
  weapon('dart', 'Dart', '5 cp', '1d4 piercing', '1/4 lb.', 'Finesse, thrown (20/60)', 'simple', 'ranged'),
  weapon('shortbow', 'Shortbow', '25 gp', '1d6 piercing', '2 lb.', 'Ammunition (80/320), two-handed', 'simple', 'ranged'),
  weapon('sling', 'Sling', '1 sp', '1d4 bludgeoning', '—', 'Ammunition (30/120)', 'simple', 'ranged'),

  // --- Martial melee weapons ---
  weapon('battleaxe', 'Battleaxe', '10 gp', '1d8 slashing', '4 lb.', 'Versatile (1d10)', 'martial', 'melee'),
  weapon('flail', 'Flail', '10 gp', '1d8 bludgeoning', '2 lb.', '', 'martial', 'melee'),
  weapon('glaive', 'Glaive', '20 gp', '1d10 slashing', '6 lb.', 'Heavy, reach, two-handed', 'martial', 'melee'),
  weapon('greataxe', 'Greataxe', '30 gp', '1d12 slashing', '7 lb.', 'Heavy, two-handed', 'martial', 'melee'),
  weapon('greatsword', 'Greatsword', '50 gp', '2d6 slashing', '6 lb.', 'Heavy, two-handed', 'martial', 'melee'),
  weapon('halberd', 'Halberd', '20 gp', '1d10 slashing', '6 lb.', 'Heavy, reach, two-handed', 'martial', 'melee'),
  weapon('lance', 'Lance', '10 gp', '1d12 piercing', '6 lb.', 'Reach, special', 'martial', 'melee'),
  weapon('longsword', 'Longsword', '15 gp', '1d8 slashing', '3 lb.', 'Versatile (1d10)', 'martial', 'melee'),
  weapon('maul', 'Maul', '10 gp', '2d6 bludgeoning', '10 lb.', 'Heavy, two-handed', 'martial', 'melee'),
  weapon('morningstar', 'Morningstar', '15 gp', '1d8 piercing', '4 lb.', '', 'martial', 'melee'),
  weapon('pike', 'Pike', '5 gp', '1d10 piercing', '18 lb.', 'Heavy, reach, two-handed', 'martial', 'melee'),
  weapon('rapier', 'Rapier', '25 gp', '1d8 piercing', '2 lb.', 'Finesse', 'martial', 'melee'),
  weapon('scimitar', 'Scimitar', '25 gp', '1d6 slashing', '3 lb.', 'Finesse, light', 'martial', 'melee'),
  weapon('shortsword', 'Shortsword', '10 gp', '1d6 piercing', '2 lb.', 'Finesse, light', 'martial', 'melee'),
  weapon('trident', 'Trident', '5 gp', '1d6 piercing', '4 lb.', 'Thrown (20/60), versatile (1d8)', 'martial', 'melee'),
  weapon('war-pick', 'War pick', '5 gp', '1d8 piercing', '2 lb.', '', 'martial', 'melee'),
  weapon('warhammer', 'Warhammer', '15 gp', '1d8 bludgeoning', '2 lb.', 'Versatile (1d10)', 'martial', 'melee'),
  weapon('whip', 'Whip', '2 gp', '1d4 slashing', '3 lb.', 'Finesse, reach', 'martial', 'melee'),

  // --- Martial ranged weapons ---
  weapon('blowgun', 'Blowgun', '10 gp', '1 piercing', '1 lb.', 'Ammunition (25/100), loading', 'martial', 'ranged'),
  weapon('hand-crossbow', 'Hand crossbow', '75 gp', '1d6 piercing', '3 lb.', 'Ammunition (30/120), light, loading', 'martial', 'ranged'),
  weapon('heavy-crossbow', 'Heavy crossbow', '50 gp', '1d10 piercing', '18 lb.', 'Ammunition (100/400), heavy, loading, two-handed', 'martial', 'ranged'),
  weapon('longbow', 'Longbow', '50 gp', '1d8 piercing', '2 lb.', 'Ammunition (150/600), heavy, two-handed', 'martial', 'ranged'),
  weapon('net', 'Net', '1 gp', '—', '3 lb.', 'Special, thrown (5/15)', 'martial', 'ranged'),

  // --- Armour ---
  armor('padded', 'Padded armor', '5 gp', '8 lb.', 'light', { acBase: 11, stealthDisadvantage: true }),
  armor('leather', 'Leather armor', '10 gp', '10 lb.', 'light', { acBase: 11 }),
  armor('studded-leather', 'Studded leather', '45 gp', '13 lb.', 'light', { acBase: 12 }),
  armor('hide', 'Hide armor', '10 gp', '12 lb.', 'medium', { acBase: 12, acDexMax: 2 }),
  armor('chain-shirt', 'Chain shirt', '50 gp', '20 lb.', 'medium', { acBase: 13, acDexMax: 2 }),
  armor('scale-mail', 'Scale mail', '50 gp', '45 lb.', 'medium', { acBase: 14, acDexMax: 2, stealthDisadvantage: true }),
  armor('breastplate', 'Breastplate', '400 gp', '20 lb.', 'medium', { acBase: 14, acDexMax: 2 }),
  armor('half-plate', 'Half plate', '750 gp', '40 lb.', 'medium', { acBase: 15, acDexMax: 2, stealthDisadvantage: true }),
  armor('ring-mail', 'Ring mail', '30 gp', '40 lb.', 'heavy', { acBase: 14, acDexMax: 0, stealthDisadvantage: true }),
  armor('chain-mail', 'Chain mail', '75 gp', '55 lb.', 'heavy', { acBase: 16, acDexMax: 0, strengthMin: 13, stealthDisadvantage: true }),
  armor('splint', 'Splint armor', '200 gp', '60 lb.', 'heavy', { acBase: 17, acDexMax: 0, strengthMin: 15, stealthDisadvantage: true }),
  armor('plate', 'Plate armor', '1,500 gp', '65 lb.', 'heavy', { acBase: 18, acDexMax: 0, strengthMin: 15, stealthDisadvantage: true }),
  shield('shield', 'Shield', '10 gp', '6 lb.', 2),

  // --- Packs ---
  pack('burglars-pack', "Burglar's pack", '16 gp', 'Backpack, ball bearings, string, bell, candles, crowbar, hammer, pitons, hooded lantern, oil, rations, tinderbox, waterskin, rope'),
  pack('diplomats-pack', "Diplomat's pack", '39 gp', 'Chest, cases for maps and scrolls, fine clothes, ink, pen, lamp, oil, paper, perfume, sealing wax, soap'),
  pack('dungeoneers-pack', "Dungeoneer's pack", '12 gp', 'Backpack, crowbar, hammer, pitons, torches, tinderbox, rations, waterskin, hempen rope'),
  pack('entertainers-pack', "Entertainer's pack", '40 gp', 'Backpack, bedroll, costumes, candles, rations, waterskin, disguise kit'),
  pack('explorers-pack', "Explorer's pack", '10 gp', 'Backpack, bedroll, mess kit, tinderbox, torches, rations, waterskin, hempen rope'),
  pack('priests-pack', "Priest's pack", '19 gp', 'Backpack, blanket, candles, tinderbox, alms box, incense, censer, vestments, rations, waterskin'),
  pack('scholars-pack', "Scholar's pack", '40 gp', 'Backpack, book of lore, ink, pen, parchment, little bag of sand, small knife'),

  // --- Adventuring gear ---
  gear('abacus', 'Abacus', '2 gp', '2 lb.'),
  gear('acid', 'Acid (vial)', '25 gp', '1 lb.', '2d6 acid damage on a hit'),
  gear('alchemists-fire', "Alchemist's fire (flask)", '50 gp', '1 lb.', '1d4 fire damage per turn until doused'),
  gear('arrows', 'Arrows', '1 gp per 20', '1 lb. per 20'),
  gear('crossbow-bolts', 'Crossbow bolts', '1 gp per 20', '1 1/2 lb. per 20'),
  gear('sling-bullets', 'Sling bullets', '4 cp per 20', '1 1/2 lb. per 20'),
  gear('antitoxin', 'Antitoxin (vial)', '50 gp', '—', 'Advantage on poison saves for 1 hour'),
  gear('backpack', 'Backpack', '2 gp', '5 lb.'),
  gear('ball-bearings', 'Ball bearings (bag of 1,000)', '1 gp', '2 lb.'),
  gear('bedroll', 'Bedroll', '1 gp', '7 lb.'),
  gear('bell', 'Bell', '1 gp', '—'),
  gear('blanket', 'Blanket', '5 sp', '3 lb.'),
  gear('block-and-tackle', 'Block and tackle', '1 gp', '5 lb.'),
  gear('book', 'Book', '25 gp', '5 lb.'),
  gear('caltrops', 'Caltrops (bag of 20)', '1 gp', '2 lb.'),
  gear('candle', 'Candle', '1 cp', '—', 'Bright light 5 ft. for 1 hour'),
  gear('chain', 'Chain (10 feet)', '5 gp', '10 lb.'),
  gear('chalk', 'Chalk (1 piece)', '1 cp', '—'),
  gear('climbers-kit', "Climber's kit", '25 gp', '12 lb.'),
  gear('clothes-common', 'Common clothes', '5 sp', '3 lb.'),
  gear('clothes-fine', 'Fine clothes', '15 gp', '6 lb.'),
  gear('clothes-travelers', "Traveler's clothes", '2 gp', '4 lb.'),
  gear('component-pouch', 'Component pouch', '25 gp', '2 lb.', 'Holds material components'),
  gear('crowbar', 'Crowbar', '2 gp', '5 lb.'),
  gear('fishing-tackle', 'Fishing tackle', '1 gp', '4 lb.'),
  gear('grappling-hook', 'Grappling hook', '2 gp', '4 lb.'),
  gear('hammer', 'Hammer', '1 gp', '3 lb.'),
  gear('healers-kit', "Healer's kit", '5 gp', '3 lb.', 'Ten uses; stabilise a dying creature'),
  gear('holy-symbol', 'Holy symbol', '5 gp', '1 lb.', 'Spellcasting focus for clerics and paladins'),
  gear('holy-water', 'Holy water (flask)', '25 gp', '1 lb.', '2d6 radiant to fiends and undead'),
  gear('hunting-trap', 'Hunting trap', '5 gp', '25 lb.'),
  gear('ink', 'Ink (1 ounce bottle)', '10 gp', '—'),
  gear('ink-pen', 'Ink pen', '2 cp', '—'),
  gear('lamp', 'Lamp', '5 sp', '1 lb.', 'Bright light 15 ft. for 6 hours per flask'),
  gear('lantern-hooded', 'Hooded lantern', '5 gp', '2 lb.', 'Bright light 30 ft. for 6 hours per flask'),
  gear('lock', 'Lock', '10 gp', '1 lb.', 'DC 15 to pick'),
  gear('manacles', 'Manacles', '2 gp', '6 lb.'),
  gear('mess-kit', 'Mess kit', '2 sp', '1 lb.'),
  gear('mirror', 'Steel mirror', '5 gp', '1/2 lb.'),
  gear('oil', 'Oil (flask)', '1 sp', '1 lb.'),
  gear('paper', 'Paper (one sheet)', '2 sp', '—'),
  gear('parchment', 'Parchment (one sheet)', '1 sp', '—'),
  gear('pitons', 'Piton', '5 cp', '1/4 lb.'),
  gear('poison-basic', 'Basic poison (vial)', '100 gp', '—', '1d4 poison damage, DC 10 CON save'),
  gear('pole', 'Pole (10-foot)', '5 cp', '7 lb.'),
  gear('pot-iron', 'Iron pot', '2 gp', '10 lb.'),
  gear('potion-healing', 'Potion of healing', '50 gp', '1/2 lb.', 'Regain 2d4 + 2 hit points'),
  gear('pouch', 'Pouch', '5 sp', '1 lb.'),
  gear('quiver', 'Quiver', '1 gp', '1 lb.', 'Holds 20 arrows'),
  gear('rations', 'Rations (1 day)', '5 sp', '2 lb.'),
  gear('robes', 'Robes', '1 gp', '4 lb.'),
  gear('rope-hempen', 'Hempen rope (50 feet)', '1 gp', '10 lb.'),
  gear('rope-silk', 'Silk rope (50 feet)', '10 gp', '5 lb.'),
  gear('sack', 'Sack', '1 cp', '1/2 lb.'),
  gear('scale', 'Merchant’s scale', '5 gp', '3 lb.'),
  gear('sealing-wax', 'Sealing wax', '5 sp', '—'),
  gear('shovel', 'Shovel', '2 gp', '5 lb.'),
  gear('signal-whistle', 'Signal whistle', '5 cp', '—'),
  gear('signet-ring', 'Signet ring', '5 gp', '—'),
  gear('soap', 'Soap', '2 cp', '—'),
  gear('spellbook', 'Spellbook', '50 gp', '3 lb.', 'Holds a wizard’s spells'),
  gear('spikes-iron', 'Iron spikes (10)', '1 gp', '5 lb.'),
  gear('spyglass', 'Spyglass', '1,000 gp', '1 lb.'),
  gear('tent', 'Two-person tent', '2 gp', '20 lb.'),
  gear('tinderbox', 'Tinderbox', '5 sp', '1 lb.'),
  gear('torch', 'Torch', '1 cp', '1 lb.', 'Bright light 20 ft. for 1 hour'),
  gear('vial', 'Vial', '1 gp', '—'),
  gear('waterskin', 'Waterskin', '2 sp', '5 lb. (full)'),
  gear('whetstone', 'Whetstone', '1 cp', '1 lb.'),
  gear('thieves-tools', "Thieves' tools", '25 gp', '1 lb.', 'Pick locks and disarm traps'),
  gear('calligraphers-supplies', "Calligrapher's supplies", '10 gp', '5 lb.'),
  gear('disguise-kit', 'Disguise kit', '25 gp', '3 lb.'),
  gear('forgery-kit', 'Forgery kit', '15 gp', '5 lb.'),
  gear('herbalism-kit', 'Herbalism kit', '5 gp', '3 lb.'),
  gear('navigators-tools', "Navigator's tools", '25 gp', '2 lb.'),
  gear('poisoners-kit', "Poisoner's kit", '50 gp', '2 lb.'),
  gear('arcane-focus', 'Arcane focus', '10 gp', '2 lb.', 'Orb, rod, staff, wand, or crystal'),
  gear('druidic-focus', 'Druidic focus', '10 gp', '2 lb.', 'Sprig of mistletoe, totem, wooden staff, or yew wand'),
]

export const equipment: Collection = {
  id: 'equipment',
  label: 'Equipment',
  singular: 'Item',
  entries,
}
