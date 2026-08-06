import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { CharacterState, CustomFeature, InventoryItem } from '../engine/character'
import { createCharacter, normalizeCharacter } from '../engine/character'
import type { DerivedCharacter } from '../engine/derive'
import { deriveCharacter } from '../engine/derive'
import type { CharacterValidation } from '../engine/validation'
import { validateCharacter } from '../engine/validation'
import type { Ruleset, Step } from '../engine/types'
import { defaultRuleset, getRuleset } from '../rulesets'

const STORAGE_KEY = 'character-creator:character:v1'

interface StoreValue {
  ruleset: Ruleset
  character: CharacterState
  derived: DerivedCharacter
  validation: CharacterValidation
  steps: Step[]
  stepIndex: number
  step: Step
  goToStep: (index: number) => void
  goToStepId: (id: string) => void
  next: () => void
  back: () => void
  update: (patch: Partial<CharacterState>) => void
  setSelection: (key: string, ids: string[]) => void
  toggleSelection: (key: string, id: string, count: number, allowDuplicates?: boolean) => void
  setIdentityField: (id: string, value: string) => void
  setAbilityScore: (ability: string, score: number) => void
  setInventory: (items: InventoryItem[]) => void
  toggleSpell: (sourceId: string, spellId: string) => void
  setOverride: (statId: string, override: { value: number; note?: string } | null) => void
  setCustomFeatures: (features: CustomFeature[]) => void
  setCustomProficiencies: (values: { category: string; value: string }[]) => void
  reset: () => void
  loadFrom: (raw: unknown) => void
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

/** Presentation preferences. Kept apart from the character so they persist across characters. */
export interface Settings {
  /** Scales the whole interface, for low vision or a small screen. */
  textScale: number
  /** Swaps to a high-legibility font stack with looser spacing. */
  readableFont: boolean
  /** Removes decorative colour, keeping contrast high. */
  highContrast: boolean
}

const SETTINGS_KEY = 'character-creator:settings:v1'

const DEFAULT_SETTINGS: Settings = { textScale: 1, readableFont: false, highContrast: false }

const StoreContext = createContext<StoreValue | null>(null)

function loadInitial(ruleset: Ruleset): CharacterState {
  if (typeof localStorage === 'undefined') return createCharacter(ruleset)
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createCharacter(ruleset)
    const parsed = JSON.parse(saved) as { rulesetId?: string }
    const savedRuleset = (parsed.rulesetId && getRuleset(parsed.rulesetId)) || ruleset
    return normalizeCharacter(parsed, savedRuleset)
  } catch {
    // A corrupt save should never stop the app opening.
    return createCharacter(ruleset)
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const ruleset = defaultRuleset
  const [character, setCharacter] = useState<CharacterState>(() => loadInitial(ruleset))
  const [stepIndex, setStepIndex] = useState(0)
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  // Preferences drive CSS custom properties and data attributes on <html>, so
  // every component picks them up without threading props through the tree.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* storage unavailable */
    }
    const root = document.documentElement
    root.style.setProperty('--text-scale', String(settings.textScale))
    root.dataset['readableFont'] = settings.readableFont ? 'on' : 'off'
    root.dataset['contrast'] = settings.highContrast ? 'high' : 'normal'
  }, [settings])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(character))
    } catch {
      // Private browsing or a full quota — the wizard still works in memory.
    }
  }, [character])

  const derived = useMemo(() => deriveCharacter(ruleset, character), [ruleset, character])
  const validation = useMemo(() => validateCharacter(ruleset, character, derived), [ruleset, character, derived])

  const update = useCallback((patch: Partial<CharacterState>) => {
    setCharacter((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }))
  }, [])

  const setSelection = useCallback(
    (key: string, ids: string[]) => {
      setCharacter((current) => ({
        ...current,
        selections: { ...current.selections, [key]: ids },
        updatedAt: new Date().toISOString(),
      }))
    },
    [],
  )

  const toggleSelection = useCallback(
    (key: string, id: string, count: number, allowDuplicates = false) => {
      setCharacter((current) => {
        const selected = current.selections[key] ?? []

        let next: string[]
        if (allowDuplicates) {
          // Duplicates are how "+1 to the same ability twice" is expressed, so
          // adding past the limit drops the oldest pick rather than refusing.
          next = [...selected, id].slice(-count)
        } else if (selected.includes(id)) {
          next = selected.filter((value) => value !== id)
        } else if (count === 1) {
          next = [id]
        } else if (selected.length < count) {
          next = [...selected, id]
        } else {
          // At the limit: replace the earliest pick so the click still does
          // something visible instead of silently failing.
          next = [...selected.slice(1), id]
        }

        return {
          ...current,
          selections: { ...current.selections, [key]: next },
          updatedAt: new Date().toISOString(),
        }
      })
    },
    [],
  )

  const setIdentityField = useCallback((id: string, value: string) => {
    setCharacter((current) => ({
      ...current,
      identity: { ...current.identity, [id]: value },
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const setAbilityScore = useCallback((ability: string, score: number) => {
    setCharacter((current) => ({
      ...current,
      baseAbilityScores: { ...current.baseAbilityScores, [ability]: score },
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const setInventory = useCallback((items: InventoryItem[]) => {
    setCharacter((current) => ({ ...current, inventory: items, updatedAt: new Date().toISOString() }))
  }, [])

  const toggleSpell = useCallback((sourceId: string, spellId: string) => {
    setCharacter((current) => {
      const chosen = current.spells[sourceId] ?? []
      const next = chosen.includes(spellId) ? chosen.filter((id) => id !== spellId) : [...chosen, spellId]
      return {
        ...current,
        spells: { ...current.spells, [sourceId]: next },
        updatedAt: new Date().toISOString(),
      }
    })
  }, [])

  const setOverride = useCallback((statId: string, override: { value: number; note?: string } | null) => {
    setCharacter((current) => {
      const overrides = { ...current.overrides }
      if (override === null) delete overrides[statId]
      else overrides[statId] = override
      return { ...current, overrides, updatedAt: new Date().toISOString() }
    })
  }, [])

  const setCustomFeatures = useCallback((features: CustomFeature[]) => {
    setCharacter((current) => ({ ...current, customFeatures: features, updatedAt: new Date().toISOString() }))
  }, [])

  const setCustomProficiencies = useCallback((values: { category: string; value: string }[]) => {
    setCharacter((current) => ({ ...current, customProficiencies: values, updatedAt: new Date().toISOString() }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setCharacter(createCharacter(ruleset))
    setStepIndex(0)
  }, [ruleset])

  const loadFrom = useCallback(
    (raw: unknown) => {
      setCharacter(normalizeCharacter(raw, ruleset))
      setStepIndex(0)
    },
    [ruleset],
  )

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex(Math.min(Math.max(index, 0), ruleset.steps.length - 1))
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [ruleset.steps.length],
  )

  const goToStepId = useCallback(
    (id: string) => {
      const index = ruleset.steps.findIndex((step) => step.id === id)
      if (index >= 0) goToStep(index)
    },
    [goToStep, ruleset.steps],
  )

  const value: StoreValue = {
    ruleset,
    character,
    derived,
    validation,
    steps: ruleset.steps,
    stepIndex,
    step: ruleset.steps[stepIndex] ?? ruleset.steps[0]!,
    goToStep,
    goToStepId,
    next: () => goToStep(stepIndex + 1),
    back: () => goToStep(stepIndex - 1),
    update,
    setSelection,
    toggleSelection,
    setIdentityField,
    setAbilityScore,
    setInventory,
    toggleSpell,
    setOverride,
    setCustomFeatures,
    setCustomProficiencies,
    reset,
    loadFrom,
    settings,
    updateSettings,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside a StoreProvider')
  return value
}
