/**
 * AC rules (unified engine, v14).
 *
 * Replaces the split computeAC/computeACFull pair. All flat AC bonuses —
 * buff spells (Shield, Shield of Faith), gear, conditions — arrive as
 * `acBonus` effects; AC-setting buffs (Mage Armor) arrive as `acBase`
 * formulas that compete in the usual "best unarmored formula wins" set.
 *
 * Unarmored Defense formulas are data here (a const map keyed by classId,
 * defaults per RAW) rather than hardcoded branches; Bladesong applies
 * whenever the toggle is on and its armor conditions hold — availability is
 * the UI's concern (no class cage).
 */
import type { AbilityScores, ActiveCondition, BuffRuntime, Equipment } from '@/entities/character/types'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { dualWielderAcBonus, mod } from '@/shared/data/charCalculations'
import { collectActiveEffects } from '../collect'
import { abilityBonusTotal, acBaseFormulas, sumOf } from '../effects'
import { featureChoice, featureOn, FEATURE_KEYS, type FeatureState } from '../character/schema'

export interface ACInput {
  abilityScores: AbilityScores
  equipment: Equipment
  classId: string
  race: string
  subclass?: string
  activeBuffSpells?: string[]
  buffStates?: Record<string, BuffRuntime>
  conditionIds?: ActiveCondition[]
  featureState: Record<string, FeatureState>
  feats?: string[]
  weapons?: import('@/entities/character/types').Weapon[]
}

/** RAW Unarmored Defense formulas by class (defaults — data, not a gate). */
const UNARMORED_DEFENSE: Record<string, (dex: number, con: number, wis: number) => number> = {
  Barbarian: (dex, con) => 10 + dex + con,
  Monk:      (dex, _con, wis) => 10 + dex + wis,
}

export function computeAC(char: ACInput): number {
  const effects = collectActiveEffects(char)

  const dexMod = mod(char.abilityScores.dex + abilityBonusTotal(effects, 'dex'))
  const conMod = mod(char.abilityScores.con + abilityBonusTotal(effects, 'con'))
  const wisMod = mod(char.abilityScores.wis + abilityBonusTotal(effects, 'wis'))
  const intMod = mod(char.abilityScores.int + abilityBonusTotal(effects, 'int'))

  // Shield: additive on top of armor or unarmored AC, never replaces it.
  const shieldDef = char.equipment.shieldId ? GEAR_BY_ID[char.equipment.shieldId] : null
  const shield = shieldDef
    ? (shieldDef.baseAC ?? 2) + (shieldDef.enchantmentBonus ?? 0)
    : char.equipment.hasShield ? 2 : 0

  // Candidate unarmored formulas — natural armor, subclass override, Unarmored
  // Defense, and acBase buffs (Mage Armor) — best one wins per RAW (no stacking).
  const raceDef = RACE_BY_ID[char.race]
  const subclassDef = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
  const unarmoredFormulas: number[] = [10 + dexMod]
  if (raceDef?.naturalAC) unarmoredFormulas.push(raceDef.naturalAC(char.abilityScores))
  if (subclassDef?.unarmoredAC) unarmoredFormulas.push(subclassDef.unarmoredAC(dexMod, conMod, wisMod))
  const unarmoredDefense = UNARMORED_DEFENSE[char.classId]
  if (unarmoredDefense) unarmoredFormulas.push(unarmoredDefense(dexMod, conMod, wisMod))

  const armorId = char.equipment.armorId ?? 'none'
  const armor = GEAR_BY_ID[armorId]
  const noBodyArmor = armorId === 'none' || !armor || armor.baseAC === undefined
  if (noBodyArmor) {
    for (const formula of acBaseFormulas(effects)) {
      unarmoredFormulas.push(formula.value + (formula.addDex ? dexMod : 0))
    }
  }

  const unarmoredAC = Math.max(...unarmoredFormulas) + shield

  // Bladesong: +INT mod (min +1) while active, no medium/heavy armor, no shield.
  const armorType = armor?.type
  const isLightOrNoArmor = noBodyArmor || armorType === 'light'
  const bladesongBonus =
    featureOn(char, FEATURE_KEYS.bladesong) && isLightOrNoArmor && shield === 0
      ? Math.max(1, intMod)
      : 0

  // All stacking flat bonuses: buffs (Shield/Shield of Faith), gear, conditions.
  const flatBonuses = sumOf(effects, 'acBonus') + dualWielderAcBonus({ feats: char.feats ?? [], weapons: char.weapons ?? [] })

  if (noBodyArmor) return unarmoredAC + bladesongBonus + flatBonuses

  const effectiveDex =
    armor.dexCap === undefined ? dexMod :
    armor.dexCap === 0         ? 0      :
    Math.min(dexMod, armor.dexCap)

  const defenseStyleBonus = featureChoice(char, FEATURE_KEYS.fightingStyle) === 'defense' ? 1 : 0
  const armoredAC = (armor.baseAC ?? 0) + (armor.enchantmentBonus ?? 0) + effectiveDex + shield + defenseStyleBonus

  return Math.max(unarmoredAC, armoredAC) + bladesongBonus + flatBonuses
}
