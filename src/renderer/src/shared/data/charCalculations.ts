import type { AbilityScores, Character } from '@/entities/character/types'
import type { Skill } from './skills'
import { ARMOR_BY_ID } from './armorData'
import { CLASS_BY_ID, HIT_DIE_AVERAGE } from './classData'
import { RACE_BY_ID } from './raceData'

export function mod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function profBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

/** Computes max HP from class, level, and CON modifier. */
export function computeMaxHP(classId: string, level: number, conScore: number): number {
  const cls = CLASS_BY_ID[classId]
  if (!cls) return 1
  const conMod = mod(conScore)
  const hitDie = cls.hitDie
  const avgPerLevel = HIT_DIE_AVERAGE[hitDie]
  // Level 1: max hit die + CON; subsequent levels: average + CON
  return hitDie + conMod + (level - 1) * (avgPerLevel + conMod)
}

/** Computes AC from equipment, scores, class, and race. */
export function computeAC(char: Pick<Character, 'abilityScores' | 'equipment' | 'classId' | 'race'>): number {
  const { abilityScores, equipment, classId, race } = char
  const dexMod = mod(abilityScores.dex)
  const conMod = mod(abilityScores.con)
  const wisMod = mod(abilityScores.wis)
  const shield = equipment.hasShield ? 2 : 0

  // Check natural armor first (race-based)
  const raceDef = RACE_BY_ID[race]
  if (raceDef?.naturalAC) {
    return raceDef.naturalAC(abilityScores) + shield
  }

  const armorId = equipment.armorId ?? 'none'
  const armor = ARMOR_BY_ID[armorId]

  if (!armor || armorId === 'none') {
    // Unarmored defense
    let ac = 10 + dexMod
    if (classId === 'Barbarian') ac = 10 + dexMod + conMod
    else if (classId === 'Monk') ac = 10 + dexMod + wisMod
    return ac + shield
  }

  // Apply DEX cap
  const effectiveDex =
    armor.dexCap === undefined ? dexMod :
    armor.dexCap === 0 ? 0 :
    Math.min(dexMod, armor.dexCap)

  return armor.baseAC + effectiveDex + shield
}

/** Computes race-adjusted speed (class modifications applied separately). */
export function computeSpeed(race: string): number {
  const raceDef = RACE_BY_ID[race]
  return raceDef?.speed ?? 30
}

/** Computes skill check bonus. */
export function skillBonus(
  skill: Skill,
  abilityScore: number,
  proficiency: 'none' | 'proficient' | 'expert',
  profBonusValue: number
): number {
  const base = mod(abilityScore)
  if (proficiency === 'none') return base
  if (proficiency === 'proficient') return base + profBonusValue
  return base + profBonusValue * 2 // expert/expertise
}

/** Saving throw bonus. */
export function savingThrowBonus(
  abilityScore: number,
  isProficient: boolean,
  profBonusValue: number
): number {
  return mod(abilityScore) + (isProficient ? profBonusValue : 0)
}

/** Roll 4d6 drop lowest (simulated). */
export function roll4d6DropLowest(): number {
  const rolls = [0, 0, 0, 0].map(() => Math.ceil(Math.random() * 6))
  rolls.sort((a, b) => a - b)
  return rolls.slice(1).reduce((a, b) => a + b, 0)
}

/** Generate a full set of 6 rolled scores. */
export function rollScoreSet(): number[] {
  return [0, 0, 0, 0, 0, 0].map(roll4d6DropLowest)
}

/** Point buy cost table: score → points spent */
export const POINT_BUY_COST: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
}
export const POINT_BUY_TOTAL = 27
