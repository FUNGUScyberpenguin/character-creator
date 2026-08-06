import type { Color, PDFDocument, PDFFont, PDFPage } from 'pdf-lib'

import type { DerivedCharacter } from '../engine/derive'
import { describeCharacter } from '../engine/derive'
import type { Ruleset } from '../engine/types'
import { spellLevelLabel } from '../rulesets/dnd5e/spells'

/**
 * Draws a printable character sheet from scratch with pdf-lib.
 *
 * The sheet is our own layout rather than a filled-in copy of a publisher's
 * form, which keeps the whole project redistributable and means the exporter
 * works for any ruleset: everything below reads from the derived character and
 * the ruleset's own labels.
 */

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 36

// Built by hand rather than with pdf-lib's `rgb()` so that the ~500 kB library
// stays out of the initial bundle: it is imported dynamically on first export.
const rgb = (red: number, green: number, blue: number): Color => ({ type: 'RGB', red, green, blue }) as Color

/** Screen palette. `monochrome` swaps in the ink-saving equivalents. */
const COLOUR = {
  ink: rgb(0.11, 0.1, 0.12),
  muted: rgb(0.42, 0.4, 0.45),
  rule: rgb(0.75, 0.73, 0.78),
  panel: rgb(0.96, 0.955, 0.97),
  accent: rgb(0.42, 0.24, 0.55),
}

/**
 * Printing is the point for a lot of tables, and not everyone has a colour
 * printer — nor wants to spend the ink if they do. This drops every fill and
 * every accent to black on white.
 */
const MONO = {
  ink: rgb(0, 0, 0),
  muted: rgb(0.35, 0.35, 0.35),
  rule: rgb(0.6, 0.6, 0.6),
  panel: rgb(1, 1, 1),
  accent: rgb(0, 0, 0),
}

export interface SheetOptions {
  /** Black on white, with no filled panels. */
  monochrome?: boolean
  /** Adds ruled space for hit points, conditions, and session notes. */
  noteSpace?: boolean
}

let INK = COLOUR.ink
let MUTED = COLOUR.muted
let RULE = COLOUR.rule
let PANEL = COLOUR.panel
let ACCENT = COLOUR.accent

function usePalette(monochrome: boolean): void {
  const palette = monochrome ? MONO : COLOUR
  INK = palette.ink
  MUTED = palette.muted
  RULE = palette.rule
  PANEL = palette.panel
  ACCENT = palette.accent
}

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
}

/**
 * pdf-lib's standard fonts are WinAnsi-encoded, which cannot represent emoji or
 * anything outside Latin-1. Content is written for the screen first, so we fold
 * the common typographic characters back to ASCII and drop the rest.
 */
function safe(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return ''
  return String(input)
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[·•]/g, '-')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7EÀ-ÿ]/g, '')
    .trim()
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

/** Split text to fit `width`, returning at most `maxLines` lines. */
function wrap(text: string, font: PDFFont, size: number, width: number, maxLines = Number.MAX_SAFE_INTEGER): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)

  if (lines.length === maxLines && words.length) {
    // Signal truncation rather than silently dropping the tail.
    const last = lines[maxLines - 1]!
    const joined = lines.join(' ')
    if (safe(text).length > joined.length) {
      lines[maxLines - 1] = `${last.replace(/[,;:]$/, '')}...`
    }
  }
  return lines
}

class Sheet {
  page: PDFPage
  readonly doc: PDFDocument
  readonly fonts: Fonts

  constructor(doc: PDFDocument, fonts: Fonts) {
    this.doc = doc
    this.fonts = fonts
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  }

  newPage(): void {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  }

  text(value: string, x: number, y: number, options: { size?: number; font?: PDFFont; color?: Color } = {}): void {
    const content = safe(value)
    if (!content) return
    this.page.drawText(content, {
      x,
      y,
      size: options.size ?? 9,
      font: options.font ?? this.fonts.regular,
      color: options.color ?? INK,
    })
  }

  centered(value: string, centerX: number, y: number, options: { size?: number; font?: PDFFont; color?: Color } = {}): void {
    const content = safe(value)
    if (!content) return
    const font = options.font ?? this.fonts.regular
    const size = options.size ?? 9
    this.text(content, centerX - font.widthOfTextAtSize(content, size) / 2, y, options)
  }

  panel(x: number, y: number, width: number, height: number): void {
    this.page.drawRectangle({ x, y, width, height, color: PANEL, borderColor: RULE, borderWidth: 0.75 })
  }

