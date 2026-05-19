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
  | 'gloves' | 'quiver' | 'ring' | 'amulet' | 'armor'
  | 'shield' | 'weapon'

export type ShopItemKind = 'armor' | 'shield' | 'weapon' | AccessorySlot

export interface AccessoryStats {
  acBonus?: number
  abilityBonus?: Partial<Record<AbilityScore, number>>
  savingThrowBonus?: Partial<Record<AbilityScore, number>>
  skillBonus?: Partial<Record<Skill, number>>
  advantage?: {
    savingThrows?: AbilityScore[]
    skills?: Skill[]
    deathSaves?: boolean
  }
  bonusDamage?: { flat?: number; dice?: string; dmgType: string }
}

export interface BaseEquipmentItem {
  id: string
  name: string
  kind: ShopItemKind
  cost: number
  rarity?: ItemRarity
  sprite?: string
}

export interface ArmorEquipmentItem extends BaseEquipmentItem {
  kind: 'armor' | 'shield'
  type: ArmorType
  baseAC: number
  dexCap?: number
  stealthDisadvantage?: boolean
  strRequirement?: number
  enchantmentBonus?: number
}

export interface WeaponEquipmentItem extends BaseEquipmentItem {
  kind: 'weapon'
  damageDie: string
  damageType: string
  proficiencyCategory: WeaponProficiencyCategory
  rangeType: WeaponRangeType
  properties: string[]
  enchantmentBonus?: number
  bonusDamageDie?: string
  bonusDamageType?: string
  isMonkWeapon?: boolean
}

export interface AccessoryEquipmentItem extends BaseEquipmentItem {
  kind: AccessorySlot
  stats?: AccessoryStats
}

export type EquipmentDef = ArmorEquipmentItem | WeaponEquipmentItem | AccessoryEquipmentItem

export type ArmorDef = ArmorEquipmentItem
export type WeaponDef = WeaponEquipmentItem
export type AccessoryDef = AccessoryEquipmentItem
