import type { AbilityMethod, Ruleset } from './types'

/**
 * Helpers for the ability-score step: point-buy accounting, standard-array
 * assignment, and dice rolling. All of it is driven by the method the ruleset
 * declares, so a system with different costs or dice needs no code changes.
 */

export function findMethod(ruleset: Ruleset, id: string): AbilityMethod | undefined {
  return ruleset.abilityMethods.find((method) => method.id === id)
}

/** Point cost of a single score under a point-buy method. */
export function scoreCost(method: AbilityMethod, score: number): number {
  const cost = method.costs?.[score]
  if (cost !== undefined) return cost
  // Without an explicit table, fall back to "one point per step above the
  // minimum", which is the simplest sensible reading of a point-buy system.
  return Math.max(0, score - (method.min ?? 8))
}

export function pointsSpent(method: AbilityMethod, scores: Record<string, number>): number {
  return Object.values(scores).reduce((total, score) => total + scoreCost(method, score), 0)
}

export function pointsRemaining(method: AbilityMethod, scores: Record<string, number>): number {
  return (method.points ?? 0) - pointsSpent(method, scores)
}

/** Scores a point-buy method allows, cheapest first. */
export function pointBuyRange(method: AbilityMethod): number[] {
  const min = method.min ?? 8
  const max = method.max ?? 15
  const range: number[] = []
  for (let score = min; score <= max; score += 1) range.push(score)
  return range
}

export interface AbilityValidation {
  valid: boolean
  issues: string[]
}

export function validateAbilities(
  ruleset: Ruleset,
  method: AbilityMethod | undefined,
  scores: Record<string, number>,
): AbilityValidation {
  const issues: string[] = []
  if (!method) return { valid: true, issues }

  const assigned = ruleset.abilities.map((ability) => scores[ability.id])
  if (assigned.some((score) => score === undefined || !Number.isFinite(score))) {
    issues.push('Every ability needs a score.')
    return { valid: false, issues }
  }

  if (method.kind === 'point-buy') {
    const remaining = pointsRemaining(method, pickAbilityScores(ruleset, scores))
    if (remaining < 0) issues.push(`You are ${Math.abs(remaining)} point(s) over budget.`)
    const min = method.min ?? 8
    const max = method.max ?? 15
    for (const ability of ruleset.abilities) {
      const score = scores[ability.id] ?? 0
      if (score < min || score > max) {
        issues.push(`${ability.name} must be between ${min} and ${max} before other bonuses.`)
      }
    }
  }

  if (method.kind === 'array' && method.array) {
    const pool = [...method.array].sort((a, b) => a - b)
    const used = ruleset.abilities.map((ability) => scores[ability.id] ?? 0).sort((a, b) => a - b)
    const matches = pool.length === used.length && pool.every((value, index) => value === used[index])
    if (!matches) issues.push('Assign each number from the array exactly once.')
  }

  return { valid: issues.length === 0, issues }
}

/** Only the scores that correspond to abilities this ruleset defines. */
export function pickAbilityScores(ruleset: Ruleset, scores: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const ability of ruleset.abilities) out[ability.id] = scores[ability.id] ?? 10
  return out
}

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

const DICE_PATTERN = /^(\d+)d(\d+)(?:kh(\d+))?$/i

export interface DiceRoll {
  total: number
  dice: number[]
  /** Indices of dice that were dropped by a "keep highest" clause. */
  dropped: number[]
}

/** Roll a notation like `4d6kh3`. Unknown notation rolls nothing. */
export function rollDice(notation: string, random: () => number = Math.random): DiceRoll {
  const match = DICE_PATTERN.exec(notation.trim())
  if (!match) return { total: 0, dice: [], dropped: [] }

  const count = Number(match[1])
  const sides = Number(match[2])
  const keep = match[3] ? Number(match[3]) : count

  const dice = Array.from({ length: count }, () => Math.floor(random() * sides) + 1)
  const order = dice
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)

  const kept = order.slice(0, keep)
  const dropped = order.slice(keep).map((item) => item.index)
  const total = kept.reduce((sum, item) => sum + item.value, 0)

  return { total, dice, dropped }
}

/** One roll per ability, in ruleset order. */
export function rollAbilityScores(
  ruleset: Ruleset,
  method: AbilityMethod,
  random: () => number = Math.random,
): number[] {
  const notation = method.dice ?? '4d6kh3'
  return ruleset.abilities.map(() => rollDice(notation, random).total)
}