  /** Ruled lines for writing on — hit points, conditions, whatever comes up. */
  ruledSpace(label: string, x: number, y: number, width: number, lines: number): number {
    let cursor = this.heading(label, x, y, width)
    for (let i = 0; i < lines; i += 1) {
      this.rule(x, cursor, width)
      cursor -= 16
    }
    return cursor
  }

  rule(x: number, y: number, width: number): void {
    this.page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.6, color: RULE })
  }

  /** A small-caps style section heading with a rule beneath it. */
  heading(label: string, x: number, y: number, width: number): number {
    this.text(label.toUpperCase(), x, y, { size: 8, font: this.fonts.bold, color: ACCENT })
    this.rule(x, y - 4, width)
    return y - 14
  }
}

function drawHeader(sheet: Sheet, ruleset: Ruleset, derived: DerivedCharacter): number {
  const { state } = derived
  const top = PAGE_HEIGHT - MARGIN
  const width = PAGE_WIDTH - MARGIN * 2

  sheet.page.drawRectangle({ x: MARGIN, y: top - 52, width, height: 52, color: PANEL, borderColor: RULE, borderWidth: 0.75 })

  sheet.text(state.name || 'Unnamed character', MARGIN + 12, top - 24, { size: 18, font: sheet.fonts.bold })

  const parts = describeCharacter(derived)
  const subtitle = [...(parts.length ? parts : [`Level ${derived.level}`]), state.identity['alignment']]
    .filter(Boolean)
    .join('  |  ')

  sheet.text(subtitle, MARGIN + 12, top - 40, { size: 9.5, color: MUTED })

  const rightX = PAGE_WIDTH - MARGIN - 12
  const playerLine = state.playerName ? `Player: ${state.playerName}` : ''
  if (playerLine) {
    const w = sheet.fonts.regular.widthOfTextAtSize(safe(playerLine), 9)
    sheet.text(playerLine, rightX - w, top - 24, { size: 9, color: MUTED })
  }
  const rulesetLine = ruleset.name
  const rw = sheet.fonts.regular.widthOfTextAtSize(safe(rulesetLine), 8)
  sheet.text(rulesetLine, rightX - rw, top - 40, { size: 8, color: MUTED })

  return top - 66
}

function drawAbilities(sheet: Sheet, ruleset: Ruleset, derived: DerivedCharacter, x: number, y: number, width: number): number {
  let cursor = sheet.heading('Ability Scores', x, y, width)

  // Three lines share each box — abbreviation, modifier, raw score — so the
  // baselines are spaced by hand to keep the 17pt modifier clear of both.
  const boxHeight = 42
  for (const ability of ruleset.abilities) {
    const score = derived.abilityScores[ability.id] ?? 10
    const modifier = derived.abilityModifiers[ability.id] ?? 0

    sheet.panel(x, cursor - boxHeight + 10, width, boxHeight)
    sheet.centered(ability.abbr, x + width / 2, cursor - 1, { size: 8, font: sheet.fonts.bold, color: MUTED })
    sheet.centered(signed(modifier), x + width / 2, cursor - 21, { size: 17, font: sheet.fonts.bold })
    sheet.centered(String(score), x + width / 2, cursor - 29.5, { size: 8, color: MUTED })

    cursor -= boxHeight + 6
  }

  return cursor
}

function drawSaves(sheet: Sheet, derived: DerivedCharacter, x: number, y: number, width: number): number {
  let cursor = sheet.heading('Saving Throws', x, y, width)

  for (const save of derived.saves) {
    sheet.text(save.proficient ? '[x]' : '[ ]', x, cursor, { size: 8, font: sheet.fonts.bold })
    sheet.text(save.abbr, x + 18, cursor, { size: 8.5 })
    const value = signed(save.modifier)
    const w = sheet.fonts.bold.widthOfTextAtSize(value, 9)
    sheet.text(value, x + width - w, cursor, { size: 9, font: sheet.fonts.bold })
    cursor -= 12
  }

  return cursor - 6
}

function drawSkills(sheet: Sheet, derived: DerivedCharacter, x: number, y: number, width: number): number {
  let cursor = sheet.heading('Skills', x, y, width)

  for (const skill of derived.skills) {
    const marker = skill.expertise ? '[E]' : skill.proficient ? '[x]' : '[ ]'
    sheet.text(marker, x, cursor, { size: 8, font: sheet.fonts.bold })
    sheet.text(`${skill.name}`, x + 18, cursor, { size: 8.5 })
    sheet.text(`(${skill.abilityAbbr})`, x + 18 + sheet.fonts.regular.widthOfTextAtSize(safe(skill.name), 8.5) + 3, cursor, {
      size: 6.5,
      color: MUTED,
    })
    const value = signed(skill.modifier)
    const w = sheet.fonts.bold.widthOfTextAtSize(value, 9)
    sheet.text(value, x + width - w, cursor, { size: 9, font: sheet.fonts.bold })
    cursor -= 11.5
  }

  return cursor - 6
}

