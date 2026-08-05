import { useMemo } from 'react'

import { findMethod, pointBuyRange, pointsRemaining, rollAbilityScores, scoreCost, validateAbilities } from '../../engine/abilities'
import { abilityModifier } from '../../engine/derive'
import type { AbilityMethod } from '../../engine/types'
import { useStore } from '../../state/store'
import { Callout } from '../common'

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

/**
 * Ability generation. Each method gets the control that suits it — a pool of
 * draggable-feeling number buttons for the standard array, steppers with a
 * running budget for point buy, dice for rolling, plain inputs for house rules.
 */
export function AbilitiesStep() {
  const { ruleset, character, derived, update } = useStore()
  const method = findMethod(ruleset, character.abilityMethod)

  const validation = useMemo(
    () => validateAbilities(ruleset, method, character.baseAbilityScores),
    [ruleset, method, character.baseAbilityScores],
  )

  return (
    <div className="stack">
      <div className="grid grid-methods">
        {ruleset.abilityMethods.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`method${character.abilityMethod === option.id ? ' is-selected' : ''}`}
            onClick={() => update({ abilityMethod: option.id })}
            aria-pressed={character.abilityMethod === option.id}
          >
            <span className="method-name">{option.name}</span>
            <span className="method-description">{option.description}</span>
          </button>
        ))}
      </div>

      {method?.kind === 'array' && <ArrayAssignment method={method} />}
      {method?.kind === 'point-buy' && <PointBuy method={method} />}
      {method?.kind === 'roll' && <RollScores method={method} />}
      {method?.kind === 'manual' && <ManualEntry />}

      {validation.issues.length > 0 && (
        <Callout tone="warn">
          <ul className="issue-list">
            {validation.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Callout>
      )}

      <section>
        <h2 className="section-title">Your scores</h2>
        <p className="section-hint">Including everything your race and other choices add.</p>
        <div className="ability-summary">
          {ruleset.abilities.map((ability) => {
            const base = character.baseAbilityScores[ability.id] ?? 10
            const final = derived.abilityScores[ability.id] ?? base
            const bonus = final - base
            return (
              <div key={ability.id} className="ability-final">
                <span className="ability-abbr">{ability.abbr}</span>
                <span className="ability-score">{final}</span>
                <span className="ability-mod">{signed(abilityModifier(final))}</span>
                {bonus !== 0 && <span className="ability-bonus">{signed(bonus)} from your choices</span>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function ArrayAssignment({ method }: { method: AbilityMethod }) {
  const { ruleset, character, setAbilityScore } = useStore()
  const pool = method.array ?? []

  // Which array entries are still unassigned, counted by value so duplicates
  // (two 13s, say) behave correctly.
  const used = new Map<number, number>()
  for (const ability of ruleset.abilities) {
    const score = character.baseAbilityScores[ability.id]
    if (score !== undefined) used.set(score, (used.get(score) ?? 0) + 1)
  }

  const remaining = pool.reduce<number[]>((list, value) => {
    const taken = used.get(value) ?? 0
    const alreadyListed = list.filter((entry) => entry === value).length
    const totalInPool = pool.filter((entry) => entry === value).length
    if (alreadyListed + taken < totalInPool) list.push(value)
    return list
  }, [])

  return (
    <section>
      <h2 className="section-title">Assign the array</h2>
      <p className="section-hint">
        {remaining.length ? `Still to place: ${remaining.join(', ')}` : 'Every number is placed.'}
      </p>

      <div className="assign-grid">
        {ruleset.abilities.map((ability) => (
          <div key={ability.id} className="assign-row">
            <span className="assign-name">
              {ability.name}
              <em>{ability.description}</em>
            </span>
            <select
              value={character.baseAbilityScores[ability.id] ?? ''}
              onChange={(event) => setAbilityScore(ability.id, Number(event.target.value))}
            >
              <option value="">—</option>
              {[...new Set([...pool])].sort((a, b) => b - a).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  )
}

function PointBuy({ method }: { method: AbilityMethod }) {
  const { ruleset, character, setAbilityScore } = useStore()
  const range = pointBuyRange(method)
  const min = range[0] ?? 8
  const max = range[range.length - 1] ?? 15
  const remaining = pointsRemaining(method, character.baseAbilityScores)

  return (
    <section>
      <div className="budget">
        <span className={`budget-value${remaining < 0 ? ' is-over' : ''}`}>{remaining}</span>
        <span className="budget-label">points left of {method.points}</span>
      </div>

      <div className="assign-grid">
        {ruleset.abilities.map((ability) => {
          const score = character.baseAbilityScores[ability.id] ?? min
          const costUp = score < max ? scoreCost(method, score + 1) - scoreCost(method, score) : 0
          return (
            <div key={ability.id} className="assign-row">
              <span className="assign-name">
                {ability.name}
                <em>{ability.description}</em>
              </span>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setAbilityScore(ability.id, Math.max(min, score - 1))}
                  disabled={score <= min}
                  aria-label={`Lower ${ability.name}`}
                >
                  −
                </button>
                <span className="stepper-value">{score}</span>
                <button
                  type="button"
                  onClick={() => setAbilityScore(ability.id, Math.min(max, score + 1))}
                  disabled={score >= max || costUp > remaining}
                  aria-label={`Raise ${ability.name}`}
                >
                  +
                </button>
                {score < max && <span className="stepper-cost">next costs {costUp}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function RollScores({ method }: { method: AbilityMethod }) {
  const { ruleset, character, update, setAbilityScore } = useStore()
  const rolled = character.rolledScores

  return (
    <section>
      <div className="roll-bar">
        <button type="button" className="button" onClick={() => update({ rolledScores: rollAbilityScores(ruleset, method) })}>
          {rolled.length ? 'Roll again' : `Roll ${method.dice ?? '4d6kh3'} six times`}
        </button>
        {rolled.length > 0 && (
          <span className="roll-results">
            Rolled: <strong>{[...rolled].sort((a, b) => b - a).join(', ')}</strong>
          </span>
        )}
      </div>

      {rolled.length > 0 && (
        <div className="assign-grid">
          {ruleset.abilities.map((ability) => (
            <div key={ability.id} className="assign-row">
              <span className="assign-name">
                {ability.name}
                <em>{ability.description}</em>
              </span>
              <select
                value={character.baseAbilityScores[ability.id] ?? ''}
                onChange={(event) => setAbilityScore(ability.id, Number(event.target.value))}
              >
                <option value="">—</option>
                {[...new Set(rolled)].sort((a, b) => b - a).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ManualEntry() {
  const { ruleset, character, setAbilityScore } = useStore()

  return (
    <section className="assign-grid">
      {ruleset.abilities.map((ability) => (
        <div key={ability.id} className="assign-row">
          <span className="assign-name">
            {ability.name}
            <em>{ability.description}</em>
          </span>
          <input
            type="number"
            min={1}
            max={30}
            value={character.baseAbilityScores[ability.id] ?? 10}
            onChange={(event) => setAbilityScore(ability.id, Number(event.target.value))}
          />
        </div>
      ))}
    </section>
  )
}
