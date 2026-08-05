# Contributing

Thanks for wanting to help. This project exists so that nobody has to make their
first character with a wiki open in seven tabs, and there is plenty left to do.

## Getting set up

```bash
npm install
npm run dev      # development server
npm test         # tests
npm run build    # type-check and build
```

Node 20 or newer. There is no backend, no database, and no environment to
configure — clone it and it runs.

## Where things live

```
src/engine/       Rules-agnostic core. Should never mention a specific game.
src/rulesets/     Game data. Should never contain rendering or UI logic.
src/components/   React UI. Renders whatever a ruleset declares.
src/pdf/          The PDF exporter.
src/state/        The store: character state, persistence, navigation.
```

The one rule worth enforcing: **the engine does not know what game it is
running.** If you find yourself adding `if (ruleset.id === 'dnd5e-srd')` to
anything under `src/engine/`, the ruleset format is missing something — open an
issue and let's add it properly.

## The kinds of contribution that help most

**Fixing rules bugs.** A wrong number is the worst thing this app can do. If a
value is wrong, a test that reproduces it is worth more than the fix.

**Filling in content.** Homebrew subclasses, missing SRD detail, more
backgrounds. See [docs/RULESET_FORMAT.md](docs/RULESET_FORMAT.md).

**New rulesets.** Pathfinder 2e, Call of Cthulhu, OSR retroclones — anything with
a redistributable licence. A new ruleset is one data module plus a line in
`src/rulesets/index.ts`.

**Accessibility.** Keyboard navigation, screen reader labels, colour contrast.
Report anything that fails you.

## Licensing of game content

This matters more than usual here. Only contribute game content you have the
right to publish under a permissive licence:

- **SRD 5.1 / 5.2 material** is CC BY 4.0 and fine to include, with attribution.
- **ORC-licensed material** is fine, with the required notice.
- **Anything else from a published book is not.** Class features, spell text and
  background descriptions from a Player's Handbook cannot go in this repository,
  even paraphrased closely.
- **Your own homebrew** is welcome under the repository's MIT licence.

If a ruleset needs an attribution notice, put it in `ruleset.license.notice` —
it is shown in the app and printed on every exported sheet.

## Code style

Match what is already there. A few things the codebase does consistently:

- Comments explain *why*, not *what*. If a line needs a comment to say what it
  does, rename something instead.
- TypeScript is strict, including `noUncheckedIndexedAccess`. Handle the
  `undefined`; do not reach for `!` unless you can see why it is safe.
- No `eval`, no `new Function`, no dynamic code from ruleset data. Formulas go
  through `src/engine/expression.ts`.
- New dependencies need a reason. The app is deliberately small.

## Tests

`npm test` must pass. Add tests for:

- any rules calculation you add or change
- any bug you fix, reproducing it first
- new ruleset content, at least to the extent that it resolves at levels 1 and 20

The existing suite in `src/engine/engine.test.ts` includes integrity checks that
walk every class through the full level range — new content gets that coverage
for free.

## Pull requests

Keep them focused. A PR that adds a ruleset and refactors the store is two PRs.
Describe what changed and how you checked it. Screenshots help for UI work; for
rules changes, the numbers before and after help more.