function drawCombatTiles(sheet: Sheet, derived: DerivedCharacter, x: number, y: number, width: number): number {
  const primary = derived.derived.filter((stat) => stat.slot === 'primary')
  if (!primary.length) return y

  let cursor = sheet.heading('Combat', x, y, width)

  const gap = 6
  const tileWidth = (width - gap) / 2
  const tileHeight = 38

  primary.forEach((stat, index) => {
    const column = index % 2
    const tileX = x + column * (tileWidth + gap)
    if (column === 0 && index > 0) cursor -= tileHeight + gap

    sheet.panel(tileX, cursor - tileHeight + 10, tileWidth, tileHeight)
    sheet.centered(stat.label.toUpperCase(), tileX + tileWidth / 2, cursor - 2, { size: 6.5, font: sheet.fonts.bold, color: MUTED })
    sheet.centered(stat.display, tileX + tileWidth / 2, cursor - 22, { size: 16, font: sheet.fonts.bold })
  })

  cursor -= tileHeight + gap

  // Say what the Armor Class is made of, so the number can be checked.
  const { worn, shields } = derived.armor
  if (worn || shields.length) {
    const parts = [
      worn ? `${worn.name} ${worn.base}${worn.dexApplied ? ` + ${worn.dexApplied} DEX` : ''}` : '',
      ...shields.map((shield) => `${shield.name} +${shield.bonus}`),
    ].filter(Boolean)
    for (const line of wrap(`AC from ${parts.join(', ')}`, sheet.fonts.regular, 7, width, 2)) {
      sheet.text(line, x, cursor, { size: 7, color: MUTED })
      cursor -= 9
    }
    cursor -= 3
  }

  const secondary = derived.derived.filter((stat) => stat.slot === 'secondary')
  for (const stat of secondary) {
    sheet.text(stat.label, x, cursor, { size: 8.5, color: MUTED })
    const value = stat.display
    const w = sheet.fonts.bold.widthOfTextAtSize(safe(value), 8.5)
    sheet.text(value, x + width - w, cursor, { size: 8.5, font: sheet.fonts.bold })
    cursor -= 11.5
  }

  return cursor - 4
}

function drawProficiencies(sheet: Sheet, ruleset: Ruleset, derived: DerivedCharacter, x: number, y: number, width: number): number {
  let cursor = y

  for (const category of ruleset.proficiencyCategories) {
    // Skills and saves already have their own sections on the sheet.
    if (category.usesAbilityModifier) continue
    const held = derived.proficiencies[category.id] ?? []
    if (!held.length) continue

    cursor = sheet.heading(category.label, x, cursor, width)
    const list = held.map((item) => item.value).join(', ')
    for (const line of wrap(list, sheet.fonts.regular, 8, width, 6)) {
      sheet.text(line, x, cursor, { size: 8 })
      cursor -= 10
    }
    cursor -= 6
  }

  return cursor
}

function drawInventory(sheet: Sheet, derived: DerivedCharacter, x: number, y: number, width: number): number {
  if (!derived.inventory.length) return y
  let cursor = sheet.heading('Equipment', x, y, width)

  for (const item of derived.inventory) {
    const label = item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name
    for (const [index, line] of wrap(label, sheet.fonts.regular, 8, width - 8, 2).entries()) {
      sheet.text(index === 0 ? `- ${line}` : `  ${line}`, x, cursor, { size: 8 })
      cursor -= 10
    }
    if (cursor < MARGIN + 20) break
  }

  return cursor
}

/** A flowing text block that starts a new page when it runs out of room. */
class Flow {
  private y: number

  constructor(
    private sheet: Sheet,
    private x: number,
    private width: number,
    startY: number,
  ) {
    this.y = startY
  }

  private ensure(space: number): void {
    if (this.y - space >= MARGIN) return
    this.sheet.newPage()
    this.y = PAGE_HEIGHT - MARGIN
  }

  heading(label: string): void {
    this.ensure(30)
    this.y = this.sheet.heading(label, this.x, this.y, this.width)
  }

