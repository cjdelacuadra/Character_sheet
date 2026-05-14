import type { AbilityScores, Character } from '@/entities/character/types'
import type { Skill } from './skills'
import { ARMOR_BY_ID } from './armorData'
import { CLASS_BY_ID, HIT_DIE_AVERAGE } from './classData'
import { RACE_BY_ID } from './raceData'
import { SUBCLASS_BY_ID } from './subclassData'

export function mod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function profBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

/** Computes max HP from class, level, CON modifier, and optional racial bonus HP/level. */
export function computeMaxHP(classId: string, level: number, conScore: number, bonusHpPerLevel = 0): number {
  const cls = CLASS_BY_ID[classId]
  if (!cls) return 1
  const conMod = mod(conScore)
  const hitDie = cls.hitDie
  const avgPerLevel = HIT_DIE_AVERAGE[hitDie]
  // Level 1: max hit die + CON; subsequent levels: average + CON; each level adds racial bonus
  return hitDie + conMod + (level - 1) * (avgPerLevel + conMod) + level * bonusHpPerLevel
}

/** Computes AC from equipment, scores, class, race, and optional subclass. */
export function computeAC(char: Pick<Character, 'abilityScores' | 'equipment' | 'classId' | 'race'> & { subclass?: string }): number {
  const { abilityScores, equipment, classId, race, subclass } = char
  const dexMod = mod(abilityScores.dex)
  const conMod = mod(abilityScores.con)
  const wisMod = mod(abilityScores.wis)
  // Shield adds +2 + enchantment (additive on top of armor, never replaces it)
  const shieldDef = equipment.shieldId ? ARMOR_BY_ID[equipment.shieldId] : null
  const shield = shieldDef
    ? 2 + (shieldDef.enchantmentBonus ?? 0)
    : equipment.hasShield ? 2 : 0

  // Check natural armor first (race-based)
  const raceDef = RACE_BY_ID[race]
  if (raceDef?.naturalAC) {
    return raceDef.naturalAC(abilityScores) + shield
  }

  const armorId = equipment.armorId ?? 'none'
  const armor = ARMOR_BY_ID[armorId]

  if (!armor || armorId === 'none') {
    // Subclass unarmored AC override (e.g. Draconic Bloodline Sorcerer: 13 + DEX)
    const subclassDef = subclass ? SUBCLASS_BY_ID[subclass] : undefined
    if (subclassDef?.unarmoredAC) {
      return subclassDef.unarmoredAC(dexMod, conMod, wisMod) + shield
    }
    // Standard unarmored defense
    let ac = 10 + dexMod
    if (classId === 'Barbarian') ac = 10 + dexMod + conMod
    else if (classId === 'Monk')  ac = 10 + dexMod + wisMod
    return ac + shield
  }

  // Apply DEX cap + enchantment bonus
  const effectiveDex =
    armor.dexCap === undefined ? dexMod :
    armor.dexCap === 0         ? 0      :
    Math.min(dexMod, armor.dexCap)

  return armor.baseAC + (armor.enchantmentBonus ?? 0) + effectiveDex + shield
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
