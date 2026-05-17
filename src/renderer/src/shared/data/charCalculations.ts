import type { AbilityScores, Character, Equipment } from '@/entities/character/types'
import type { Skill } from './skills'
import { ARMOR_BY_ID } from './armorData'
import { CLASS_BY_ID, HIT_DIE_AVERAGE } from './classData'
import { RACE_BY_ID } from './raceData'
import { SUBCLASS_BY_ID } from './subclassData'
import { ACCESSORY_BY_ID } from './shopData'
import type { AccessoryStats } from './shopData'

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
export function computeAC(char: Pick<Character, 'abilityScores' | 'equipment' | 'classId' | 'race'> & { subclass?: string; fightingStyle?: string }): number {
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
  attackBonus:  { stab: number; slash: number; crush: number; magic: number; ranged: number }
  defenceBonus: { stab: number; slash: number; crush: number; magic: number; ranged: number }
  other:        { meleeStr: number; rangedStr: number; magicStr: number; prayer: number }
}

const ZERO_ATCK = { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 }
const ZERO_OTHER = { meleeStr: 0, rangedStr: 0, magicStr: 0, prayer: 0 }
export const ZERO_EQUIP_STATS: EquipmentStats = { attackBonus: { ...ZERO_ATCK }, defenceBonus: { ...ZERO_ATCK }, other: { ...ZERO_OTHER } }

// Base defence values per armor ID (before enchantment)
const BASE_DEF: Record<string, { stab: number; slash: number; crush: number; magic: number; ranged: number }> = {
  none:        { stab: 0,  slash: 0,  crush: 0,  magic: 0,  ranged: 0  },
  padded:      { stab: 3,  slash: 3,  crush: 3,  magic: 3,  ranged: 3  },
  leather:     { stab: 5,  slash: 4,  crush: 4,  magic: 3,  ranged: 5  },
  studded:     { stab: 10, slash: 9,  crush: 7,  magic: 3,  ranged: 10 },
  hide:        { stab: 7,  slash: 8,  crush: 10, magic: 0,  ranged: 6  },
  chainShirt:  { stab: 19, slash: 17, crush: 15, magic: -2, ranged: 19 },
  scaleMail:   { stab: 26, slash: 24, crush: 21, magic: -3, ranged: 24 },
  breastplate: { stab: 30, slash: 28, crush: 25, magic: -2, ranged: 26 },
  halfPlate:   { stab: 40, slash: 37, crush: 34, magic: -3, ranged: 34 },
  ringMail:    { stab: 22, slash: 20, crush: 24, magic: -8, ranged: 21 },
  chainMail:   { stab: 35, slash: 33, crush: 30, magic: -8, ranged: 33 },
  splint:      { stab: 58, slash: 56, crush: 52, magic: -8, ranged: 52 },
  plate:       { stab: 82, slash: 80, crush: 72, magic: -6, ranged: 82 },
  shield:      { stab: 12, slash: 13, crush: 14, magic: 8,  ranged: 13 },
}

function addStats(a: EquipmentStats, b: EquipmentStats): EquipmentStats {
  return {
    attackBonus:  { stab: a.attackBonus.stab + b.attackBonus.stab, slash: a.attackBonus.slash + b.attackBonus.slash, crush: a.attackBonus.crush + b.attackBonus.crush, magic: a.attackBonus.magic + b.attackBonus.magic, ranged: a.attackBonus.ranged + b.attackBonus.ranged },
    defenceBonus: { stab: a.defenceBonus.stab + b.defenceBonus.stab, slash: a.defenceBonus.slash + b.defenceBonus.slash, crush: a.defenceBonus.crush + b.defenceBonus.crush, magic: a.defenceBonus.magic + b.defenceBonus.magic, ranged: a.defenceBonus.ranged + b.defenceBonus.ranged },
    other:        { meleeStr: a.other.meleeStr + b.other.meleeStr, rangedStr: a.other.rangedStr + b.other.rangedStr, magicStr: a.other.magicStr + b.other.magicStr, prayer: a.other.prayer + b.other.prayer },
  }
}

function armorStats(itemId: string | null): EquipmentStats {
  if (!itemId) return ZERO_EQUIP_STATS
  const armor = ARMOR_BY_ID[itemId]
  if (!armor) return ZERO_EQUIP_STATS
  const baseId = itemId.replace(/\+\d+$/, '')
  const baseDef = BASE_DEF[baseId] ?? { ...ZERO_ATCK }
  const enc = armor.enchantmentBonus ?? 0
  const encAdd = enc * 4
  return {
    attackBonus: { ...ZERO_ATCK },
    defenceBonus: {
      stab:   baseDef.stab   + encAdd,
      slash:  baseDef.slash  + encAdd,
      crush:  baseDef.crush  + encAdd,
      magic:  baseDef.magic  + (enc > 0 ? enc : 0),
      ranged: baseDef.ranged + encAdd,
    },
    other: { ...ZERO_OTHER },
  }
}

function mergePartialStats(partial: AccessoryStats): EquipmentStats {
  const atk = partial.attackBonus ?? {}
  const def = partial.defenceBonus ?? {}
  const oth = partial.other ?? {}
  return {
    attackBonus:  { stab: atk.stab ?? 0, slash: atk.slash ?? 0, crush: atk.crush ?? 0, magic: atk.magic ?? 0, ranged: atk.ranged ?? 0 },
    defenceBonus: { stab: def.stab ?? 0, slash: def.slash ?? 0, crush: def.crush ?? 0, magic: def.magic ?? 0, ranged: def.ranged ?? 0 },
    other:        { meleeStr: oth.meleeStr ?? 0, rangedStr: oth.rangedStr ?? 0, magicStr: oth.magicStr ?? 0, prayer: oth.prayer ?? 0 },
  }
}

const ACC_SLOTS: Array<keyof Equipment> = [
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'quiverId', 'ring1Id', 'ring2Id', 'amuletId',
]

/** Aggregates OSRS-style equipment bonus stats across all equipped items. */
export function computeEquipmentStats(char: Pick<Character, 'equipment' | 'weapons'>): EquipmentStats {
  let stats = ZERO_EQUIP_STATS
  stats = addStats(stats, armorStats(char.equipment.armorId))
  stats = addStats(stats, armorStats(char.equipment.shieldId))

  for (const w of char.weapons) {
    const enc = w.enchantmentBonus ?? 0
    if (enc === 0) continue
    const isRanged = w.rangeType === 'Ranged'
    const atk = { ...ZERO_ATCK }
    if (isRanged) {
      atk.ranged = enc
    } else {
      switch (w.damageType?.toLowerCase()) {
        case 'piercing':    atk.stab  = enc; break
        case 'slashing':    atk.slash = enc; break
        case 'bludgeoning': atk.crush = enc; break
        default:            atk.slash = enc
      }
    }
    stats = addStats(stats, {
      attackBonus:  atk,
      defenceBonus: { ...ZERO_ATCK },
      other: { meleeStr: isRanged ? 0 : enc, rangedStr: isRanged ? enc : 0, magicStr: 0, prayer: 0 },
    })
  }

  for (const slotKey of ACC_SLOTS) {
    const itemId = char.equipment[slotKey]
    if (!itemId) continue
    const acc = ACCESSORY_BY_ID[itemId]
    if (!acc?.stats) continue
    stats = addStats(stats, mergePartialStats(acc.stats))
  }

  return stats
}
