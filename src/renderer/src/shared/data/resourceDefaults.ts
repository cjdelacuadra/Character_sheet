import type { AbilityScores } from '@/entities/character/types'
import { CLASS_BY_ID } from './classData'
import { mod, profBonus } from './charCalculations'

function resolveTotal(
  scalingPer: string | undefined,
  scalingTable: Record<number, number> | undefined,
  fixedTotal: number | undefined,
  level: number,
  abilityScores: AbilityScores
): number {
  // Explicit per-level table wins
  if (scalingTable) {
    let best = 0
    for (let l = 1; l <= level; l++) {
      if (scalingTable[l] !== undefined) best = scalingTable[l]
    }
    return best
  }
  if (fixedTotal !== undefined) return fixedTotal
  if (scalingPer === 'level') return level
  if (scalingPer === 'chamod') return Math.max(1, mod(abilityScores.cha) + 1)
  if (scalingPer === 'wismod') return Math.max(1, mod(abilityScores.wis) + 1)
  if (scalingPer === 'conmod') return Math.max(1, mod(abilityScores.con) + 1)
  if (scalingPer === 'intmod') return Math.max(1, mod(abilityScores.int))
  return 1
}

export function getResourceDefaults(
  classId: string,
  level: number,
  abilityScores: AbilityScores,
  subclassId?: string
): Record<string, { used: number; total: number }> {
  const cls = CLASS_BY_ID[classId]
  const result: Record<string, { used: number; total: number }> = {}
  for (const res of cls?.resources ?? []) {
    if (res.minLevel && level < res.minLevel) continue
    const total = resolveTotal(
      res.scalingPer,
      res.scalingTable as Record<number, number> | undefined,
      res.fixedTotal,
      level,
      abilityScores
    )
    if (total > 0) result[res.name] = { used: 0, total }
  }
  // Subclass-gated resource seeded here because ResourceDef has no subclass gate.
  if (classId === 'Fighter' && subclassId === 'PsiWarrior' && level >= 3) {
    result['Psionic Energy'] = { used: 0, total: 2 * profBonus(level) }
  }
  if (classId === 'Sorcerer' && subclassId === 'WildMagicSorcerer' && level >= 1) {
    result['Tides of Chaos'] = { used: 0, total: 1 }
  }
  return result
}
