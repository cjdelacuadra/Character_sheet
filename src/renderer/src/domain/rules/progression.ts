/**
 * Progression rules (unified engine, v14): XP thresholds, known-spell tables,
 * and the derived-stat recompute on level-up.
 *
 * Fixes vs legacy characterSlice.levelUp:
 * - AC/initiative recompute with the FULL updated character (new scores AND
 *   new feats/level) — legacy omitted feats from the AC recompute.
 * - The Mobile feat adds +10 ft to the character's current speed instead of
 *   resetting speed from the race base (which discarded other permanent
 *   speed modifications).
 */
import type { ClassDef } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { computeMaxHP } from '@/shared/data/charCalculations'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { computeAC, type ACInput } from './defense'

// ── XP ───────────────────────────────────────────────────────────────────────

const XP_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000, 8: 34000,
  9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000, 14: 140000,
  15: 165000, 16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
}

export function xpForLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(20, Math.max(1, level))] ?? 0
}

export function xpForNextLevel(level: number): number | null {
  if (level >= 20) return null
  return XP_THRESHOLDS[level + 1] ?? null
}

export function profBonusAt(level: number): number {
  return Math.ceil(level / 4) + 1
}

// ── Known-spell tables ───────────────────────────────────────────────────────

export function spellsKnownAt(level: number, table: Partial<Record<number, number>>): number {
  let count = 0
  for (let l = 1; l <= level; l++) {
    if (table[l] !== undefined) count = table[l]!
  }
  return count
}

export interface SpellLevelUpConfig {
  spellsDelta: number
  cantripsDelta: number
  maxSlotLevel: number
}

export function computeSpellLevelUpConfig(classDef: ClassDef, oldLevel: number, newLevel: number, subclassId?: string): SpellLevelUpConfig {
  const subclassDef = subclassId ? SUBCLASS_BY_ID[subclassId] : undefined
  const knownTable = subclassDef?.spellsKnownTable ?? classDef.spellsKnownTable ?? {}
  const spellsDelta = Math.max(0, spellsKnownAt(newLevel, knownTable) - spellsKnownAt(oldLevel, knownTable))
  const cantripTable = subclassDef?.cantripsKnownTable ?? classDef.cantripsKnownTable ?? {}
  const cantripsDelta = Math.max(0, spellsKnownAt(newLevel, cantripTable) - spellsKnownAt(oldLevel, cantripTable))
  let maxSlotLevel: number
  if (subclassDef?.spellsKnownTable) {
    const slots = defaultSpellSlots(classDef.id, newLevel, subclassId)
    const levels = Object.keys(slots).map(Number)
    maxSlotLevel = levels.length > 0 ? Math.max(...levels) : 1
  } else {
    maxSlotLevel = Math.min(9, Math.ceil(newLevel / 2))
  }
  return { spellsDelta, cantripsDelta, maxSlotLevel }
}

// ── Level-up derived stats ───────────────────────────────────────────────────

export interface LevelUpDerivedInput extends ACInput {
  level: number
  speed: number
  feats: string[]
  hitPoints: { current: number; max: number; temp: number }
}

export interface LevelUpDerived {
  maxHp: number
  hpGain: number
  armorClass: number
  speed: number
  bonusHpPerLevel: number
}

/**
 * Derived stats for a character that has ALREADY had level/scores/feats
 * updated. `newlyGainedFeats` distinguishes one-time grants (Mobile's +10 ft
 * is applied once, additively) from recurring derivations (Tough's +2 HP per
 * level is recomputed from the feat list every time).
 */
export function computeLevelUpDerived(
  char: LevelUpDerivedInput,
  newlyGainedFeats: string[] = [],
): LevelUpDerived {
  const raceBonusHp = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
  const bonusHpPerLevel = raceBonusHp + (char.feats.includes('tough') ? 2 : 0)
  const maxHp = computeMaxHP(char.classId, char.level, char.abilityScores.con, bonusHpPerLevel)
  const hpGain = maxHp - char.hitPoints.max
  const mobileBonus = newlyGainedFeats.includes('mobile') ? 10 : 0
  return {
    maxHp,
    hpGain,
    // Full character: new scores, feats, buffs, conditions all participate.
    armorClass: computeAC(char),
    speed: char.speed + mobileBonus,
    bonusHpPerLevel,
  }
}
