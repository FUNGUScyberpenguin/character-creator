# Character Creator

A free, open-source character builder for tabletop RPGs. Walk through every
decision a new character asks of you — one screen at a time, with each choice
explained — then download a printable PDF character sheet.

Built for the two people at the table who need it most: the player making their
first character, and the DM helping five of them do it at once.

- **No account, no server.** Everything runs in your browser. Your character is
  saved to local storage and never leaves your machine.
- **Nothing is locked in.** Jump between steps freely; change your class at
  level 12 and every dependent choice re-resolves.
- **Real output.** A printable PDF sheet — including an "on your turn" section
  with your attacks and action economy — plus a JSON file you can reload later.
  Ink-friendly and ruled-for-notes versions are a checkbox.
- **Built from what players actually complain about.** Guided class picking for
  choice paralysis, backstory prompts instead of blank boxes, and an escape
  hatch for anything the rules-as-data cannot express.
- **Accessible by choice.** Text scaling, a high-legibility typeface, and a
  high-contrast mode, all remembered between sessions.
- **You pick the game first.** Everything after that — the steps, the options
  within them, the numbers on the sheet — comes from the rules of the system you
  chose. Work is kept per system, so trying another game never loses a
  half-built character.

## Try it

```bash
git clone https://github.com/FUNGUScyberpenguin/character-creator.git
cd character-creator
npm install
npm run dev
```

Then open the URL Vite prints. `npm run build` produces a static `dist/` you can
host anywhere — GitHub Pages, Netlify, an S3 bucket, a USB stick.

## What ships today

Two editions of D&D and one original system. The app opens by asking which one
you are playing, and every screen after that comes from the answer.

### D&D 5e (2024 rules, SRD 5.2)

The current edition, and the default. Character creation differs from 2014 in
ways that are structural rather than cosmetic, so it is a separate ruleset
rather than a patch:

| | 2014 (SRD 5.1) | 2024 (SRD 5.2) |
|---|---|---|
| Ability increases | Your race grants them | Your **background** grants them, along with an origin feat |
| Subclass | 1st, 2nd or 3rd level, by class | 3rd level, for everyone |
| Weapon mastery | — | Barbarian, fighter, paladin, ranger and rogue nominate weapons |
| 19th level | A fifth ability score improvement | An **Epic Boon** |
| Spell preparation | Bards, rangers, sorcerers and warlocks knew a fixed list | Everyone prepares |
| Paladins and rangers | Cast from 2nd level | Cast from 1st |

Nine species (with elf, gnome, goliath and tiefling lineages), four backgrounds,
four Origin feats, all twelve classes to 20th level with their SRD subclass,
seven Epic Boons, and the full 339-spell SRD 5.2 spell list.

Those counts are the SRD's, not the Player's Handbook's. SRD 5.2 publishes four
backgrounds where the PHB has sixteen, and four Origin feats where the PHB has
many more. Content outside the SRD is not reproduced here, so if your table uses
a PHB background you will need to add it yourself — one entry in a data file,
and the wizard picks it up.

### D&D 5e (SRD 5.1)

The 2014 rules, still in play at a great many tables:

| | |
|---|---|
| Classes | All 12, with features for levels 1–20 and their SRD subclass |
| Races | All 9, with subraces (SRD, plus clearly-marked homebrew) |
| Backgrounds | Acolyte (SRD) plus 8 original backgrounds, MIT-licensed |
| Spells | The full SRD list, levels 0–9, filtered by class and slot level |
| Equipment | SRD weapons, armour, packs and adventuring gear |
| Ability scores | Standard array, point buy, 4d6-drop-lowest, or manual entry |

Hit points, armour class, saves, skills, spell slots, save DCs and prepared-spell
counts are all computed from your choices as you make them — including armour,
which only counts once you tick it as worn. The two editions share the six
abilities, the eighteen skills and most equipment prices, because on those they
genuinely agree — and nothing else. The spell lists in particular are separate
transcriptions: 2024 adds spells, drops others, moves some between schools, and
renames the ones that used to carry a wizard's name.

### Embers

A compact original system, MIT-licensed, written for this project and labelled
in the picker as the example it is. Nobody is running a campaign in it — it
exists to prove the engine is not a D&D app in disguise, and it is deliberately
unlike D&D at every level the engine exposes:

| | D&D 5e | Embers |
|---|---|---|
| Abilities | 6, converted to a modifier | 4, *used as* the modifier |
| Levels | 1–20 | 1–10 |
| Magic | Spell slots by level | Strain spent from a pool |
| Armour | Replaces your unarmoured AC | Adds to your Defence |
| Actions | Action / bonus / reaction | Main / swift / reaction |

Four kin, four callings with paths, six origins, talents, gear and eighteen
workings. Complete and playable, and the obvious thing to copy when writing a
system of your own.

## How it works

Three layers, each one replaceable without touching the others:

```
src/engine/     Ruleset-agnostic. Knows about "picks", "effects" and "choices".
                Knows nothing about D&D.
src/rulesets/   Pure data. Declares abilities, steps, content and formulas.
src/components/ React UI that renders whatever the ruleset declares.
src/pdf/        Draws a sheet from the derived character, for any ruleset.
```

The engine's job is to walk from *what the player picked* to *what the sheet
says*:

1. **Resolve** — follow every pick into its effects, recursing through the
   choices those picks open up (a class → its subclass → that subclass's own
   choices).
2. **Derive** — apply effects in a fixed order, then evaluate the ruleset's
   formulas against the result.
3. **Validate** — report what each step still needs, so the UI can show progress
   without blocking anyone.

Only the player's decisions are ever saved. Every number is recomputed from the
ruleset on load, so fixing a rules bug also fixes every character already saved.

### Formulas are data, not code

Rulesets declare derived statistics as strings:

```ts
{ id: 'hp', label: 'Hit Points',
  formula: 'stat.hitDie + con.mod + (level - 1) * (floor(stat.hitDie / 2) + 1 + con.mod)' }
```

These run through a small purpose-built parser in
[`src/engine/expression.ts`](src/engine/expression.ts) — arithmetic, comparisons,
and a fixed function table (`mod`, `floor`, `ceil`, `min`, `max`, `if`). There is
no `eval` anywhere, so ruleset data stays data even if it came from somewhere you
do not control.

## Adding content or a new system

Everything the wizard shows comes from a `Ruleset` object. Adding a homebrew
subclass is a few lines in a data file; adding a whole new game means writing one
new module and registering it in `src/rulesets/index.ts`.

See **[docs/RULESET_FORMAT.md](docs/RULESET_FORMAT.md)** for the full format, and
[CONTRIBUTING.md](CONTRIBUTING.md) for how to get set up.

## Deploying

Pushing to `main` builds the site and publishes it to GitHub Pages. The workflow
enables Pages itself on its first successful run, so there is nothing to click —
provided the repository is public (Pages on a private repository needs a paid
plan).

The build sets `BASE_PATH` to `/<repo>/` because Pages serves projects from a
subpath. Hosting at a domain root instead? Build without it:

```bash
npm run build          # base "/", for a domain root or local preview
BASE_PATH=/my-repo/ npm run build   # for GitHub Pages
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type-check without building |

## Licence

MIT — see [LICENSE](LICENSE).

The 5e rulesets include material from the System Reference Document 5.1 and the
System Reference Document 5.2 by Wizards of the Coast LLC, used under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode). Each
ruleset carries its own attribution notice, which is reproduced in the app and
printed on every exported sheet. This project is not affiliated with or endorsed
by Wizards of the Coast.

Embers is original to this project and released under the MIT Licence.
