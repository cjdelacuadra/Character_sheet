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
  | 'gloves' | 'quiver' | 'ring' | 'amulet'

export type ShopItemKind = 'armor' | 'shield' | 'weapon' | AccessorySlot

export interface AccessoryStats {
  acBonus?: number
  savingThrowBonus?: Partial<Record<AbilityScore, number>>
  skillBonus?: Partial<Record<Skill, number>>
  advantage?: {
    savingThrows?: AbilityScore[]
    skills?: Skill[]
    deathSaves?: boolean
  }
}