  entry(title: string, body: string, note?: string): void {
    const lines = wrap(body, this.sheet.fonts.regular, 8.5, this.width, 8)
    this.ensure(14 + lines.length * 10)

    this.sheet.text(title, this.x, this.y, { size: 9, font: this.sheet.fonts.bold })
    if (note) {
      const titleWidth = this.sheet.fonts.bold.widthOfTextAtSize(safe(title), 9)
      this.sheet.text(`(${note})`, this.x + titleWidth + 5, this.y, { size: 7.5, color: MUTED, font: this.sheet.fonts.italic })
    }
    this.y -= 11

    for (const line of lines) {
      this.sheet.text(line, this.x, this.y, { size: 8.5 })
      this.y -= 10
    }
    this.y -= 5
  }

  line(text: string, size = 8.5): void {
    for (const line of wrap(text, this.sheet.fonts.regular, size, this.width)) {
      this.ensure(12)
      this.sheet.text(line, this.x, this.y, { size })
      this.y -= size + 2.5
    }
  }

  gap(space = 8): void {
    this.y -= space
  }

  get position(): number {
    return this.y
  }
}

/**
 * Everything that is prose rather than numbers, flowed from `startY` onwards.
 * It continues down the first page when the stat columns left room, which for
 * most characters keeps the whole sheet to two pages.
 */
function drawFeaturesAndSpells(
  sheet: Sheet,
  ruleset: Ruleset,
  derived: DerivedCharacter,
  startY: number,
  options: SheetOptions = {},
): void {
  const width = PAGE_WIDTH - MARGIN * 2

  // Below this there is not enough room for a heading and a first entry, so
  // starting a fresh page reads better than a two-line orphan.
  const MIN_USEFUL_SPACE = 140
  let top = startY - 18
  if (top - MARGIN < MIN_USEFUL_SPACE) {
    sheet.newPage()
    top = PAGE_HEIGHT - MARGIN
  }

  const flow = new Flow(sheet, MARGIN, width, top)

  if (derived.attacks.length || derived.actions.length) {
    flow.heading('On Your Turn')

    for (const attack of derived.attacks) {
      const note = attack.proficient ? (attack.properties ?? '') : 'not proficient'
      flow.line(
        `${attack.name}  —  ${signed(attack.attackBonus)} to hit (${attack.abilityAbbr}), ${attack.damage}${note ? `  [${note}]` : ''}`,
      )
    }
    if (derived.attacks.length) flow.gap(4)

    const grouped = new Map<string, typeof derived.actions>()
    for (const action of derived.actions) {
      grouped.set(action.timingLabel, [...(grouped.get(action.timingLabel) ?? []), action])
    }
    for (const [label, actions] of grouped) {
      flow.line(`${label.toUpperCase()}: ${actions.map((a) => (a.uses ? `${a.name} (${a.uses})` : a.name)).join(', ')}`, 8)
    }
    flow.gap()
  }

  if (derived.features.length) {
    flow.heading('Features & Traits')
    for (const feature of derived.features) {
      flow.entry(feature.name, feature.description, [feature.source, feature.uses].filter(Boolean).join(' - '))
    }
  }

  if (derived.resources.length) {
    flow.heading('Resources')
    for (const resource of derived.resources) flow.line(`${resource.name}: ${resource.value}`)
    flow.gap()
  }

  if (derived.notes.length) {
    flow.heading('Notes')
    for (const note of derived.notes) flow.line(`- ${note}`)
    flow.gap()
  }

  for (const source of derived.spellcasting) {
    flow.heading(source.label)

    const summary = [
      `Ability: ${source.abilityAbbr} (${signed(source.modifier)})`,
      source.saveDC !== undefined ? `Save DC ${source.saveDC}` : '',
      source.attackBonus !== undefined ? `Attack ${signed(source.attackBonus)}` : '',
      source.preparation === 'prepared' ? 'Prepared caster' : 'Known spells',
    ]
      .filter(Boolean)
      .join('   ')
    flow.line(summary)

    if (source.slots.length) {
      const slots = source.slots
        .map((count, index) => (count > 0 ? `${spellLevelLabel(index + 1)}: ${count}` : ''))
        .filter(Boolean)
        .join('   ')
      flow.line(`Slots  ${slots}`)
    }
    flow.gap(4)

    const byLevel = new Map<number, string[]>()
    for (const spell of source.chosen) {
      const level = Number(spell.meta?.['level'] ?? 0)
      const list = byLevel.get(level) ?? []
      list.push(spell.name)
      byLevel.set(level, list)
    }

    for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
      flow.line(`${spellLevelLabel(level)}: ${byLevel.get(level)!.sort().join(', ')}`)
    }
    flow.gap()
  }

  // Read the questions from the ruleset rather than naming them here, so
  // rewording or adding a prompt cannot silently drop it from the sheet.
  const identityStep = ruleset.steps.find((step) => step.kind === 'identity')
  const identityFields = identityStep && 'fields' in identityStep ? identityStep.fields : []
  const filled = identityFields
    // Short factual answers already appear in the header or the stat blocks.
    .filter((field) => field.kind === 'textarea')
    .map((field) => [field.label, derived.state.identity[field.id] ?? ''] as [string, string])
    .filter(([, value]) => value.trim())

  if (filled.length || derived.state.notes.trim()) {
    flow.heading('Character')
    for (const [label, value] of filled) flow.entry(label, value)
    if (derived.state.notes.trim()) flow.entry('Notes', derived.state.notes)
  }

  if (options.noteSpace) {
    // Anything below this and the ruled lines would be a two-line orphan.
    if (flow.position - MARGIN < 220) {
      sheet.newPage()
      drawNoteSpace(sheet, PAGE_HEIGHT - MARGIN)
    } else {
      drawNoteSpace(sheet, flow.position - 10)
    }
  }
}

