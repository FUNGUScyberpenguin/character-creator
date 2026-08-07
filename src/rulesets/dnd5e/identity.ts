import type { IdentityField } from '../../engine/types'

/**
 * The "who are they?" prompts.
 *
 * Shared by both D&D rulesets: the questions that make a character feel like a
 * person are the same whichever edition's numbers sit above them, and keeping
 * one copy means an improvement to the wording reaches both.
 */
export const identityFields: IdentityField[] = [
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
]
