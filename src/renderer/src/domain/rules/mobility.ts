/**
 * Speed rules (unified engine, v14).
 *
 * Folds every active speed effect — buff spells (Longstrider, Haste, Zephyr
 * Strike), equipment, conditions (restrained/grappled multipliers) — through
 * the shared Effect vocabulary, plus turn-state modifiers (Dash, speed-zero).
 * Bladesong's +10 ft applies whenever the toggle is on; availability of the
 * toggle is the UI's concern, never the math's (no class cage).
 */
import type { AbilityScores, ActiveCondition, BuffRuntime, Equipment } from '@/entities/character/types'
import { collectActiveEffects } from '../collect'
import { productOfSpeedMultipliers, sumOf } from '../effects'
import { featureOn, FEATURE_KEYS, type FeatureState } from '../character/schema'

export interface SpeedInput {
  speed: number
  equipment: Equipment
  abilityScores: AbilityScores
  activeBuffSpells?: string[]
  buffStates?: Record<string, BuffRuntime>
  conditionIds?: ActiveCondition[]
  featureState: Record<string, FeatureState>
}

export interface SpeedTurnModifiers {
  /** Dash taken this turn — displayed movement doubles for the turn. */
  dashed?: boolean
  /** Steady Aim etc. — speed is 0 until end of turn. */
  speedZeroUntilTurnEnd?: boolean
}

export function computeSpeed(char: SpeedInput, turn?: SpeedTurnModifiers): number {
  if (turn?.speedZeroUntilTurnEnd) return 0
  const effects = collectActiveEffects(char)
  const bladesongBonus = featureOn(char, FEATURE_KEYS.bladesong) ? 10 : 0
  const base = char.speed + sumOf(effects, 'speedBonus') + bladesongBonus
  const multiplier = productOfSpeedMultipliers(effects) * (turn?.dashed ? 2 : 1)
  return Math.floor(base * multiplier)
}
