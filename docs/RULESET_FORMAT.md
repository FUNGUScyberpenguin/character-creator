# The ruleset format

Everything the wizard shows — the steps, the cards on each step, the numbers on
the sheet — comes from a single `Ruleset` object. The engine does not know what
game it is running. This document is the map.

The authoritative types live in
[`src/engine/types.ts`](../src/engine/types.ts); the reference implementation is
[`src/rulesets/dnd5e/`](../src/rulesets/dnd5e/).

## The shape of a ruleset

```ts
export const mySystem: Ruleset = {
  id: 'my-system',
  name: 'My System',
  version: '1.0.0',
  summary: 'One paragraph shown when the ruleset is offered.',
  license: { name: 'CC BY 4.0', notice: 'Attribution reproduced in-app and on the PDF.' },

  maxLevel: 20,
  proficiencyBonus: '2 + floor((level - 1) / 4)',

  abilities: [...],              // what the six (or three, or eight) stats are
  skills: [...],                 // and which ability each keys off
  proficiencyCategories: [...],  // "Tools", "Languages", "Lores" — your call
  abilityMethods: [...],         // how scores get generated

  collections: [...],            // all your content: classes, spells, gear
  steps: [...],                  // the wizard, in order
  derived: [...],                // the numbers on the sheet
}
```

## Content lives in collections

A collection is a named list of entries. Classes, ancestries, spells, and
equipment are all just collections — the engine treats them identically.

```ts
const classes: Collection = {
  id: 'classes',
  label: 'Classes',        // plural, for headings
  singular: 'Class',       // for prompts
  entries: [ /* Entry[] */ ],
}
```

An entry is one card:

```ts
{
  id: 'fighter',
  name: 'Fighter',
  icon: '⚔️',                                  // emoji anchor on the card
  summary: 'The definitive weapon master.',    // one line, always visible
  description: 'Longer prose behind a "More" toggle.',
  meta: { 'Hit Die': 'd10' },                  // small chips on the card
  tags: ['martial'],                           // used to filter choices
  effects: [ /* applied as soon as it is picked */ ],
  choices: [ /* questions it opens up */ ],
  levels: [ /* things gained later */ ],
}
```

## Effects are the only way to change a character

Nothing mutates a character except an effect. The full set:

| Effect | What it does |
|---|---|
| `{ type: 'ability', ability, amount }` | Raise (or lower) an ability score |
| `{ type: 'proficiency', category, value, expertise? }` | Add a proficiency |
| `{ type: 'set', stat, value }` | Write a value into the stat bag |
| `{ type: 'bonus', stat, amount }` | Add to a numeric stat |
| `{ type: 'feature', name, description, uses? }` | A described feature on the sheet |
| `{ type: 'resource', name, formula }` | A tracked pool (ki, rages, sorcery points) |
| `{ type: 'spellcasting', ... }` | Marks a spellcasting source; drives the spells step |
| `{ type: 'item', item, quantity? }` | Put something in the pack |
| `{ type: 'note', text }` | A free-form line |

`set` and `bonus` write into the **stat bag**, a loose key/value store that
derived formulas can read back as `stat.<key>`. That is how a class communicates
its hit die to the hit points formula without either one hard-coding the other.

Effects are applied in a fixed order — ability scores, then `set`, then `bonus`,
then everything that reads them — so no formula ever sees a half-built character.

## Choices are questions for the player

A choice renders as a block of selectable options with a progress counter.

```ts
{
  id: 'fighting-style',
  prompt: 'Fighting Style',
  count: 1,                  // how many to pick (default 1)
  allowDuplicates: false,    // true for "+1 to the same ability twice"
  minLevel: 4,               // hide it until the character is high enough
  descriptor: true,          // the selection helps *name* the character
  source: { /* where the options come from */ },
}
```

The source decides what the options are:

| Source | Options |
|---|---|
| `{ kind: 'skills', from? }` | Skills, granting skill proficiency |
| `{ kind: 'abilities', amount, from? }` | Abilities, granting `+amount` each |
| `{ kind: 'proficiencies', category, from }` | A fixed list, granting that proficiency |
| `{ kind: 'collection', collection, tag? }` | Entries of a collection, optionally tag-filtered |
| `{ kind: 'options', options }` | A hand-written list, each with its own effects |

Options can carry their own `choices`, and the engine recurses. Picking a class
that grants a subclass, which grants its own choice at 10th level, resolves
without any special-casing. Subraces work the same way: the race declares a
choice against a `subraces` collection filtered by tag, and the subrace's own
traits live on its entry.

Marking a choice `descriptor: true` puts the selection in the line under the
character's name. Where the selection already contains the name of the pick it
refines — "Ironvein Dwarf" against a "Dwarf" — it replaces it rather than
repeating it.

### Selection keys

Each choice gets a stable key from its position in the tree, so two subclasses
with a same-named choice never collide:

