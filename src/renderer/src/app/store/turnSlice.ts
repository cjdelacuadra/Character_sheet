import type { StateCreator } from 'zustand'
import type { CharacterSlice } from './characterSlice'
import {
  makeFreshTurnState, nextTurnTransition, USED_FIELD, BONUS_FIELD,
  type EconomyType, type NextTurnDecisions, type TurnState,
} from '@/domain/rules/economy'

export { makeFreshTurnState }
export type { EconomyType, NextTurnDecisions, TurnState }

export interface TurnSlice {
  turnStates: Record<string, TurnState>
  getTurnState: (charId: string) => TurnState
  initTurnState: (charId: string) => void
  spendEconomy: (charId: string, type: EconomyType) => void
  recoverEconomy: (charId: string, type: EconomyType) => void
  spendAttack: (charId: string) => void
  recoverAttack: (charId: string) => void
  grantEconomy: (charId: string, type: EconomyType, count?: number) => void
  registerEndOfTurnSpell: (charId: string, spellId: string) => void
  unregisterEndOfTurnSpell: (charId: string, spellId: string) => void
  registerEndOfTurnBuff: (charId: string, spellId: string) => void
  fireDivineStrike: (charId: string) => void
  setMoved: (charId: string, moved: boolean) => void
  setAttacked: (charId: string, attacked: boolean) => void
  setAdvantageNextAttack: (charId: string, state: TurnState['advantageNextAttack']) => void
  setSpeedZero: (charId: string, speedZero: boolean) => void
  setDisengaged: (charId: string, disengaged: boolean) => void
  setDashed: (charId: string, dashed: boolean) => void
  markActionUsed: (charId: string, name: string) => void
  unmarkActionUsed: (charId: string, name: string) => void
  confirmNextTurn: (charId: string, decisions: NextTurnDecisions) => void
}

export const createTurnSlice: StateCreator<CharacterSlice & TurnSlice, [], [], TurnSlice> = (set, get) => ({
  turnStates: {},

  getTurnState: (charId) => {
    return get().turnStates[charId] ?? makeFreshTurnState()
  },

  initTurnState: (charId) => {
    set((state) => ({
      turnStates: { ...state.turnStates, [charId]: makeFreshTurnState() },
    }))
  },

  spendEconomy: (charId, type) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      const field = USED_FIELD[type]
      const next = { ...ts, [field]: (ts[field] as number) + 1 }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  recoverEconomy: (charId, type) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      const field = USED_FIELD[type]
      const cur = ts[field] as number
      if (cur <= 0) return state
      const next = { ...ts, [field]: cur - 1 }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  spendAttack: (charId) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      const next = { ...ts, attacksUsed: ts.attacksUsed + 1 }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  recoverAttack: (charId) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      if (ts.attacksUsed <= 0) return state
      const next = { ...ts, attacksUsed: Math.max(0, ts.attacksUsed - 1) }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  grantEconomy: (charId, type, count = 1) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      const field = BONUS_FIELD[type]
      const next = { ...ts, [field]: (ts[field] as number) + count }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  registerEndOfTurnSpell: (charId, spellId) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      if (ts.endOfTurnSpellIds.includes(spellId)) return state
      const next = { ...ts, endOfTurnSpellIds: [...ts.endOfTurnSpellIds, spellId] }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  unregisterEndOfTurnSpell: (charId, spellId) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      if (!ts.endOfTurnSpellIds.includes(spellId)) return state
      const next = { ...ts, endOfTurnSpellIds: ts.endOfTurnSpellIds.filter(id => id !== spellId) }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  registerEndOfTurnBuff: (charId, spellId) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      if (ts.endOfTurnBuffIds.includes(spellId)) return state
      const next = { ...ts, endOfTurnBuffIds: [...ts.endOfTurnBuffIds, spellId] }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  fireDivineStrike: (charId) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      const next = { ...ts, divineStrikeFired: true }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  setMoved: (charId, moved) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      return { turnStates: { ...state.turnStates, [charId]: { ...ts, movedThisTurn: moved } } }
    })
  },

  setAttacked: (charId, attacked) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      return { turnStates: { ...state.turnStates, [charId]: { ...ts, attackedThisTurn: attacked } } }
    })
  },

  setAdvantageNextAttack: (charId, advState) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      return { turnStates: { ...state.turnStates, [charId]: { ...ts, advantageNextAttack: advState } } }
    })
  },

  setSpeedZero: (charId, speedZero) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      return { turnStates: { ...state.turnStates, [charId]: { ...ts, speedZeroUntilTurnEnd: speedZero } } }
    })
  },

  setDisengaged: (charId, disengaged) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      return { turnStates: { ...state.turnStates, [charId]: { ...ts, disengaged } } }
    })
  },

  setDashed: (charId, dashed) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      return { turnStates: { ...state.turnStates, [charId]: { ...ts, dashed } } }
    })
  },

  markActionUsed: (charId, name) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      if (ts.usedActionNames.includes(name)) return state
      const next = { ...ts, usedActionNames: [...ts.usedActionNames, name] }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  unmarkActionUsed: (charId, name) => {
    set((state) => {
      const ts = state.turnStates[charId] ?? makeFreshTurnState()
      const next = { ...ts, usedActionNames: ts.usedActionNames.filter(n => n !== name) }
      return { turnStates: { ...state.turnStates, [charId]: next } }
    })
  },

  confirmNextTurn: (charId, decisions) => {
    const char = get().characters[charId]
    const ts = get().turnStates[charId] ?? makeFreshTurnState()
    if (!char) return

    const { charPatch, nextTurnState, clearConcentrationSummons } = nextTurnTransition(char, ts, decisions)

    if (clearConcentrationSummons) get().clearAllSummons(charId, { concentrationOnly: true })
    if (Object.keys(charPatch).length > 0) get().updateCharacter(charId, charPatch)
    set((state) => ({ turnStates: { ...state.turnStates, [charId]: nextTurnState } }))
  },
})
