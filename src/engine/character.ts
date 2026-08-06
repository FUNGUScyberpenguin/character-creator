import type { Ruleset } from './types'

/**
 * Everything the player has decided, and nothing else.
 *
 * This is the only thing we persist or export. It stays small and stable on
 * purpose: every number on the character sheet is recomputed from a ruleset
 * plus this state, so a rules fix never leaves saved characters stale.
 */
export interface CharacterState {
  /** Bumped when the shape below changes incompatibly. */
  schemaVersion: number
  id: string
  rulesetId: string
  name: string
  playerName: string
  level: number
  /** Free-text fields declared by the ruleset's identity step. */
  identity: Record<string, string>
  abilityMethod: string
  /** Scores as assigned by the player, before anything the ruleset adds. */
  baseAbilityScores: Record<string, number>
  /** Dice results held for the "roll" method so a refresh doesn't reroll. */
  rolledScores: number[]
  /** Selection key (see `stepKey`/`choiceKey`) to chosen option ids. */
  selections: Record<string, string[]>
  /** Items typed in by hand, on top of anything granted by a choice. */
  inventory: InventoryItem[]
  /**
   * Names of items actually being worn or held. Carrying a breastplate in your
   * pack should not change your Armor Class, so this is tracked separately.
   */
  equipped: string[]
  /** Spellcasting source id to chosen spell ids. */
  spells: Record<string, string[]>
  /**
   * Escape hatch: derived stat id to a value that replaces whatever the rules
   * computed, with the player's reason. The sheet marks these so nobody
   * mistakes a house rule for a bug.
   */
  overrides: Record<string, { value: number; note?: string }>
  /** Escape hatch: anything the ruleset has no way to express. */
  customFeatures: CustomFeature[]
  /** Escape hatch: proficiencies the ruleset never offered, by category. */
  customProficiencies: { category: string; value: string }[]
  notes: string
  updatedAt: string
}

export interface CustomFeature {
  name: string
  description: string
  /** Optional timing, so homebrew can appear in the "on your turn" section too. */
  action?: string
  uses?: string
}

export interface InventoryItem {
  name: string
  quantity: number
}

export const CHARACTER_SCHEMA_VERSION = 1

/** Selection key for an entry picked directly at a wizard step. */
export function stepKey(stepId: string): string {
  return `step:${stepId}`
}

/** Selection key for a choice offered by whatever lives at `ownerPath`. */
export function choiceKey(ownerPath: string, choiceId: string): string {
  return `${ownerPath}/choice:${choiceId}`
}

/** Path of the entry chosen at a step — the owner of that entry's choices. */
export function entryPath(ownerPath: string, entryId: string): string {
  return `${ownerPath}#${entryId}`
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `char-${Math.random().toString(36).slice(2, 10)}`
}

export function createCharacter(ruleset: Ruleset): CharacterState {
  const baseAbilityScores: Record<string, number> = {}
  for (const ability of ruleset.abilities) baseAbilityScores[ability.id] = 10

  return {
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    id: randomId(),
    rulesetId: ruleset.id,
    name: '',
    playerName: '',
    level: 1,
    identity: {},
    abilityMethod: ruleset.abilityMethods[0]?.id ?? 'manual',
    baseAbilityScores,
    rolledScores: [],
    selections: {},
    inventory: [],
    equipped: [],
    spells: {},
    overrides: {},
    customFeatures: [],
    customProficiencies: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Normalise anything loaded from disk or a share link. Unknown fields are
 * dropped and missing ones filled in, so a hand-edited or older file still
 * opens instead of crashing the wizard.
 */
export function normalizeCharacter(input: unknown, ruleset: Ruleset): CharacterState {
  const base = createCharacter(ruleset)
  if (!input || typeof input !== 'object') return base
  const raw = input as Partial<CharacterState>

  const scores: Record<string, number> = { ...base.baseAbilityScores }
  for (const ability of ruleset.abilities) {
    const value = raw.baseAbilityScores?.[ability.id]
    if (typeof value === 'number' && Number.isFinite(value)) scores[ability.id] = value
  }

  const selections: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(raw.selections ?? {})) {
    if (Array.isArray(value)) selections[key] = value.filter((v): v is string => typeof v === 'string')
  }

  const spells: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(raw.spells ?? {})) {
    if (Array.isArray(value)) spells[key] = value.filter((v): v is string => typeof v === 'string')
  }

  const inventory = Array.isArray(raw.inventory)
    ? raw.inventory
        .filter((item): item is InventoryItem => !!item && typeof item.name === 'string')
        .map((item) => ({ name: item.name, quantity: Number(item.quantity) || 1 }))
    : []

  const overrides: Record<string, { value: number; note?: string }> = {}
  for (const [key, value] of Object.entries(raw.overrides ?? {})) {
    if (value && typeof value === 'object' && Number.isFinite(Number(value.value))) {
      overrides[key] = { value: Number(value.value), note: typeof value.note === 'string' ? value.note : undefined }
    }
  }

  const customFeatures = Array.isArray(raw.customFeatures)
    ? raw.customFeatures
        .filter((f): f is CustomFeature => !!f && typeof f.name === 'string')
        .map((f) => ({
          name: f.name,
          description: typeof f.description === 'string' ? f.description : '',
          action: typeof f.action === 'string' ? f.action : undefined,
          uses: typeof f.uses === 'string' ? f.uses : undefined,
        }))
    : []

  const customProficiencies = Array.isArray(raw.customProficiencies)
    ? raw.customProficiencies.filter(
        (p): p is { category: string; value: string } =>
          !!p && typeof p.category === 'string' && typeof p.value === 'string',
      )
    : []

  return {
    ...base,
    equipped: Array.isArray(raw.equipped) ? raw.equipped.filter((v): v is string => typeof v === 'string') : [],
    overrides,
    customFeatures,
    customProficiencies,
    id: typeof raw.id === 'string' ? raw.id : base.id,
    rulesetId: ruleset.id,
    name: typeof raw.name === 'string' ? raw.name : '',
    playerName: typeof raw.playerName === 'string' ? raw.playerName : '',
    level: clampLevel(raw.level, ruleset.maxLevel),
    identity: sanitizeStringMap(raw.identity),
    abilityMethod:
      ruleset.abilityMethods.some((m) => m.id === raw.abilityMethod) && raw.abilityMethod
        ? raw.abilityMethod
        : base.abilityMethod,
    baseAbilityScores: scores,
    rolledScores: Array.isArray(raw.rolledScores) ? raw.rolledScores.filter((n) => typeof n === 'number') : [],
    selections,
    inventory,
    spells,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
  }
}

function clampLevel(level: unknown, maxLevel: number): number {
  const value = Math.trunc(Number(level))
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.min(value, maxLevel)
}

function sanitizeStringMap(input: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!input || typeof input !== 'object') return out
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}