```
step:class#fighter/choice:subclass/opt:champion/choice:second-style
```

Because the key encodes the whole path, deselecting something upstream
automatically orphans everything below it.

## Levels

Anything gained later goes in `levels`. Grants at or below the character's level
are folded into the entry's own effects and choices, in level order.

```ts
levels: [
  { level: 3, effects: [feature('Improved Critical', '...')] },
  { level: 4, choices: [{ id: 'asi-4', prompt: 'Ability Score Improvement', ... }] },
]
```

Because the highest applicable `set` wins, per-level tables are just repeated
`set` effects. That is how spells-known tables work without a lookup mechanism:

```ts
// set `spellsKnown` at each level where it changes, then reference it
{ type: 'spellcasting', spellsKnown: 'stat.spellsKnown', ... }
```

## Steps

`steps` is the wizard, in order. Every step kind has a matching component.

| Kind | What it shows |
|---|---|
| `intro` | Prose and the name fields |
| `level` | A level picker |
| `pick` | Cards from `collection`, plus any choices they open |
| `abilities` | The generation method and its assignment UI |
| `choices` | Everything still unresolved from anywhere |
| `equipment` | Granted gear plus a browsable shop |
| `spells` | Per spellcasting source, filtered by slot level |
| `identity` | Free-text fields you declare |
| `review` | The sheet preview and the export buttons |

Steps never block navigation. Validation reports what is outstanding; the player
decides when to deal with it.

## Derived statistics

```ts
{ id: 'ac', label: 'Armor Class', slot: 'primary', formula: '10 + dex.mod + stat.acBonus' }
```

`slot` places the value: `primary` becomes a big tile, `secondary` a list row.
Set `signed: true` for values that should read `+3` rather than `3`.

`format` controls how the value is written. `{value}` is the formatted number
and any other `{name}` is read from the formula context, so hit dice declare
`format: '{value}d{stat.hitDie}'` and print `5d10`.

### What formulas can see

| Name | Value |
|---|---|
| `level` | Character level |
| `prof` | Proficiency bonus |
| `<ability>` | Final ability score, e.g. `dex` |
| `<ability>.mod` | Ability modifier, e.g. `dex.mod` |
| `stat.<key>` | Anything written by `set` or `bonus` |
| `skill.<id>` | A skill's total modifier |
| `save.<ability>` | A saving throw's total modifier |
| `<derived id>` | Any derived stat declared before this one |

Operators: `+ - * / %`, comparisons `== != < <= > >=` (yielding 1 or 0), and
parentheses. Functions: `mod`, `floor`, `ceil`, `round`, `abs`, `min`, `max`, and
`if(condition, whenTrue, whenFalse)`.

Unknown names evaluate to `0` rather than throwing, so a formula can reference a
stat only some characters have:

```ts
formula: 'if(stat.unarmoredDefense, 10 + dex.mod + con.mod, 10 + dex.mod)'
```

Division by zero yields `0`. There is no member access, no function calls beyond
the table above, and no `eval` — a malicious ruleset can produce a wrong number
and nothing worse.

## Spellcasting

A `spellcasting` effect turns on the spells step:

```ts
{
  type: 'spellcasting',
  id: 'wizard',                    // key under which chosen spells are stored
  label: 'Wizard Spellcasting',
  ability: 'int',
  preparation: 'prepared',         // or 'known'
  list: 'wizard',                  // a tag spells carry
  slots: 'full',                   // key into ruleset.spellSlotTables
  cantripsKnown: 'stat.cantripsKnown',
  spellsKnown: 'max(1, int.mod + level)',
}
```

Spells are ordinary entries whose `meta.level` is a number and whose `tags`
include every class list they appear on. Slot tables are arrays indexed by
character level, each row indexed by spell level:

```ts
spellSlotTables: {
  full: [[2], [3], [4, 2], /* ... one row per level ... */],
}
```

`spellcastingFormulas` computes per-source numbers with `castingMod` in scope:

```ts
spellcastingFormulas: { saveDC: '8 + prof + castingMod', attackBonus: 'prof + castingMod' }
```

## Registering it

```ts
// src/rulesets/index.ts
import { mySystem } from './my-system'

export const rulesets: Ruleset[] = [dnd5e, mySystem]
```

Nothing else needs to change. The wizard, the live summary, and the PDF exporter
all read from the ruleset.

## Checklist for a new ruleset

- [ ] Ids are unique within each collection
- [ ] Every `step.collection` names a collection that exists
- [ ] Every choice's `collection` and `category` resolve
- [ ] Derived formulas evaluate for a character with nothing picked
- [ ] `baseStats` provides a default for every `stat.` a formula reads
- [ ] The licence notice is accurate — it is reproduced on every exported sheet

The tests in [`src/engine/engine.test.ts`](../src/engine/engine.test.ts) check
most of this for the bundled ruleset; point them at yours and they will do the
same.
