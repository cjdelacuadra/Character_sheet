import type { AbilityScores, Character, Equipment } from '@/entities/character/types'
import type { AbilityScore } from './equipment/types'
import type { Skill } from './skills'
import { GEAR_BY_ID } from './equipment/gear'
import { CLASS_BY_ID, HIT_DIE_AVERAGE } from './classData'
import { RACE_BY_ID } from './raceData'
import { SUBCLASS_BY_ID } from './subclassData'
import { SPELL_BY_ID } from './spellData'

export function mod(score: number): number {
  // Guard against undefined/NaN scores (e.g. a partial AbilityScores object) so a missing
  // value yields a neutral +0 instead of a garbage modifier like -5 (= mod(0)).
  if (!Number.isFinite(score)) return 0
  return Math.floor((score - 10) / 2)
}

/**
 * Applies an HP delta with D&D 5e temporary-HP rules and returns the resulting { current, temp }.
 * Damage (delta < 0) is absorbed by temp HP first, which depletes; any overflow spills into real HP.
 * Healing (delta >= 0) goes to real HP only, capped at max. Temp HP never goes below 0; current is [0, max].
 */
export function applyHpDelta(
  hp: { current: number; max: number; temp: number },
  delta: number,
): { current: number; temp: number } {
  if (delta < 0 && hp.temp > 0) {
    const remaining = hp.temp + delta // < 0 means the hit overflowed temp HP into real HP
    if (remaining >= 0) return { current: hp.current, temp: remaining }
    return { current: Math.max(0, hp.current + remaining), temp: 0 }
  }
  return { current: Math.min(hp.max, Math.max(0, hp.current + delta)), temp: hp.temp }
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
  isBladesinging?: boolean
  activeBuffSpells?: string[]
}, abilityBonus?: Partial<Record<AbilityScore, number>>): number {
  const { abilityScores, equipment, classId, race, subclass } = char
  const ab = abilityBonus ?? {}
  const dexMod = mod(abilityScores.dex + (ab.dex ?? 0))
  const conMod = mod(abilityScores.con + (ab.con ?? 0))
  const wisMod = mod(abilityScores.wis + (ab.wis ?? 0))
  const intMod = mod(abilityScores.int + (ab.int ?? 0))
  // Shield adds +2 + enchantment (additive on top of armor, never replaces it)
  const shieldDef = equipment.shieldId ? GEAR_BY_ID[equipment.shieldId] : null
  const shield = shieldDef
    ? (shieldDef.baseAC ?? 2) + (shieldDef.enchantmentBonus ?? 0)
    : equipment.hasShield ? 2 : 0

  // Compute unarmored AC by considering every applicable formula
  // (natural armor, subclass override, Barbarian/Monk unarmored defense) and
  // taking the highest. Per RAW these mechanics don't stack — the player uses
  // whichever yields the best AC.
  const raceDef = RACE_BY_ID[race]
  const subclassDef = subclass ? SUBCLASS_BY_ID[subclass] : undefined
  const unarmoredFormulas: number[] = [10 + dexMod]
  if (raceDef?.naturalAC) unarmoredFormulas.push(raceDef.naturalAC(abilityScores))
  if (subclassDef?.unarmoredAC) unarmoredFormulas.push(subclassDef.unarmoredAC(dexMod, conMod, wisMod))
  if (classId === 'Barbarian') unarmoredFormulas.push(10 + dexMod + conMod)
  else if (classId === 'Monk')  unarmoredFormulas.push(10 + dexMod + wisMod)

  const armorId = equipment.armorId ?? 'none'
  const armor = GEAR_BY_ID[armorId]

  // Mage Armor (and similar AC-setting buffs): while active and wearing no body armor,
  // base AC becomes setsBaseAC + DEX mod. Added to the unarmored formula set so it competes
  // via the usual "best formula wins" max (and is naturally ignored once real armor is worn).
  const noBodyArmor = armorId === 'none' || !armor || armor.baseAC === undefined
  if (noBodyArmor) {
    for (const spellId of char.activeBuffSpells ?? []) {
      const setsBaseAC = SPELL_BY_ID[spellId]?.setsBaseAC
      if (setsBaseAC !== undefined) unarmoredFormulas.push(setsBaseAC + dexMod)
    }
  }

  const unarmoredBase = Math.max(...unarmoredFormulas)
  const unarmoredAC = unarmoredBase + shield

  // Bladesong (Wizard Bladesinger): +INT mod (min +1) to AC while active. Conditions: no
  // medium/heavy armor and no shield. Light armor and one-handed melee are allowed.
  const armorType = armor?.type
  const isLightOrNoArmor = armorId === 'none' || !armor || armorType === 'light'
  const bladesongBonus =
    char.isBladesinging && subclass === 'Bladesinging' && isLightOrNoArmor && shield === 0
      ? Math.max(1, intMod)
      : 0

  if (!armor || armorId === 'none' || armor.baseAC === undefined) return unarmoredAC + bladesongBonus

  // Compute armored AC and return whichever is higher
  const effectiveDex =
    armor.dexCap === undefined ? dexMod :
    armor.dexCap === 0         ? 0      :
    Math.min(dexMod, armor.dexCap)

  const defenseBonus = char.fightingStyle === 'defense' ? 1 : 0
  const armoredAC = armor.baseAC + (armor.enchantmentBonus ?? 0) + effectiveDex + shield + defenseBonus
  return Math.max(unarmoredAC, armoredAC) + bladesongBonus
}

