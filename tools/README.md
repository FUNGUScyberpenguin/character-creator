# tools

One-off scripts that build ruleset data from a source document, kept in the repo
so a transcription can be re-run and re-checked rather than trusted.

These are **not** part of the build. They read a local copy of the source
document and write a table you paste into a ruleset module. Nothing in `src/`
imports them.

## `scrape-srd-52-spells.mjs`

Turns the spell chapter of SRD 5.2 into the tuple table in
[`src/rulesets/dnd5e-2024/spells.ts`](../src/rulesets/dnd5e-2024/spells.ts).

```bash
git clone --depth 1 https://github.com/downfallx/dnd-5e-srd-markdown /tmp/srd52
node tools/scrape-srd-52-spells.mjs rows.txt      # edit SRC to point at the clone
```

It reports what it produced and what it could not account for. A clean run looks
like this:

```
spells: 339
by level: {"0":27,"1":57,"2":57,"3":42,"4":34,"5":38,"6":31,"7":20,"8":17,"9":16}
by class: {"s":140,"w":218,"k":72,"b":130,"d":124,"c":109,"r":48,"p":38}
skipped non-spell headings (10): Animated Object, Actions, Traits, ...
problems: 0
```

The skipped headings are the sub-headings of creature stat blocks embedded in a
few spells; they are listed rather than silently dropped, so the count adds up.

## `check-srd-52-spell-lists.mjs`

SRD 5.2 states each class's spell list twice — once as a table in the class
chapter, once in the parenthetical on each spell's own entry. This compares the
two statements against each other.

```bash
node tools/check-srd-52-spell-lists.mjs        # expects rows.txt in the cwd
```

Six of the eight lists agree exactly. Two do not, and the disagreement is the
document's own — it reproduces in independent transcriptions:

- *Phantasmal Force* names Bard, Sorcerer and Wizard on its own entry, but
  appears in none of those three class tables.
- *Mind Spike* names Sorcerer, Warlock and Wizard, but is absent from the
  Sorcerer table.

The ruleset follows the spell entries. See the note at the top of `spells.ts`,
and the test that pins both cases.

## Re-running against a different source

Both scripts point at a local clone of a third-party Markdown transcription,
because the official PDF is not machine-readable without extra tooling. If you
have a better source, change `SRC` — the parser only assumes the shape the
document actually has (`#### Name`, an italic level/school line, then bolded
field labels), and it reports anything it cannot parse instead of guessing.

Whatever the source, cross-check the result: the counts above and the
`src/rulesets/dnd5e-2024/ruleset.test.ts` assertions are what caught the errors
in the first hand-written pass.
