import type { StateCreator } from 'zustand'
import type { Character, AbilityScores } from '@/entities/character/types'
import { profBonus, computeMaxHP, computeSpeed, mod } from '@/shared/data/charCalculations'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { getResourceDefaults } from '@/shared/data/resourceDefaults'
import { migrateCharacter } from '@/domain/migrations'
import { ipcService } from '@/services/ipc'
import type { AsiChoice } from '@/features/level-up/LevelUpModal'
import { FEAT_BY_ID } from '@/shared/data/featsData'

const ABILITY_SHORT: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
function formatAsiChoice(choice: AsiChoice): string {
  if (choice.type === 'double') return `+2 ${ABILITY_SHORT[choice.ability]}`
  if (choice.type === 'split') return `+1 ${ABILITY_SHORT[choice.ability1]} / +1 ${ABILITY_SHORT[choice.ability2]}`
  const featName = FEAT_BY_ID[choice.featId]?.name ?? choice.featId
  const abSuffix = choice.featAbilityChoice ? ` (+1 ${ABILITY_SHORT[choice.featAbilityChoice]})` : ''
  return `Feat: ${featName}${abSuffix}`
}

export interface CharacterSlice {
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
  levelUp: (id: string, asiChoice?: AsiChoice, newSpellIds?: string[]) => void
  applyPendingAsi: (id: string, asiLevel: number, choice: AsiChoice) => void
  setTempHp: (id: string, amount: number) => void
}

