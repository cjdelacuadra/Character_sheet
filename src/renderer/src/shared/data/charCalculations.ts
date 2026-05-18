import type { AbilityScores, Character, Equipment } from '@/entities/character/types'
import type { AbilityScore } from './equipment/types'
import type { Skill } from './skills'
import { ARMOR_BY_ID } from './equipment/armor'
import { CLASS_BY_ID, HIT_DIE_AVERAGE } from './classData'
import { RACE_BY_ID } from './raceData'
import { SUBCLASS_BY_ID } from './subclassData'
import { ACCESSORY_BY_ID } from './equipment/accessories'

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

/** Computes AC from equipment, scores, class, race, and optional subclass/fightingStyle. */
export function computeAC(char: {
  abilityScores: AbilityScores
  equipment: Pick<Equipment, 'armorId' | 'shieldId' | 'hasShield'>
  classId: string
  race: string
  subclass?: string
  fightingStyle?: string
}): number {
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

  const defenseBonus = char.fightingStyle === 'defense' ? 1 : 0
  return armor.baseAC + (armor.enchantmentBonus ?? 0) + effectiveDex + shield + defenseBonus
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

/**
 * Computes initiative modifier including feat and class feature bonuses.
 * - Alert: +5
 * - Bard level 2+: Jack of All Trades (floor(prof/2))
 * - Champion Fighter level 7+: Remarkable Athlete (ceil(prof/2))
 */
export function computeInitiative(
  abilityScores: Pick<AbilityScores, 'dex'>,
  classId: string,
  level: number,
  profBonusValue: number,
  feats: string[],
  subclass?: string,
): number {
  const base = mod(abilityScores.dex)
  const alertBonus = feats.includes('alert') ? 5 : 0
  const jackBonus = classId === 'Bard' && level >= 2 ? Math.floor(profBonusValue / 2) : 0
  const remarkableBonus = classId === 'Fighter' && subclass === 'Champion' && level >= 7 ? Math.ceil(profBonusValue / 2) : 0
  return base + alertBonus + Math.max(jackBonus, remarkableBonus)
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

// ─── Equipment Stats ────────────────────────────────────────────────────────

export interface EquipmentStats {
  acBonus: number
  savingThrowBonus: Partial<Record<AbilityScore, number>>
  skillBonus: Partial<Record<Skill, number>>
  advantage: { savingThrows: AbilityScore[]; skills: Skill[]; deathSaves: boolean }
}

export const ZERO_EQUIP_STATS: EquipmentStats = {
  acBonus: 0,
  savingThrowBonus: {},
  skillBonus: {},
  advantage: { savingThrows: [], skills: [], deathSaves: false },
}

const ACC_SLOTS: Array<keyof Equipment> = [
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'quiverId', 'ring1Id', 'ring2Id', 'amuletId',
]

/** Aggregates D&D 5e equipment bonus stats across all equipped accessories. */
export function computeEquipmentStats(char: Pick<Character, 'equipment'>): EquipmentStats {
  const result: EquipmentStats = {
    acBonus: 0,
    savingThrowBonus: {},
    skillBonus: {},
    advantage: { savingThrows: [], skills: [], deathSaves: false },
  }

  for (const slotKey of ACC_SLOTS) {
    const itemId = char.equipment[slotKey]
    if (!itemId || typeof itemId !== 'string') continue
    const acc = ACCESSORY_BY_ID[itemId]
    if (!acc?.stats) continue
    const s = acc.stats

    if (s.acBonus) result.acBonus += s.acBonus

    if (s.savingThrowBonus) {
      for (const [ab, val] of Object.entries(s.savingThrowBonus) as [AbilityScore, number][]) {
        result.savingThrowBonus[ab] = (result.savingThrowBonus[ab] ?? 0) + val
      }
    }
    if (s.skillBonus) {
      for (const [sk, val] of Object.entries(s.skillBonus) as [Skill, number][]) {
        result.skillBonus[sk] = (result.skillBonus[sk] ?? 0) + val
      }
    }
    for (const st of s.advantage?.savingThrows ?? []) {
      if (!result.advantage.savingThrows.includes(st)) result.advantage.savingThrows.push(st)
    }
    for (const sk of s.advantage?.skills ?? []) {
      if (!result.advantage.skills.includes(sk)) result.advantage.skills.push(sk)
    }
    if (s.advantage?.deathSaves) result.advantage.deathSaves = true
  }

  return result
}
