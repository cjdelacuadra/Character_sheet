import type { StateCreator } from 'zustand'
import type { CharacterSlice } from './characterSlice'
import { SPELL_BY_ID, endsAtStartOfNextTurn } from '@/shared/data/spellData'
import { computeACFull } from '@/shared/data/charCalculations'

export type EconomyType = 'action' | 'bonus' | 'reaction'

export interface TurnState {
  actionsUsed: number
  bonusActionsUsed: number
  reactionsUsed: number
  attacksUsed: number
  bonusActions: number
  bonusBonusActions: number
  bonusReactions: number
  usedActionNames: string[]
  endOfTurnSpellIds: string[]
  endOfTurnBuffIds: string[]
  divineStrikeFired: boolean
  movedThisTurn: boolean
  attackedThisTurn: boolean
  advantageNextAttack: 'none' | 'adv' | 'dis'
  speedZeroUntilTurnEnd: boolean
  disengaged: boolean
}

export interface NextTurnDecisions {
  conditionsToDrop: string[]
  dropConcentration: boolean
  dropRage?: boolean
  dropBladesong?: boolean
}

export interface TurnSlice {
  turnStates: Record<string, TurnState>
  getTurnState: (charId: string) => TurnState
  initTurnState: (charId: string) => void
  useEconomy: (charId: string, type: EconomyType) => void
  recoverEconomy: (charId: string, type: EconomyType) => void
  useAttack: (charId: string) => void
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
  markActionUsed: (charId: string, name: string) => void
  unmarkActionUsed: (charId: string, name: string) => void
  confirmNextTurn: (charId: string, decisions: NextTurnDecisions) => void
}

export function makeFreshTurnState(): TurnState {
  return {
    actionsUsed: 0,
    bonusActionsUsed: 0,
    reactionsUsed: 0,
    attacksUsed: 0,
    bonusActions: 0,
    bonusBonusActions: 0,
    bonusReactions: 0,
    usedActionNames: [],
    endOfTurnSpellIds: [],
    endOfTurnBuffIds: [],
    divineStrikeFired: false,
    movedThisTurn: false,
    attackedThisTurn: false,
    advantageNextAttack: 'none',
    speedZeroUntilTurnEnd: false,
    disengaged: false,
  }
}

const USED_FIELD: Record<EconomyType, keyof TurnState> = {
  action: 'actionsUsed',
  bonus: 'bonusActionsUsed',
  reaction: 'reactionsUsed',
}

const BONUS_FIELD: Record<EconomyType, keyof TurnState> = {
  action: 'bonusActions',
  bonus: 'bonusBonusActions',
  reaction: 'bonusReactions',
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

  useEconomy: (charId, type) => {
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

  useAttack: (charId) => {
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

    const charPatch: Partial<typeof char> = {}

    if (decisions.dropConcentration && char.concentrationSpellId) {
      charPatch.concentrationSpellId = null
      charPatch.conditionIds = char.conditionIds.filter(c => c.conditionId !== 'concentration')
      get().clearAllSummons(charId, { concentrationOnly: true })
    }

    if (decisions.conditionsToDrop.length > 0) {
      const baseConds = charPatch.conditionIds ?? char.conditionIds
      charPatch.conditionIds = baseConds.filter(c => !decisions.conditionsToDrop.includes(c.conditionId))
    }

    // Drop active buffs that should end at the start of the next turn: those explicitly
    // registered this turn, OR any active 1-round spell (e.g. Booming Blade) detected by its
    // duration — so 1-turn buffs always clear, regardless of how they were cast.
    const buffs = char.activeBuffSpells ?? []
    const remainingBuffs = buffs.filter(id =>
      !ts.endOfTurnBuffIds.includes(id) && !endsAtStartOfNextTurn(SPELL_BY_ID[id] ?? { duration: '' })
    )
    if (remainingBuffs.length !== buffs.length) {
      charPatch.activeBuffSpells = remainingBuffs
      charPatch.armorClass = computeACFull({ ...char, ...charPatch })
    }

    if (decisions.dropRage && char.isRaging) charPatch.isRaging = false
    if (decisions.dropBladesong && char.isBladesinging) charPatch.isBladesinging = false

    if (Object.keys(charPatch).length > 0) {
      get().updateCharacter(charId, charPatch)
    }

    const nextTs: TurnState = {
      actionsUsed: 0,
      bonusActionsUsed: 0,
      reactionsUsed: 0,
      attacksUsed: 0,
      bonusActions: 0,
      bonusBonusActions: 0,
      bonusReactions: 0,
      usedActionNames: [],
      endOfTurnSpellIds: [],
      endOfTurnBuffIds: [],
      divineStrikeFired: false,
      movedThisTurn: false,
      attackedThisTurn: false,
      advantageNextAttack: 'none',
      speedZeroUntilTurnEnd: false,
      disengaged: false,
    }
    set((state) => ({ turnStates: { ...state.turnStates, [charId]: nextTs } }))
  },
})
