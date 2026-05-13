import { create } from 'zustand'
import type { Character } from '@/entities/character/types'
import { profBonus, computeMaxHP, mod } from '@/shared/data/charCalculations'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { getResourceDefaults } from '@/shared/data/resourceDefaults'

interface AppState {
  activeCharacterId: string | null
  characters: Record<string, Character>
  loaded: boolean
  setActiveCharacter: (id: string) => void
  exitCharacter: () => void
  addCharacter: (character: Character) => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  loadFromDisk: () => Promise<void>
  shortRest: (id: string, hdRolled: number) => void
  longRest: (id: string) => void
  levelUp: (id: string) => void
  setTempHp: (id: string, amount: number) => void
}

const ipc = window.characterStore

export const useAppStore = create<AppState>((set, get) => ({
  activeCharacterId: null,
  characters: {},
  loaded: false,

  setActiveCharacter: (id) => set({ activeCharacterId: id }),

  exitCharacter: () => set({ activeCharacterId: null }),

  addCharacter: (character) => {
    set((state) => ({
      characters: { ...state.characters, [character.id]: character }
    }))
    ipc.saveCharacter(character.id, character)
  },

  updateCharacter: (id, patch) => {
    set((state) => {
      const updated = { ...state.characters[id], ...patch }
      ipc.saveCharacter(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  deleteCharacter: (id) => {
    ipc.deleteCharacter(id)
    set((state) => {
      const { [id]: _, ...rest } = state.characters
      return {
        characters: rest,
        activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
      }
    })
  },

  loadFromDisk: async () => {
    if (get().loaded) return
    try {
      const ids = await ipc.listCharacters()
      const entries = await Promise.all(
        ids.map(async (id) => {
          const data = await ipc.loadCharacter(id)
          if (data == null) return [id, null] as const
          const loaded = data as Partial<Character>
          const normalized: Character = {
            ...(loaded as Character),
            equipment: loaded.equipment ?? { armorId: null, hasShield: false },
            savingThrowProficiencies: loaded.savingThrowProficiencies ?? [],
            skillProficiencies: loaded.skillProficiencies ?? {},
            conditionIds: loaded.conditionIds ?? [],
            resources: loaded.resources ?? {},
            deathSaves: loaded.deathSaves ?? { successes: 0, failures: 0 },
            inspiration: loaded.inspiration ?? false,
            spellIds: loaded.spellIds ?? [],
            spellSlots: loaded.spellSlots ?? {},
            hitDiceUsed: loaded.hitDiceUsed ?? 0,
          }
          return [id, normalized] as const
        })
      )
      const characters = Object.fromEntries(entries.filter(([, v]) => v != null)) as Record<string, Character>
      set({ characters, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  shortRest: (id, hdRolled) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      const cls = CLASS_BY_ID[char.classId]
      const availableHD = char.level - char.hitDiceUsed
      if (availableHD <= 0) return state

      const healed = Math.max(0, hdRolled + mod(char.abilityScores.con))
      const newCurrentHp = Math.min(char.hitPoints.max, char.hitPoints.current + healed)
      const newHdUsed = Math.min(char.level, char.hitDiceUsed + 1)

      // Recover resources marked recoverOn: 'short'
      const newResources = { ...char.resources }
      for (const resDef of cls?.resources ?? []) {
        if (resDef.recoverOn === 'short' && newResources[resDef.name]) {
          newResources[resDef.name] = { ...newResources[resDef.name], used: 0 }
        }
      }
      // Warlock: recover pact slots on short rest
      let newSlots = char.spellSlots
      if (char.classId === 'Warlock') {
        newSlots = Object.fromEntries(
          Object.entries(char.spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
        )
      }

      const updated: Character = {
        ...char,
        hitPoints: { ...char.hitPoints, current: newCurrentHp },
        hitDiceUsed: newHdUsed,
        resources: newResources,
        spellSlots: newSlots,
      }
      ipc.saveCharacter(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  longRest: (id) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      const cls = CLASS_BY_ID[char.classId]

      // Recover half hit dice (min 1)
      const recoverHD = Math.max(1, Math.floor(char.level / 2))
      const newHdUsed = Math.max(0, char.hitDiceUsed - recoverHD)

      // Full HP
      const newHp = { ...char.hitPoints, current: char.hitPoints.max, temp: 0 }

      // Reset all spell slots
      const newSlots = Object.fromEntries(
        Object.entries(char.spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
      )

      // Reset all resources
      const defaults = getResourceDefaults(char.classId, char.level, char.abilityScores)
      const newResources: Record<string, { used: number; total: number }> = {}
      for (const key of Object.keys(char.resources)) {
        newResources[key] = { ...char.resources[key], used: 0 }
      }
      // Re-seed defaults for any resource that might have been added
      for (const [key, val] of Object.entries(defaults)) {
        if (!newResources[key]) newResources[key] = val
      }

      // Clear death saves and concentration
      const updated: Character = {
        ...char,
        hitPoints: newHp,
        hitDiceUsed: newHdUsed,
        spellSlots: newSlots,
        resources: newResources,
        deathSaves: { successes: 0, failures: 0 },
        concentrationSpellId: undefined,
        conditionIds: char.conditionIds.filter(c => c.conditionId === 'exhaustion'),
      }
      ipc.saveCharacter(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  levelUp: (id) => {
    set((state) => {
      const char = state.characters[id]
      if (!char || char.level >= 20) return state
      const newLevel = char.level + 1
      const newProf = profBonus(newLevel)
      const newMaxHp = computeMaxHP(char.classId, newLevel, char.abilityScores.con)
      const hpGain = newMaxHp - char.hitPoints.max
      const newSlots = defaultSpellSlots(char.classId, newLevel)
      // Merge new slots: keep used counts for existing levels, add new levels fresh
      const mergedSlots = { ...newSlots }
      for (const [lvl, slot] of Object.entries(char.spellSlots)) {
        if (mergedSlots[Number(lvl)]) {
          mergedSlots[Number(lvl)] = {
            total: mergedSlots[Number(lvl)].total,
            used: Math.min(slot.used, mergedSlots[Number(lvl)].total),
          }
        }
      }
      // Re-seed resources at new level
      const newDefaults = getResourceDefaults(char.classId, newLevel, char.abilityScores)
      const newResources: Record<string, { used: number; total: number }> = {}
      for (const [key, def] of Object.entries(newDefaults)) {
        const existing = char.resources[key]
        newResources[key] = existing
          ? { used: existing.used, total: def.total }
          : { used: 0, total: def.total }
      }

      const updated: Character = {
        ...char,
        level: newLevel,
        proficiencyBonus: newProf,
        hitPoints: {
          ...char.hitPoints,
          max: newMaxHp,
          current: Math.min(char.hitPoints.max, char.hitPoints.current + hpGain),
        },
        spellSlots: mergedSlots,
        resources: newResources,
      }
      ipc.saveCharacter(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  setTempHp: (id, amount) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      const updated: Character = {
        ...char,
        hitPoints: { ...char.hitPoints, temp: Math.max(0, amount) },
      }
      ipc.saveCharacter(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },
}))
