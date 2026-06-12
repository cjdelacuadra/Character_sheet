import type { Character } from '@/entities/character/types'
import { mod, profBonus } from './charCalculations'
import { rollDiceExpr } from '@/shared/lib/diceExpr'

/**
 * Resolves a racial-action formula (e.g. "1d6", "conmod", "level", "prof") to a rolled number.
 * Tokens are substituted then the resulting dice expression is rolled (minimum 0).
 */
export function resolveRacialFormula(
  formula: string,
  char: Pick<Character, 'level' | 'abilityScores'>,
): number {
  const expr = formula
    .replace(/level/gi, String(char.level))
    .replace(/conmod/gi, String(mod(char.abilityScores.con)))
    .replace(/prof/gi, String(profBonus(char.level)))
  return rollDiceExpr(expr)
}

/** Resolves a racial action's max uses ('prof' → proficiency bonus; number → itself; default 1). */
export function resolveRacialMaxUses(maxUses: number | 'prof' | undefined, level: number): number {
  if (maxUses === 'prof') return profBonus(level)
  return maxUses ?? 1
}
