import { readFileSync } from 'node:fs'

/**
 * SRD 5.2 states each class's spell list twice: once as a table in the class
 * chapter, and once in the parenthetical on every spell's own entry. This
 * compares the two. Any disagreement is either a parser bug or a document
 * inconsistency — both worth knowing before shipping.
 */
const classesMd = readFileSync(process.env.SRD52_CLASSES ?? '/workspace/downfallx/dnd-5e-srd-markdown/classes.md', 'utf8')
const rows = readFileSync('rows.txt', 'utf8')

const LETTER = { Bard: 'b', Cleric: 'c', Druid: 'd', Paladin: 'p', Ranger: 'r', Sorcerer: 's', Warlock: 'k', Wizard: 'w' }

// What the spell entries claim.
const fromSpells = {}
for (const line of rows.split('\n')) {
  const m = line.match(/^\s*\['((?:[^']|\\')+)', (\d), '\w', '(\w*)'/)
  if (!m) continue
  const name = m[1].replace(/\\'/g, "'")
  for (const l of m[3]) (fromSpells[l] ??= new Set()).add(name)
}

// What the class chapter's tables claim.
const fromTables = {}
for (const [className, letter] of Object.entries(LETTER)) {
  const i = classesMd.indexOf(`### ${className} Spell List`)
  if (i < 0) { console.log(`${className}: no spell list section`); continue }
  const end = classesMd.indexOf('\n### ', i + 5)
  const section = classesMd.slice(i, end < 0 ? undefined : end)
  const set = new Set()
  // First cell of every body row is the spell name.
  for (const row of section.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    if (cells.length >= 2 && cells[0]) set.add(cells[0])
  }
  fromTables[letter] = set
}

let disagreements = 0
for (const [className, letter] of Object.entries(LETTER)) {
  const a = fromSpells[letter] ?? new Set()
  const b = fromTables[letter] ?? new Set()
  const onlySpells = [...a].filter((n) => !b.has(n))
  const onlyTable = [...b].filter((n) => !a.has(n))
  const flag = onlySpells.length || onlyTable.length ? 'MISMATCH' : 'ok'
  console.log(`${className.padEnd(9)} entries=${String(a.size).padStart(3)} table=${String(b.size).padStart(3)}  ${flag}`)
  if (onlySpells.length) { console.log(`   only in spell entries: ${onlySpells.join(', ')}`); disagreements += onlySpells.length }
  if (onlyTable.length) { console.log(`   only in class table:   ${onlyTable.join(', ')}`); disagreements += onlyTable.length }
}
console.log(disagreements ? `\n${disagreements} disagreement(s)` : '\nthe two statements agree exactly')