export const createCharacterSlice: StateCreator<CharacterSlice> = (set, get) => ({
  activeCharacterId: null,
  characters: {},
  loaded: false,

  setActiveCharacter: (id) => set({ activeCharacterId: id }),

  exitCharacter: () => set({ activeCharacterId: null }),

  addCharacter: (character) => {
    set((state) => ({
      characters: { ...state.characters, [character.id]: character }
    }))
    ipcService.save(character.id, character)
  },

  updateCharacter: (id, patch) => {
    set((state) => {
      const updated: Character = { ...state.characters[id], ...patch, updatedAt: new Date().toISOString() }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  deleteCharacter: (id) => {
    ipcService.delete(id)
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
      const ids = await ipcService.list()
      const entries = await Promise.all(
        ids.map(async (id) => {
          const data = await ipcService.load(id)
          if (data == null) return [id, null] as const
          return [id, migrateCharacter(data)] as const
        })
      )
      const characters = Object.fromEntries(
        entries.filter(([, v]) => v != null)
      ) as Record<string, Character>
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

      const newResources = { ...char.resources }
      for (const resDef of cls?.resources ?? []) {
        if (resDef.recoverOn === 'short' && newResources[resDef.name]) {
          newResources[resDef.name] = { ...newResources[resDef.name], used: 0 }
        }
      }

      let newSlots = char.spellSlots
      if (char.classId === 'Warlock') {
        newSlots = Object.fromEntries(
          Object.entries(char.spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
        )
      }

      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        hitPoints: { ...char.hitPoints, current: newCurrentHp },
        hitDiceUsed: newHdUsed,
        resources: newResources,
        spellSlots: newSlots,
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  longRest: (id) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      const recoverHD = Math.max(1, Math.floor(char.level / 2))
      const newHp = { ...char.hitPoints, current: char.hitPoints.max, temp: 0 }
      const newSlots = Object.fromEntries(
        Object.entries(char.spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
      )
      const defaults = getResourceDefaults(char.classId, char.level, char.abilityScores)
      const newResources: Record<string, { used: number; total: number }> = {}
      for (const key of Object.keys(char.resources)) {
        newResources[key] = { ...char.resources[key], used: 0 }
      }
      for (const [key, val] of Object.entries(defaults)) {
        if (!newResources[key]) newResources[key] = val
      }

      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        hitPoints: newHp,
        hitDiceUsed: Math.max(0, char.hitDiceUsed - recoverHD),
        spellSlots: newSlots,
        resources: newResources,
        deathSaves: { successes: 0, failures: 0 },
        concentrationSpellId: null,
        conditionIds: char.conditionIds.filter(c => c.conditionId === 'exhaustion'),
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  levelUp: (id, asiChoice, newSpellIds) => {
    set((state) => {
      const char = state.characters[id]
      if (!char || char.level >= 20) return state
      const newLevel = char.level + 1
      const newProf = profBonus(newLevel)

      let newScores: AbilityScores = { ...char.abilityScores }
      let newFeats: string[] = [...char.feats]
      if (asiChoice) {
        if (asiChoice.type === 'double') {
          newScores = { ...newScores, [asiChoice.ability]: Math.min(20, newScores[asiChoice.ability] + 2) }
        } else if (asiChoice.type === 'split') {
          newScores = {
            ...newScores,
            [asiChoice.ability1]: Math.min(20, newScores[asiChoice.ability1] + 1),
            [asiChoice.ability2]: Math.min(20, newScores[asiChoice.ability2] + 1),
          }
        } else if (asiChoice.type === 'feat') {
          newFeats = [...newFeats, asiChoice.featId]
          if (asiChoice.featAbilityChoice) {
            newScores = { ...newScores, [asiChoice.featAbilityChoice]: Math.min(20, newScores[asiChoice.featAbilityChoice] + 1) }
          }
        }
      }

      const raceBonusHp = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
      const bonusHpPerLevel = raceBonusHp + (newFeats.includes('tough') ? 2 : 0)
      const alertBonus = newFeats.includes('alert') ? 5 : 0
      const mobileBonus = newFeats.includes('mobile') ? 10 : 0

      const newMaxHp = computeMaxHP(char.classId, newLevel, newScores.con, bonusHpPerLevel)
      const hpGain = newMaxHp - char.hitPoints.max
      const newSlots = defaultSpellSlots(char.classId, newLevel)
      const mergedSlots = { ...newSlots }
      for (const [lvl, slot] of Object.entries(char.spellSlots)) {
        if (mergedSlots[Number(lvl)]) {
          mergedSlots[Number(lvl)] = {
            total: mergedSlots[Number(lvl)].total,
            used: Math.min(slot.used, mergedSlots[Number(lvl)].total),
          }
        }
      }

      const newDefaults = getResourceDefaults(char.classId, newLevel, newScores)
      const newResources: Record<string, { used: number; total: number }> = {}
      for (const [key, def] of Object.entries(newDefaults)) {
        const existing = char.resources[key]
        newResources[key] = existing
          ? { used: existing.used, total: def.total }
          : { used: 0, total: def.total }
      }

      const racialSpellsAtLevel = RACE_BY_ID[char.race]?.racialSpells?.[newLevel] ?? []
      const mergedSpellIds = [...new Set([
        ...(newSpellIds ? [...char.spellIds, ...newSpellIds] : char.spellIds),
        ...racialSpellsAtLevel,
      ])]

      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        level: newLevel,
        proficiencyBonus: newProf,
        abilityScores: newScores,
        feats: newFeats,
        bonusHpPerLevel,
        initiative: mod(newScores.dex) + alertBonus,
        speed: mobileBonus > 0 ? computeSpeed(char.race) + mobileBonus : char.speed,
        hitPoints: {
          ...char.hitPoints,
          max: newMaxHp,
          current: Math.min(newMaxHp, char.hitPoints.current + hpGain),
        },
        spellSlots: mergedSlots,
        resources: newResources,
        spellIds: mergedSpellIds,
        completedAsiLevels: asiChoice
          ? [...(char.completedAsiLevels ?? []), newLevel]
          : (char.completedAsiLevels ?? []),
        completedAsiChoices: asiChoice
          ? { ...(char.completedAsiChoices ?? {}), [newLevel]: formatAsiChoice(asiChoice) }
          : (char.completedAsiChoices ?? {}),
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  applyPendingAsi: (id, asiLevel, choice) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state

      let newScores = { ...char.abilityScores }
      let newFeats = [...char.feats]
      if (choice.type === 'double') {
        newScores = { ...newScores, [choice.ability]: Math.min(20, newScores[choice.ability] + 2) }
      } else if (choice.type === 'split') {
        newScores = {
          ...newScores,
          [choice.ability1]: Math.min(20, newScores[choice.ability1] + 1),
          [choice.ability2]: Math.min(20, newScores[choice.ability2] + 1),
        }
      } else if (choice.type === 'feat') {
        newFeats = [...newFeats, choice.featId]
        if (choice.featAbilityChoice) {
          newScores = { ...newScores, [choice.featAbilityChoice]: Math.min(20, newScores[choice.featAbilityChoice] + 1) }
        }
      }

      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        abilityScores: newScores,
        feats: newFeats,
        completedAsiLevels: [...(char.completedAsiLevels ?? []), asiLevel],
        completedAsiChoices: { ...(char.completedAsiChoices ?? {}), [asiLevel]: formatAsiChoice(choice) },
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  setTempHp: (id, amount) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        hitPoints: { ...char.hitPoints, temp: Math.max(0, amount) },
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },
})
