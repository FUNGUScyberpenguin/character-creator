import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Turn the SRD 5.2 spell chapter into the tuple table the ruleset uses.
 *
 * Nothing here is written from memory: every field is lifted from the document,
 * and anything the parser cannot account for is reported rather than guessed.
 */

// Point this at a local clone of a Markdown transcription of SRD 5.2.
// See tools/README.md.
const SRC = process.env.SRD52 ?? '/workspace/downfallx/dnd-5e-srd-markdown/spells.md'
const md = readFileSync(SRC, 'utf8')

const SCHOOL_LETTER = {
  Abjuration: 'A',
  Conjuration: 'C',
  Divination: 'D',
  Enchantment: 'E',
  Evocation: 'V',
  Illusion: 'I',
  Necromancy: 'N',
  Transmutation: 'T',
}

const CLASS_LETTER = {
  Bard: 'b',
  Cleric: 'c',
  Druid: 'd',
  Paladin: 'p',
  Ranger: 'r',
  Sorcerer: 's',
  Warlock: 'k',
  Wizard: 'w',
}

// Spell descriptions start at the "## Spell Descriptions" heading; everything
// before it is rules prose with headings of its own.
const start = md.indexOf('## Spell Descriptions')
if (start < 0) throw new Error('no Spell Descriptions section')
const body = md.slice(start)

const chunks = body.split(/^#### /m).slice(1)
const problems = []
const skipped = []
const rows = []

for (const chunk of chunks) {
  const lines = chunk.split('\n')
  const name = lines[0].trim()

  // _Level 2 Evocation (Wizard)_  or  _Evocation Cantrip (Sorcerer, Wizard)_
  const header = chunk.match(/^_(?:Level (\d) (\w+)|(\w+) Cantrip) \(([^)]*)\)_/m)
  if (!header) {
    // Several spells embed a creature stat block whose sub-headings are also
    // `####`. They are not spells, and the absence of a level line is how we
    // tell. Recorded so the count is auditable rather than silently short.
    skipped.push(name)
    continue
  }
  const level = header[1] ? Number(header[1]) : 0
  const schoolName = header[2] ?? header[3]
  const school = SCHOOL_LETTER[schoolName]
  if (!school) {
    problems.push(`${name}: unknown school "${schoolName}"`)
    continue
  }

  // The parenthesised list can carry extra notes, e.g. "Wizard, Warlock".
  const classNames = header[4].split(',').map((s) => s.trim()).filter(Boolean)
  const letters = []
  for (const className of classNames) {
    const letter = CLASS_LETTER[className]
    if (letter) letters.push(letter)
    else problems.push(`${name}: unknown class "${className}"`)
  }

  // The document is inconsistent about "Components:" versus "Component:", so
  // each label is given the alternatives it actually appears under.
  const field = (...labels) => {
    for (const label of labels) {
      const match = chunk.match(new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, 'm'))
      if (match) return match[1].trim()
    }
    problems.push(`${name}: no ${labels[0]}`)
    return ''
  }

  const time = field('Casting Time')
  const range = field('Range')
  const components = field('Components', 'Component')
  const duration = field('Duration')

  // Everything after the Duration line is the effect. Take the prose, drop the
  // tables (a handful of spells embed one), and keep the higher-level rider,
  // which is the part players actually look up mid-game.
  const afterDuration = chunk.slice(chunk.indexOf('**Duration:**'))
  const prose = afterDuration
    .split('\n')
    .slice(1)
    .join('\n')
    .replace(/<table>[\s\S]*?<\/table>/g, ' [see the SRD for this spell’s table] ')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const effect = prose.find((p) => !p.startsWith('_')) ?? prose[0] ?? ''
  const upgrade = prose.find((p) => /^_(Using a Higher-Level Spell Slot|Cantrip Upgrade)/.test(p))

  // The rider reads as a separate clause, so it keeps a visible boundary
  // rather than running straight on from the effect.
  const clean = (s) => s.replace(/\*\*/g, '').replace(/_/g, '').trim()
  const text = [clean(effect), upgrade ? clean(upgrade).replace(/^([^.]+)\./, '$1:') : '']
    .filter(Boolean)
    .join(' — ')

  if (!text) problems.push(`${name}: empty description`)

  rows.push({ name, level, school, letters: letters.join(''), time, range, components, duration, text })
}

rows.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

let out = ''
let lastLevel = -1
for (const r of rows) {
  if (r.level !== lastLevel) {
    lastLevel = r.level
    const label = r.level === 0 ? 'cantrips' : `level ${r.level}`
    out += `\n  // ${'-'.repeat(Math.max(2, 66 - label.length))} ${label}\n`
  }
  out += `  [${q(r.name)}, ${r.level}, ${q(r.school)}, ${q(r.letters)}, ${q(r.time)}, ${q(r.range)}, ${q(r.components)}, ${q(r.duration)}, ${q(r.text)}],\n`
}

writeFileSync(process.argv[2] ?? '/dev/stdout', out)

console.error(`spells: ${rows.length}`)
const byLevel = {}
for (const r of rows) byLevel[r.level] = (byLevel[r.level] ?? 0) + 1
console.error('by level:', JSON.stringify(byLevel))
const byClass = {}
for (const r of rows) for (const l of r.letters) byClass[l] = (byClass[l] ?? 0) + 1
console.error('by class:', JSON.stringify(byClass))
console.error(`skipped non-spell headings (${skipped.length}): ${skipped.join(', ')}`)
console.error(`problems: ${problems.length}`)
for (const p of problems.slice(0, 40)) console.error('  -', p)
