/**
 * Action-economy rules (unified engine): the per-turn state machine, extracted
 * from turnSlice as pure functions so the slice is a thin store adapter and
 * the transition is unit-testable. One source of truth for the fresh turn
 * state (legacy confirmNextTurn re-inlined it).
 */
import type { Character } from '@/entities/character/types'
import { SPELL_BY_ID, endsAtStartOfNextTurn } from '@/shared/data/spellData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { computeACFull, mod } from '@/shared/data/charCalculations'

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
  dashed: boolean
}

export interface NextTurnDecisions {
  conditionsToDrop: string[]
  dropConcentration: boolean
  dropRage?: boolean
  dropBladesong?: boolean
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
    dashed: false,
  }
}

export const USED_FIELD: Record<EconomyType, 'actionsUsed' | 'bonusActionsUsed' | 'reactionsUsed'> = {
  action: 'actionsUsed',
  bonus: 'bonusActionsUsed',
  reaction: 'reactionsUsed',
}

export const BONUS_FIELD: Record<EconomyType, 'bonusActions' | 'bonusBonusActions' | 'bonusReactions'> = {
  action: 'bonusActions',
  bonus: 'bonusBonusActions',
  reaction: 'bonusReactions',
}

/**
 * The Next Turn transition, pure: computes the character patch (dropped
 * concentration/conditions/expiring buffs, per-turn buff resets, Heroism-style
 * temp HP) and always returns a fresh turn state. `clearConcentrationSummons`
 * is reported so the caller can clear summon state (separate store concern).
 */
export function nextTurnTransition(
  char: Character,
  ts: TurnState,
  decisions: NextTurnDecisions,
): { charPatch: Partial<Character>; nextTurnState: TurnState; clearConcentrationSummons: boolean } {
  const charPatch: Partial<Character> = {}
  let clearConcentrationSummons = false

  if (decisions.dropConcentration && char.concentrationSpellId) {
    const concId = char.concentrationSpellId
    const nextBuffs = (char.activeBuffSpells ?? []).filter(id => id !== concId)
    charPatch.concentrationSpellId = null
    charPatch.conditionIds = char.conditionIds.filter(c => c.conditionId !== 'concentration')
    charPatch.activeBuffSpells = nextBuffs
    charPatch.buffStates = Object.fromEntries(
      Object.entries(char.buffStates ?? {}).filter(([id]) => id !== concId),
    )
    charPatch.armorClass = computeACFull({ ...char, ...charPatch })
    clearConcentrationSummons = true
  }

  if (decisions.conditionsToDrop.length > 0) {
    const baseConds = charPatch.conditionIds ?? char.conditionIds
    charPatch.conditionIds = baseConds.filter(c => !decisions.conditionsToDrop.includes(c.conditionId))
  }

  // Drop buffs that end at the start of the next turn: those registered this
  // turn, plus any 1-round spell detected by duration (e.g. Booming Blade),
  // so 1-turn buffs always clear regardless of how they were cast.
  const buffs = charPatch.activeBuffSpells ?? char.activeBuffSpells ?? []
  const remainingBuffs = buffs.filter(id =>
    !ts.endOfTurnBuffIds.includes(id) && !endsAtStartOfNextTurn(SPELL_BY_ID[id] ?? { duration: '' })
  )
  if (remainingBuffs.length !== buffs.length) {
    charPatch.activeBuffSpells = remainingBuffs
    charPatch.buffStates = Object.fromEntries(
      Object.entries(charPatch.buffStates ?? char.buffStates ?? {}).filter(([id]) => remainingBuffs.includes(id)),
    )
    charPatch.armorClass = computeACFull({ ...char, ...charPatch })
  }

  // Per-turn buff resources become usable again; tempHp buffs apply now.
  const activeBuffs = charPatch.activeBuffSpells ?? char.activeBuffSpells ?? []
  const buffStates = { ...(charPatch.buffStates ?? char.buffStates ?? {}) }
  let buffStatesChanged = false
  for (const id of activeBuffs) {
    const spell = SPELL_BY_ID[id]
    if (!spell?.turnResource) continue
    buffStates[id] = { ...(buffStates[id] ?? {}), perTurnUsed: false }
    buffStatesChanged = true
    if (spell.turnResource.kind === 'tempHp') {
      const cls = CLASS_BY_ID[char.classId]
      const sub = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
      const ability = sub?.spellcastingAbility ?? cls?.spellcastingAbility
      const temp = ability ? Math.max(1, mod(char.abilityScores[ability])) : 1
      charPatch.hitPoints = { ...(charPatch.hitPoints ?? char.hitPoints), temp: Math.max(char.hitPoints.temp, temp) }
    }
  }
  if (buffStatesChanged) charPatch.buffStates = buffStates

  if (decisions.dropRage && char.isRaging) charPatch.isRaging = false
  if (decisions.dropBladesong && char.isBladesinging) charPatch.isBladesinging = false

  return { charPatch, nextTurnState: makeFreshTurnState(), clearConcentrationSummons }
}
