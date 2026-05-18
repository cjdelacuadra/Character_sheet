import type { ArmorType, ArmorProficiency, ItemRarity, ArmorEquipmentItem } from './types'
export type { ArmorType, ArmorProficiency, ItemRarity }
export type { ArmorEquipmentItem }
export type ArmorDef = ArmorEquipmentItem

export const ARMOR_LIST: ArmorEquipmentItem[] = [
  // Unarmored
  { id: 'none',          name: 'Unarmored',        kind: 'armor',  type: 'none',   baseAC: 10, cost: 0 },
  // Shields
  { id: 'shield',        name: 'Shield',            kind: 'shield', type: 'none',   baseAC: 0,  cost: 10 },
  { id: 'towerShield',   name: 'Tower Shield',      kind: 'shield', type: 'none',   baseAC: 0,  cost: 20 },
  // Light
  { id: 'padded',        name: 'Padded',            kind: 'armor',  type: 'light',  baseAC: 11, cost: 5,    stealthDisadvantage: true },
  { id: 'leather',       name: 'Leather',           kind: 'armor',  type: 'light',  baseAC: 11, cost: 10 },
  { id: 'studded',       name: 'Studded Leather',   kind: 'armor',  type: 'light',  baseAC: 12, cost: 45 },
  // Medium
  { id: 'hide',          name: 'Hide',              kind: 'armor',  type: 'medium', baseAC: 12, cost: 10,   dexCap: 2, stealthDisadvantage: true },
  { id: 'chainShirt',    name: 'Chain Shirt',       kind: 'armor',  type: 'medium', baseAC: 13, cost: 50,   dexCap: 2 },
  { id: 'scaleMail',     name: 'Scale Mail',        kind: 'armor',  type: 'medium', baseAC: 14, cost: 50,   dexCap: 2, stealthDisadvantage: true },
  { id: 'breastplate',   name: 'Breastplate',       kind: 'armor',  type: 'medium', baseAC: 14, cost: 400,  dexCap: 2 },
  { id: 'halfPlate',     name: 'Half Plate',        kind: 'armor',  type: 'medium', baseAC: 15, cost: 750,  dexCap: 2, stealthDisadvantage: true },
  // Heavy
  { id: 'ringMail',      name: 'Ring Mail',         kind: 'armor',  type: 'heavy',  baseAC: 14, cost: 30,   dexCap: 0, stealthDisadvantage: true },
  { id: 'chainMail',     name: 'Chain Mail',        kind: 'armor',  type: 'heavy',  baseAC: 16, cost: 75,   dexCap: 0, stealthDisadvantage: true, strRequirement: 13 },
  { id: 'splint',        name: 'Splint',            kind: 'armor',  type: 'heavy',  baseAC: 17, cost: 200,  dexCap: 0, stealthDisadvantage: true, strRequirement: 15 },
  { id: 'plate',         name: 'Plate',             kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 1500, dexCap: 0, stealthDisadvantage: true, strRequirement: 15 },
  // Magic — Uncommon (+1)
  { id: 'shield+1',      name: 'Shield +1',         kind: 'shield', type: 'none',   baseAC: 0,  cost: 0, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'leather+1',     name: 'Leather +1',        kind: 'armor',  type: 'light',  baseAC: 11, cost: 0, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'studded+1',     name: 'Studded Leather +1',kind: 'armor',  type: 'light',  baseAC: 12, cost: 0, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'breastplate+1', name: 'Breastplate +1',    kind: 'armor',  type: 'medium', baseAC: 14, cost: 0, dexCap: 2, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'halfPlate+1',   name: 'Half Plate +1',     kind: 'armor',  type: 'medium', baseAC: 15, cost: 0, dexCap: 2, stealthDisadvantage: true, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'ringMail+1',    name: 'Ring Mail +1',      kind: 'armor',  type: 'heavy',  baseAC: 14, cost: 0, dexCap: 0, stealthDisadvantage: true, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'chainMail+1',   name: 'Chain Mail +1',     kind: 'armor',  type: 'heavy',  baseAC: 16, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 13, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'splint+1',      name: 'Splint +1',         kind: 'armor',  type: 'heavy',  baseAC: 17, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'plate+1',       name: 'Plate +1',          kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 1, rarity: 'uncommon' },
  // Magic — Rare (+2)
  { id: 'shield+2',      name: 'Shield +2',         kind: 'shield', type: 'none',   baseAC: 0,  cost: 0, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'studded+2',     name: 'Studded Leather +2',kind: 'armor',  type: 'light',  baseAC: 12, cost: 0, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'breastplate+2', name: 'Breastplate +2',    kind: 'armor',  type: 'medium', baseAC: 14, cost: 0, dexCap: 2, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'halfPlate+2',   name: 'Half Plate +2',     kind: 'armor',  type: 'medium', baseAC: 15, cost: 0, dexCap: 2, stealthDisadvantage: true, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'plate+2',       name: 'Plate +2',          kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 2, rarity: 'rare' },
  // Magic — Very Rare (+3)
  { id: 'shield+3',      name: 'Shield +3',         kind: 'shield', type: 'none',   baseAC: 0,  cost: 0, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'studded+3',     name: 'Studded Leather +3',kind: 'armor',  type: 'light',  baseAC: 12, cost: 0, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'breastplate+3', name: 'Breastplate +3',    kind: 'armor',  type: 'medium', baseAC: 14, cost: 0, dexCap: 2, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'plate+3',       name: 'Plate +3',          kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 3, rarity: 'very rare' },
]

export const ARMOR_BY_ID = Object.fromEntries(ARMOR_LIST.map(a => [a.id, a])) as Record<string, ArmorEquipmentItem>

export function armorAllowed(armorType: ArmorType, proficiencies: ArmorProficiency[]): boolean {
  if (armorType === 'none') return true
  return proficiencies.includes(armorType as ArmorProficiency)
}
