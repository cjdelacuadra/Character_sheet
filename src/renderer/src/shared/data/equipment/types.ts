import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
export type { AbilityScore, Skill }

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary'

export type ArmorType = 'none' | 'light' | 'medium' | 'heavy'
export type ArmorProficiency = 'light' | 'medium' | 'heavy' | 'shields'

export type WeaponProficiencyCategory = 'Simple' | 'Martial' | 'Unarmed' | 'Natural' | 'Improvised'
export type WeaponRangeType = 'Melee' | 'Ranged' | 'Melee or Ranged'

export type AccessorySlot =
  | 'helmet' | 'necklace' | 'cape' | 'legs' | 'boots'
  | 'gloves' | 'ring' | 'amulet' | 'armor'
  | 'shield' | 'weapon'

export type ShopItemKind = 'armor' | 'shield' | 'weapon' | AccessorySlot

export interface AccessoryStats {
  acBonus?: number
  toHitBonus?: number
  toHitBonusAppliesTo?: 'melee' | 'ranged' | 'both'
  speedBonus?: number
  abilityBonus?: Partial<Record<AbilityScore, number>>
  savingThrowBonus?: Partial<Record<AbilityScore, number>>
  skillBonus?: Partial<Record<Skill, number>>
  advantage?: {
    savingThrows?: AbilityScore[]
    skills?: Skill[]
    deathSaves?: boolean
  }
  bonusDamage?: { flat?: number; dice?: string; dmgType: string; appliesTo?: 'melee' | 'ranged' | 'all' }
  critModifier?: Partial<Record<'melee' | 'ranged' | 'spells' | 'martial' | 'all', number>>
  /** Sets the ability score to this value when the wearer's is lower
   *  (Gauntlets of Ogre Power pattern) — no effect if already ≥. */
  abilitySet?: Partial<Record<AbilityScore, number>>
  /** Extra damage dealt only on a critical hit. */
  critBonusDamage?: { dice?: string; flat?: number; dmgType: string }
}

export interface BaseEquipmentItem {
  id: string
  name: string
  kind: ShopItemKind
  cost: number
  rarity?: ItemRarity
  sprite?: string
  requiresAttunement?: boolean
}

export interface GearEquipmentItem extends BaseEquipmentItem {
  kind: AccessorySlot
  // Armor-specific fields — present only for kind 'armor' | 'shield'
  type?: ArmorType
  baseAC?: number
  dexCap?: number
  stealthDisadvantage?: boolean
  strRequirement?: number
  enchantmentBonus?: number
  // Stat bonuses — available to any gear
  stats?: AccessoryStats
}

export interface WeaponEquipmentItem extends BaseEquipmentItem {
  kind: 'weapon'
  damageDie: string
  damageType: string
  proficiencyCategory: WeaponProficiencyCategory
  rangeType: WeaponRangeType
  properties: string[]
  enchantmentBonus?: number
  enchantment?: string
  enchantments?: string[]
  bonusDamageDie?: string
  bonusDamageType?: string
  isMonkWeapon?: boolean
  toHitDiceCount?: number
  toHitDieType?: number
  toHitFlat?: number
  dmgBonusCount?: number
  dmgBonusDieType?: number
  dmgBonusFlat?: number
  dmgBonusType?: string
  critModifier?: Partial<Record<'melee' | 'ranged' | 'spells' | 'martial' | 'all', number>>
  /** Weapons can carry the same stat block as gear (AC, abilities, skills, …). */
  stats?: AccessoryStats
}

export type EquipmentDef = WeaponEquipmentItem | GearEquipmentItem

export type WeaponDef = WeaponEquipmentItem
export type GearDef = GearEquipmentItem
