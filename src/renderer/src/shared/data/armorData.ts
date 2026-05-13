export type ArmorType = 'none' | 'light' | 'medium' | 'heavy'
export type ArmorProficiency = 'light' | 'medium' | 'heavy' | 'shields'

export interface ArmorDef {
  id: string
  name: string
  type: ArmorType
  baseAC: number
  /** DEX modifier cap: undefined = full DEX, 0 = no DEX, 2 = max +2 */
  dexCap?: number
  cost?: string
  stealthDisadvantage?: boolean
  /** Minimum STR score required; speed −10 ft if not met */
  strRequirement?: number
  /** +N magic bonus added to AC */
  enchantmentBonus?: number
}

export const ARMOR_LIST: ArmorDef[] = [
  // Unarmored
  { id: 'none',          name: 'Unarmored',        type: 'none',   baseAC: 10 },
  // Light
  { id: 'padded',        name: 'Padded',           type: 'light',  baseAC: 11, stealthDisadvantage: true, cost: '5 gp' },
  { id: 'leather',       name: 'Leather',          type: 'light',  baseAC: 11, cost: '10 gp' },
  { id: 'studded',       name: 'Studded Leather',  type: 'light',  baseAC: 12, cost: '45 gp' },
  // Medium
  { id: 'hide',          name: 'Hide',             type: 'medium', baseAC: 12, dexCap: 2, cost: '10 gp' },
  { id: 'chainShirt',    name: 'Chain Shirt',      type: 'medium', baseAC: 13, dexCap: 2, cost: '50 gp' },
  { id: 'scaleMail',     name: 'Scale Mail',       type: 'medium', baseAC: 14, dexCap: 2, stealthDisadvantage: true, cost: '50 gp' },
  { id: 'breastplate',   name: 'Breastplate',      type: 'medium', baseAC: 14, dexCap: 2, cost: '400 gp' },
  { id: 'halfPlate',     name: 'Half Plate',       type: 'medium', baseAC: 15, dexCap: 2, stealthDisadvantage: true, cost: '750 gp' },
  // Heavy
  { id: 'ringMail',      name: 'Ring Mail',        type: 'heavy',  baseAC: 14, dexCap: 0, stealthDisadvantage: true, cost: '30 gp' },
  { id: 'chainMail',     name: 'Chain Mail',       type: 'heavy',  baseAC: 16, dexCap: 0, stealthDisadvantage: true, cost: '75 gp',     strRequirement: 13 },
  { id: 'splint',        name: 'Splint',           type: 'heavy',  baseAC: 17, dexCap: 0, stealthDisadvantage: true, cost: '200 gp',    strRequirement: 15 },
  { id: 'plate',         name: 'Plate',            type: 'heavy',  baseAC: 18, dexCap: 0, stealthDisadvantage: true, cost: '1,500 gp',  strRequirement: 15 },
  // Magic variants
  { id: 'shield+1',      name: 'Shield +1',        type: 'none',   baseAC: 0,  cost: '—', enchantmentBonus: 1 },
  { id: 'breastplate+1', name: 'Breastplate +1',   type: 'medium', baseAC: 14, dexCap: 2, cost: '—', enchantmentBonus: 1 },
  { id: 'halfPlate+1',   name: 'Half Plate +1',    type: 'medium', baseAC: 15, dexCap: 2, stealthDisadvantage: true, cost: '—', enchantmentBonus: 1 },
  { id: 'ringMail+1',    name: 'Ring Mail +1',     type: 'heavy',  baseAC: 14, dexCap: 0, stealthDisadvantage: true, cost: '—', enchantmentBonus: 1 },
  { id: 'chainMail+1',   name: 'Chain Mail +1',    type: 'heavy',  baseAC: 16, dexCap: 0, stealthDisadvantage: true, cost: '—', strRequirement: 13, enchantmentBonus: 1 },
  { id: 'splint+1',      name: 'Splint +1',        type: 'heavy',  baseAC: 17, dexCap: 0, stealthDisadvantage: true, cost: '—', strRequirement: 15, enchantmentBonus: 1 },
  { id: 'plate+1',       name: 'Plate +1',         type: 'heavy',  baseAC: 18, dexCap: 0, stealthDisadvantage: true, cost: '—', strRequirement: 15, enchantmentBonus: 1 },
]

export const ARMOR_BY_ID = Object.fromEntries(ARMOR_LIST.map(a => [a.id, a])) as Record<string, ArmorDef>

export function armorAllowed(armorType: ArmorType, proficiencies: ArmorProficiency[]): boolean {
  if (armorType === 'none') return true
  return proficiencies.includes(armorType as ArmorProficiency)
}