/** Ruled space to write in during play. */
function drawNoteSpace(sheet: Sheet, top: number): void {
  const width = PAGE_WIDTH - MARGIN * 2
  const half = (width - 16) / 2

  const left = sheet.ruledSpace('Hit Points & Conditions', MARGIN, top, half, 5)
  sheet.ruledSpace('Currency & Treasure', MARGIN + half + 16, top, half, 5)

  const notesTop = Math.min(left, top) - 8
  const lines = Math.max(0, Math.floor((notesTop - MARGIN - 20) / 16))
  if (lines > 0) sheet.ruledSpace('Session Notes', MARGIN, notesTop, width, lines)
}

function drawFooter(sheet: Sheet, ruleset: Ruleset, pageIndex: number, pageCount: number): void {
  const notice = wrap(ruleset.license.notice, sheet.fonts.regular, 6, PAGE_WIDTH - MARGIN * 2 - 60, 2)
  let y = MARGIN - 12
  for (const line of notice) {
    sheet.text(line, MARGIN, y, { size: 6, color: MUTED })
    y -= 7
  }
  const label = `Page ${pageIndex + 1} of ${pageCount}`
  const w = sheet.fonts.regular.widthOfTextAtSize(label, 7)
  sheet.text(label, PAGE_WIDTH - MARGIN - w, MARGIN - 12, { size: 7, color: MUTED })
}

/** Build the character sheet and return the raw PDF bytes. */
export async function renderCharacterSheet(
  ruleset: Ruleset,
  derived: DerivedCharacter,
  options: SheetOptions = {},
): Promise<Uint8Array> {
  usePalette(!!options.monochrome)
  const { PDFDocument, StandardFonts } = await import('pdf-lib')

  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  }

  doc.setTitle(`${safe(derived.state.name) || 'Character'} - character sheet`)
  doc.setCreator('Character Creator')
  doc.setProducer('Character Creator')
  doc.setSubject(ruleset.name)

  const sheet = new Sheet(doc, fonts)
  const contentTop = drawHeader(sheet, ruleset, derived)

  const columnGap = 14
  const columnWidth = (PAGE_WIDTH - MARGIN * 2 - columnGap * 2) / 3
  const col1 = MARGIN
  const col2 = col1 + columnWidth + columnGap
  const col3 = col2 + columnWidth + columnGap

  const left = drawAbilities(sheet, ruleset, derived, col1, contentTop, columnWidth)

  let middle = drawSaves(sheet, derived, col2, contentTop, columnWidth)
  middle = drawSkills(sheet, derived, col2, middle, columnWidth)

  let right = drawCombatTiles(sheet, derived, col3, contentTop, columnWidth)
  right = drawProficiencies(sheet, ruleset, derived, col3, right, columnWidth)
  right = drawInventory(sheet, derived, col3, right, columnWidth)

  drawFeaturesAndSpells(sheet, ruleset, derived, Math.min(left, middle, right), options)

  const pages = doc.getPages()
  pages.forEach((page, index) => {
    sheet.page = page
    drawFooter(sheet, ruleset, index, pages.length)
  })

  return doc.save()
}

/** Render the sheet and hand it to the browser as a download. */
export async function downloadCharacterSheet(
  ruleset: Ruleset,
  derived: DerivedCharacter,
  options: SheetOptions = {},
): Promise<void> {
  const bytes = await renderCharacterSheet(ruleset, derived, options)
  const fileName = `${(derived.state.name || 'character').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
  triggerDownload(new Blob([bytes as BlobPart], { type: 'application/pdf' }), fileName)
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