/** Computes race-adjusted speed (class modifications applied separately). */
export function computeSpeed(race: string): number {
  const raceDef = RACE_BY_ID[race]
  return raceDef?.speed ?? 30
}

/** Computes darkvision range from race and subclass (takes the maximum). */
export function computeDarkvision(char: Pick<Character, 'race' | 'subclass'>): number {
  const raceDv = RACE_BY_ID[char.race]?.darkvisionRange ?? 0
  const subclassDv = char.subclass ? SUBCLASS_BY_ID[char.subclass]?.darkvisionRange ?? 0 : 0
  return Math.max(raceDv, subclassDv)
}

/** Base speed + equipment speed bonuses + active subclass buffs (Bladesong). */
export function computeSpeedFull(char: Pick<Character, 'speed' | 'equipment' | 'isBladesinging' | 'subclass'>): number {
  const base = char.speed + computeEquipmentStats(char).speedBonus
  const bladesongBonus = char.isBladesinging && char.subclass === 'Bladesinging' ? 10 : 0
  return base + bladesongBonus
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
  abilityBonus?: Partial<Record<AbilityScore, number>>,
): number {
  const base = mod(abilityScores.dex + (abilityBonus?.dex ?? 0))
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
  toHitBonus: number
  speedBonus: number
  abilityBonus: Partial<Record<AbilityScore, number>>
  savingThrowBonus: Partial<Record<AbilityScore, number>>
  skillBonus: Partial<Record<Skill, number>>
  advantage: { savingThrows: AbilityScore[]; skills: Skill[]; deathSaves: boolean }
  bonusDamage: { flat: number; dice: string[]; dmgType: string; appliesTo: 'melee' | 'ranged' | 'all'; names: string[] }[]
}

export const ZERO_EQUIP_STATS: EquipmentStats = {
  acBonus: 0,
  toHitBonus: 0,
  speedBonus: 0,
  abilityBonus: {},
  savingThrowBonus: {},
  skillBonus: {},
  advantage: { savingThrows: [], skills: [], deathSaves: false },
  bonusDamage: [],
}

const GEAR_SLOTS: Array<keyof Equipment> = [
  'armorId', 'shieldId',
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'quiverId', 'ring1Id', 'ring2Id', 'amuletId',
]

/** Aggregates D&D 5e equipment bonus stats across all equipped gear (armor + accessories). */
export function computeEquipmentStats(char: Pick<Character, 'equipment'>): EquipmentStats {
  const result: EquipmentStats = {
    acBonus: 0,
    toHitBonus: 0,
    speedBonus: 0,
    abilityBonus: {},
    savingThrowBonus: {},
    skillBonus: {},
    advantage: { savingThrows: [], skills: [], deathSaves: false },
    bonusDamage: [],
  }

  for (const slotKey of GEAR_SLOTS) {
    const itemId = char.equipment[slotKey]
    if (!itemId || typeof itemId !== 'string') continue
    const gear = GEAR_BY_ID[itemId]
    if (!gear?.stats) continue
    const s = gear.stats

    if (s.acBonus)     result.acBonus     += s.acBonus
    if (s.toHitBonus)  result.toHitBonus  += s.toHitBonus
    if (s.speedBonus)  result.speedBonus  += s.speedBonus

    if (s.abilityBonus) {
      for (const [ab, val] of Object.entries(s.abilityBonus) as [AbilityScore, number][]) {
        result.abilityBonus[ab] = (result.abilityBonus[ab] ?? 0) + val
      }
    }

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

    if (s.bonusDamage) {
      const { flat = 0, dice, dmgType, appliesTo = 'all' } = s.bonusDamage
      const existing = result.bonusDamage.find(b => b.dmgType === dmgType && b.appliesTo === appliesTo)
      if (existing) {
        existing.flat += flat
        if (dice) existing.dice.push(dice)
        existing.names.push(gear.name)
      } else {
        result.bonusDamage.push({ flat, dice: dice ? [dice] : [], dmgType, appliesTo, names: [gear.name] })
      }
    }
  }

  return result
}

/** Returns the effective value of an ability score after applying equipped accessory bonuses. */
export function effectiveAbilityScore(
  char: Pick<Character, 'abilityScores' | 'equipment'>,
  ability: AbilityScore,
): number {
  const bonus = computeEquipmentStats(char).abilityBonus[ability] ?? 0
  return char.abilityScores[ability] + bonus
}

/** computeAC + accessory acBonus + ability score bonuses from equipment. */
export function computeACFull(char: Character): number {
  const equip = computeEquipmentStats(char)
  return computeAC(char, equip.abilityBonus) + equip.acBonus
}

/** computeInitiative including DEX bonuses from equipped accessories. */
export function computeInitiativeFull(char: Character): number {
  const equip = computeEquipmentStats(char)
  return computeInitiative(
    char.abilityScores, char.classId, char.level,
    char.proficiencyBonus, char.feats, char.subclass, equip.abilityBonus,
  )
}

/** Recomputes the stored derived stats (AC + initiative) together, so neither drifts. */
export function computeDerivedStats(char: Character): { armorClass: number; initiative: number } {
  return {
    armorClass: computeACFull(char),
    initiative: computeInitiativeFull(char),
  }
}
