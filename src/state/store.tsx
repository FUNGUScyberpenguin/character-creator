import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { CharacterState, CustomFeature, InventoryItem } from '../engine/character'
import { createCharacter, normalizeCharacter } from '../engine/character'
import type { DerivedCharacter } from '../engine/derive'
import { deriveCharacter } from '../engine/derive'
import type { CharacterValidation } from '../engine/validation'
import { validateCharacter } from '../engine/validation'
import type { Ruleset, Step } from '../engine/types'
import { getRuleset, rulesets } from '../rulesets'

/** One saved character per system, so switching games never loses work. */
const characterKey = (rulesetId: string) => `character-creator:character:${rulesetId}:v1`
const CHOSEN_KEY = 'character-creator:ruleset:v1'

/**
 * The whole store, including the state before a game has been chosen.
 * Only the picker gate needs this shape; see `useStore` below.
 */
interface AppStore {
  /** Null until the player has chosen which game they are playing. */
  ruleset: Ruleset | null
  /** Every system this build knows about. */
  available: Ruleset[]
  chooseRuleset: (id: string) => void
  clearRuleset: () => void
  character: CharacterState | null
  derived: DerivedCharacter | null
  validation: CharacterValidation | null
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
  toggleEquipped: (name: string) => void
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

const StoreContext = createContext<AppStore | null>(null)

/**
 * The store once a system has been chosen. Everything inside the wizard runs
 * behind the picker gate, so these are guaranteed present and the components
 * do not each have to prove it.
 */
export type Store = Omit<AppStore, 'ruleset' | 'character' | 'derived' | 'validation'> & {
  ruleset: Ruleset
  character: CharacterState
  derived: DerivedCharacter
  validation: CharacterValidation
}

function loadCharacter(ruleset: Ruleset): CharacterState {
  if (typeof localStorage === 'undefined') return createCharacter(ruleset)
  try {
    const saved = localStorage.getItem(characterKey(ruleset.id))
    return saved ? normalizeCharacter(JSON.parse(saved), ruleset) : createCharacter(ruleset)
  } catch {
    // A corrupt save should never stop the app opening.
    return createCharacter(ruleset)
  }
}

function loadChosenRuleset(): Ruleset | null {
  if (typeof localStorage === 'undefined') return null
  const id = localStorage.getItem(CHOSEN_KEY)
  return (id && getRuleset(id)) || null
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ruleset, setRuleset] = useState<Ruleset | null>(() => loadChosenRuleset())
  const [character, setCharacter] = useState<CharacterState | null>(() => {
    const chosen = loadChosenRuleset()
    return chosen ? loadCharacter(chosen) : null
  })
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
    if (!ruleset || !character) return
    try {
      localStorage.setItem(characterKey(ruleset.id), JSON.stringify(character))
    } catch {
      // Private browsing or a full quota — the wizard still works in memory.
    }
  }, [ruleset, character])

  const chooseRuleset = useCallback((id: string) => {
    const chosen = getRuleset(id)
    if (!chosen) return
    setRuleset(chosen)
    setCharacter(loadCharacter(chosen))
    setStepIndex(0)
    try {
      localStorage.setItem(CHOSEN_KEY, chosen.id)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const clearRuleset = useCallback(() => {
    setRuleset(null)
    setCharacter(null)
    setStepIndex(0)
    try {
      localStorage.removeItem(CHOSEN_KEY)
    } catch {
      /* storage unavailable */
    }
  }, [])

  // Before a system is chosen there is nothing to derive. The picker renders
  // instead of the wizard, so these placeholders are never read.
  const derived = useMemo(
    () => (ruleset && character ? deriveCharacter(ruleset, character) : null),
    [ruleset, character],
  )
  const validation = useMemo(
    () => (ruleset && character && derived ? validateCharacter(ruleset, character, derived) : null),
    [ruleset, character, derived],
  )

  // Every mutation is a no-op before a system is chosen, which cannot happen
  // through the UI but keeps the reducers total.
  const edit = useCallback((change: (current: CharacterState) => CharacterState) => {
    setCharacter((current) => (current ? { ...change(current), updatedAt: new Date().toISOString() } : current))
  }, [])

  const update = useCallback((patch: Partial<CharacterState>) => edit((current) => ({ ...current, ...patch })), [edit])

  const setSelection = useCallback(
    (key: string, ids: string[]) => {
      edit((current) => ({ ...current, selections: { ...current.selections, [key]: ids } }))
    },
    [edit],
  )

  const toggleSelection = useCallback(
    (key: string, id: string, count: number, allowDuplicates = false) => {
      edit((current) => {
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

        return { ...current, selections: { ...current.selections, [key]: next } }
      })
    },
    [edit],
  )

  const setIdentityField = useCallback((id: string, value: string) => {
    edit((current) => ({ ...current, identity: { ...current.identity, [id]: value } }))
  }, [edit])

  const setAbilityScore = useCallback((ability: string, score: number) => {
    edit((current) => ({ ...current, baseAbilityScores: { ...current.baseAbilityScores, [ability]: score } }))
  }, [edit])

  const setInventory = useCallback((items: InventoryItem[]) => {
    edit((current) => ({ ...current, inventory: items }))
  }, [edit])

  const toggleEquipped = useCallback((name: string) => {
    edit((current) => {
      const has = current.equipped.some((value) => value.toLowerCase() === name.toLowerCase())
      return {
        ...current,
        equipped: has
          ? current.equipped.filter((value) => value.toLowerCase() !== name.toLowerCase())
          : [...current.equipped, name],
      }
    })
  }, [edit])

  const toggleSpell = useCallback((sourceId: string, spellId: string) => {
    edit((current) => {
      const chosen = current.spells[sourceId] ?? []
      const next = chosen.includes(spellId) ? chosen.filter((id) => id !== spellId) : [...chosen, spellId]
      return { ...current, spells: { ...current.spells, [sourceId]: next } }
    })
  }, [edit])

  const setOverride = useCallback((statId: string, override: { value: number; note?: string } | null) => {
    edit((current) => {
      const overrides = { ...current.overrides }
      if (override === null) delete overrides[statId]
      else overrides[statId] = override
      return { ...current, overrides }
    })
  }, [edit])

  const setCustomFeatures = useCallback((features: CustomFeature[]) => {
    edit((current) => ({ ...current, customFeatures: features }))
  }, [edit])

  const setCustomProficiencies = useCallback((values: { category: string; value: string }[]) => {
    edit((current) => ({ ...current, customProficiencies: values }))
  }, [edit])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const reset = useCallback(() => {
    if (!ruleset) return
    setCharacter(createCharacter(ruleset))
    setStepIndex(0)
  }, [ruleset])

  const loadFrom = useCallback(
    (raw: unknown) => {
      // A saved character names its own system; honour that over the current one.
      const saved = raw && typeof raw === 'object' ? (raw as { rulesetId?: string }).rulesetId : undefined
      const target = (saved && getRuleset(saved)) || ruleset
      if (!target) return
      if (target.id !== ruleset?.id) {
        setRuleset(target)
        try {
          localStorage.setItem(CHOSEN_KEY, target.id)
        } catch {
          /* storage unavailable */
        }
      }
      setCharacter(normalizeCharacter(raw, target))
      setStepIndex(0)
    },
    [ruleset],
  )

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex(Math.min(Math.max(index, 0), Math.max((ruleset?.steps.length ?? 1) - 1, 0)))
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [ruleset?.steps.length],
  )

  const goToStepId = useCallback(
    (id: string) => {
      const index = ruleset?.steps.findIndex((step) => step.id === id) ?? -1
      if (index >= 0) goToStep(index)
    },
    [goToStep, ruleset?.steps],
  )

  const value: AppStore = {
    ruleset,
    available: rulesets,
    chooseRuleset,
    clearRuleset,
    character,
    derived,
    validation,
    steps: ruleset?.steps ?? [],
    stepIndex,
    step: ruleset?.steps[stepIndex] ?? ruleset?.steps[0] ?? ({ id: 'none', kind: 'intro', title: '', body: [] } as Step),
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
    toggleEquipped,
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

/** The raw store, including the pre-choice state. For the picker gate only. */
export function useApp(): AppStore {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useApp must be used inside a StoreProvider')
  return value
}

/** The store inside the wizard, where a system has definitely been chosen. */
export function useStore(): Store {
  const value = useApp()
  if (!value.ruleset || !value.character || !value.derived || !value.validation) {
    throw new Error('useStore was called before a ruleset was chosen')
  }
  return value as Store
}
