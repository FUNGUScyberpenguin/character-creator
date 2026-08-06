import type { Collection, Effect, Entry } from '../../engine/types'
import { selectableLanguages, toolProficiencies } from './basics'

/**
 * Backgrounds.
 *
 * SRD 5.1 publishes exactly one background — Acolyte — so the rest of these are
 * original to this project and released under the repository's MIT licence.
 * They follow the same shape (two skills, a couple of proficiencies, a piece of
 * kit, and a roleplaying feature) and are safe to copy or rewrite.
 */

const feature = (name: string, description: string): Effect => ({ type: 'feature', name, description })
const skill = (value: string): Effect => ({ type: 'proficiency', category: 'skill', value })
const tool = (value: string): Effect => ({ type: 'proficiency', category: 'tool', value })
const item = (name: string, quantity = 1): Effect => ({ type: 'item', item: name, quantity })

const languageChoice = (count: number) => ({
  id: 'languages',
  prompt: count === 1 ? 'Choose a language' : `Choose ${count} languages`,
  count,
  source: { kind: 'proficiencies' as const, category: 'language', from: selectableLanguages },
})

const entries: Entry[] = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    icon: '🕯️',
    summary: 'You served in a temple, and the faithful still recognise one of their own.',
    description:
      'You have spent your life in service to a temple, acting as an intermediary between the realm of the holy and the mortal world. (SRD 5.1)',
    tags: ['srd'],
    effects: [
      skill('insight'),
      skill('religion'),
      item('Holy symbol'),
      item('Prayer book'),
      item('Stick of incense', 5),
      item('Vestments'),
      item('Common clothes'),
      item('Gold pieces', 15),
      feature(
        'Shelter of the Faithful',
        'You and your companions can expect free healing and care at temples of your faith, and you can call on the priests of your order for support that does not put them in danger.',
      ),
    ],
    choices: [languageChoice(2)],
  },
  {
    id: 'caravan-guard',
    name: 'Caravan Guard',
    icon: '🐫',
    summary: 'You walked the trade roads for years, watching the treeline and the merchants alike.',
    description:
      'Long hauls between cities taught you the roads, the tolls, and which sound in the dark is worth waking the camp for.',
    effects: [
      skill('athletics'),
      skill('perception'),
      tool("Navigator's tools"),
      item("Traveler's clothes"),
      item('Bedroll'),
      item('Hooded lantern'),
      item('Gold pieces', 10),
      feature(
        'Road-Wise',
        'You know the caravan routes of the region: where the safe camps are, which inns take coin from bandits, and roughly how long any overland journey should take. Caravan masters will usually give you and your companions passage in exchange for a shift on watch.',
      ),
    ],
    choices: [languageChoice(1)],
  },
  {
    id: 'dockhand',
    name: 'Dockhand',
    icon: '⚓',
    summary: 'You hauled cargo on the waterfront and learned what goes on the manifest and what does not.',
    description:
      'The harbour raised you: rope, salt, and a working knowledge of exactly how much a crate should weigh.',
    effects: [
      skill('athletics'),
      skill('sleight-of-hand'),
      tool("Navigator's tools"),
      item('Common clothes'),
      item('Belaying pin (club)'),
      item('Silk rope (50 feet)'),
      item('Gold pieces', 10),
      feature(
        'Harbour Contacts',
        'You can find a berth on an outbound ship for yourself and your companions in exchange for work, and you know which harbour officials can be persuaded to look away from a cargo hold.',
      ),
    ],
  },
  {
    id: 'hedge-healer',
    name: 'Hedge Healer',
    icon: '🌿',
    summary: 'No temple, no licence — just herbs, splints, and a reputation in the villages.',
    description:
      'You learned medicine from someone who learned it from someone else, and you have set more bones than most surgeons.',
    effects: [
      skill('medicine'),
      skill('nature'),
      tool('Herbalism kit'),
      item('Herbalism kit'),
      item('Common clothes'),
      item("Healer's kit"),
      item('Gold pieces', 12),
      feature(
        'Village Welcome',
        'In any rural settlement you can find lodging and a meal for yourself and your companions in exchange for treating the sick. People remember a healer who does not charge.',
      ),
    ],
  },
  {
    id: 'cloister-scribe',
    name: 'Cloister Scribe',
    icon: '🖋️',
    summary: 'Years copying manuscripts left you with a fine hand and an unusually broad education.',
    description:
      'You were trained to copy, translate, and authenticate documents — and you read a great deal that you were not meant to.',
    effects: [
      skill('history'),
      skill('investigation'),
      tool("Calligrapher's supplies"),
      item("Calligrapher's supplies"),
      item('Fine clothes'),
      item('Blank journal'),
      item('Gold pieces', 15),
      feature(
        'Access to the Stacks',
        'Libraries, scriptoria, and university archives will admit you as a fellow scholar. Given time, you can usually find a written answer to any question the wider world has already recorded.',
      ),
    ],
    choices: [languageChoice(2)],
  },
  {
    id: 'travelling-performer',
    name: 'Travelling Performer',
    icon: '🎭',
    summary: 'You made your living on temporary stages and the goodwill of strangers.',
    description:
      'Fairs, taprooms, and market squares — you know how to read a crowd and how to leave a town quickly if you read one wrong.',
    effects: [
      skill('performance'),
      skill('acrobatics'),
      item('Costume'),
      item('Common clothes'),
      item('Gold pieces', 15),
      feature(
        'By Popular Demand',
        'You can always find a place to perform in exchange for free lodging and food of a modest standard. Your performances make you a minor local celebrity for as long as you stay.',
      ),
    ],
    choices: [
      {
        id: 'instrument',
        prompt: 'Your instrument or performance kit',
        source: { kind: 'proficiencies', category: 'tool', from: toolProficiencies.filter((value) => ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol', 'Disguise kit'].includes(value)) },
      },
    ],
  },
  {
    id: 'fallen-house',
    name: 'Fallen House',
    icon: '🏚️',
    summary: 'Your family had a name and a seat. Now it has neither, and you have the manners anyway.',
    description:
      'You were raised to inherit something that was taken, sold, or burned. The education stuck; the estate did not.',
    effects: [
      skill('history'),
      skill('persuasion'),
      item('Fine clothes'),
      item('Signet ring'),
      item('Scroll of pedigree'),
      item('Gold pieces', 20),
      feature(
        'Remembered Name',
        'Older nobles, retainers, and creditors still recognise your family name. This opens doors in polite society roughly as often as it closes them, and someone always knows exactly what happened to your house.',
      ),
    ],
    choices: [languageChoice(1)],
  },
  {
    id: 'wilderness-scout',
    name: 'Wilderness Scout',
    icon: '🧭',
    summary: 'You ranged ahead of settlements, mapping country nobody had names for.',
    description:
      'You are comfortable weeks from the nearest road, and you notice the things that get careless travellers killed.',
    effects: [
      skill('survival'),
      skill('stealth'),
      tool("Cartographer's tools"),
      item("Traveler's clothes"),
      item('Bedroll'),
      item('Hunting trap'),
      item('Gold pieces', 10),
      feature(
        'Read the Land',
        'You can find food and fresh water for yourself and up to five others each day in any wilderness you are not actively lost in, and you can recall the layout of terrain you have crossed even once.',
      ),
    ],
  },
  {
    id: 'gutter-thief',
    name: 'Gutter Thief',
    icon: '🪙',
    summary: 'You grew up light-fingered in a city that never fed you.',
    description:
      'You know rooftops better than streets, and you have a working relationship with at least three people the watch would like to meet.',
    effects: [
      skill('sleight-of-hand'),
      skill('deception'),
      tool("Thieves' tools"),
      item('Common clothes'),
      item('Crowbar'),
      item('Small knife'),
      item('Gold pieces', 8),
      feature(
        'Back Alleys',
        'In any city you spend a few days in, you can locate the local fence, the safest route across the rooftops, and a place to lie low. You can pass short messages through the criminal underworld without meeting anyone face to face.',
      ),
    ],
  },
]

export const backgrounds: Collection = {
  id: 'backgrounds',
  label: 'Backgrounds',
  singular: 'Background',
  entries,
}
