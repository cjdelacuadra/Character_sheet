import type { AccessorySlot, AccessoryStats, ItemRarity, GearEquipmentItem, ArmorType, ArmorProficiency } from './types'
export type { AccessorySlot, AccessoryStats, ItemRarity }
export type { GearEquipmentItem, ArmorType, ArmorProficiency }
export type GearDef = GearEquipmentItem

export function armorAllowed(armorType: ArmorType, proficiencies: ArmorProficiency[]): boolean {
  if (armorType === 'none') return true
  return proficiencies.includes(armorType as ArmorProficiency)
}

export function isArmorKind(kind: string): boolean {
  return kind === 'armor' || kind === 'shield'
}

const S = '/assets/'
const A = '/assets/armor/'

// ── Gear: armor, shields, and worn accessories ────────────────────────────────

export let GEAR: GearEquipmentItem[] = [
  // ── Armor & Shields ─────────────────────────────────────────────────────────
  // Unarmored / Shields
  { id: 'none',          name: 'Unarmored',          kind: 'armor',  type: 'none',   baseAC: 10, cost: 0 },
  { id: 'shield',        name: 'Shield',              kind: 'shield', type: 'none',   baseAC: 2,  cost: 10 },
  { id: 'demon-shield',        name: 'Demon Shield',        kind: 'shield', type: 'none',   baseAC: 2,  cost: 10 , sprite: `${A}demon shield.png` },
  { id: 'dragon-shield',        name: 'Dragon Shield',       kind: 'shield', type: 'none',   baseAC: 2,  cost: 10 , sprite: `${A}dragon shield.png` },
  { id: 'mastermind-shield',    name: 'Mastermind Shield',   kind: 'shield', type: 'none',   baseAC: 2,  cost: 10 , sprite: `${A}mastermind shield.png` },
  { id: 'tower-shield',         name: 'Tower Shield',        kind: 'shield', type: 'none',   baseAC: 2,  cost: 10 , sprite: `${A}tower shield.png` },
  { id: 'medusa-shield',        name: 'Medusa Shield',       kind: 'shield', type: 'none',   baseAC: 2,  cost: 10 , sprite: `${A}medusa shield.png` },
  { id: 'towerShield',   name: 'Tower Shield (Heavy)', kind: 'shield', type: 'none',   baseAC: 2,  cost: 20 , sprite: `${A}tower shield.png` },
  // Light
  { id: 'padded',        name: 'Padded',              kind: 'armor',  type: 'light',  baseAC: 11, cost: 5,    stealthDisadvantage: true },
  { id: 'leather',       name: 'Leather',             kind: 'armor',  type: 'light',  baseAC: 11, cost: 10 , sprite: `${A}leather armor.png` },
  { id: 'studded',       name: 'Studded Leather',     kind: 'armor',  type: 'light',  baseAC: 12, cost: 45 },
  // Medium
  { id: 'hide',          name: 'Hide',                kind: 'armor',  type: 'medium', baseAC: 12, cost: 10,   dexCap: 2, stealthDisadvantage: true },
  { id: 'chainShirt',    name: 'Chain Shirt',         kind: 'armor',  type: 'medium', baseAC: 13, cost: 50,   dexCap: 2 },
  { id: 'scaleMail',     name: 'Scale Mail',          kind: 'armor',  type: 'medium', baseAC: 14, cost: 50,   dexCap: 2, stealthDisadvantage: true },
  { id: 'breastplate',   name: 'Breastplate',         kind: 'armor',  type: 'medium', baseAC: 14, cost: 400,  dexCap: 2 },
  { id: 'halfPlate',     name: 'Half Plate',          kind: 'armor',  type: 'medium', baseAC: 15, cost: 750,  dexCap: 2, stealthDisadvantage: true },
  // Heavy
  { id: 'ringMail',      name: 'Ring Mail',           kind: 'armor',  type: 'heavy',  baseAC: 14, cost: 30,   dexCap: 0, stealthDisadvantage: true },
  { id: 'chainMail',     name: 'Chain Mail',          kind: 'armor',  type: 'heavy',  baseAC: 16, cost: 75,   dexCap: 0, stealthDisadvantage: true, strRequirement: 13 },
  { id: 'splint',        name: 'Splint',              kind: 'armor',  type: 'heavy',  baseAC: 17, cost: 200,  dexCap: 0, stealthDisadvantage: true, strRequirement: 15 },
  { id: 'plate',         name: 'Plate',               kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 1500, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, sprite: `${A}plate armor.png` },
  // Magic — Uncommon (+1)
  { id: 'shield+1',      name: 'Shield +1',           kind: 'shield', type: 'none',   baseAC: 2,  cost: 1000, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'leather+1',     name: 'Leather +1',          kind: 'armor',  type: 'light',  baseAC: 11, cost: 1, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'studded+1',     name: 'Studded Leather +1',  kind: 'armor',  type: 'light',  baseAC: 12, cost: 1, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'breastplate+1', name: 'Breastplate +1',      kind: 'armor',  type: 'medium', baseAC: 14, cost: 1, dexCap: 2, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'halfPlate+1',   name: 'Half Plate +1',       kind: 'armor',  type: 'medium', baseAC: 15, cost: 1, dexCap: 2, stealthDisadvantage: true, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'ringMail+1',    name: 'Ring Mail +1',        kind: 'armor',  type: 'heavy',  baseAC: 14, cost: 1, dexCap: 0, stealthDisadvantage: true, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'chainMail+1',   name: 'Chain Mail +1',       kind: 'armor',  type: 'heavy',  baseAC: 16, cost: 1, dexCap: 0, stealthDisadvantage: true, strRequirement: 13, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'splint+1',      name: 'Splint +1',           kind: 'armor',  type: 'heavy',  baseAC: 17, cost: 1, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'plate+1',       name: 'Plate +1',            kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 1, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 1, rarity: 'uncommon' , sprite: `${A}knight plate armor.png` },
  // Magic — Rare (+2)
  { id: 'shield+2',      name: 'Shield +2',           kind: 'shield', type: 'none',   baseAC: 2,  cost: 1, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'studded+2',     name: 'Studded Leather +2',  kind: 'armor',  type: 'light',  baseAC: 12, cost: 1, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'breastplate+2', name: 'Breastplate +2',      kind: 'armor',  type: 'medium', baseAC: 14, cost: 1, dexCap: 2, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'halfPlate+2',   name: 'Half Plate +2',       kind: 'armor',  type: 'medium', baseAC: 15, cost: 1, dexCap: 2, stealthDisadvantage: true, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'plate+2',       name: 'Plate +2',            kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 1, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 2, rarity: 'rare' , sprite: `${A}golden plate armor.png` },
  // Magic — Very Rare (+3)
  { id: 'shield+3',      name: 'Shield +3',           kind: 'shield', type: 'none',   baseAC: 2,  cost: 1, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'studded+3',     name: 'Studded Leather +3',  kind: 'armor',  type: 'light',  baseAC: 12, cost: 1, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'breastplate+3', name: 'Breastplate +3',      kind: 'armor',  type: 'medium', baseAC: 14, cost: 1, dexCap: 2, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'plate+3',       name: 'Plate +3',            kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 1, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 3, rarity: 'very rare' , sprite: `${A}magic plate armor.png` },

  // ── Helmets ─────────────────────────────────────────────────────────────────
  { id: 'iron-med-helm',      name: 'Iron Med Helm',       kind: 'helmet', cost: 14,   rarity: 'common',    sprite: `${S}Iron_med_helm.png` },
  { id: 'steel-med-helm',     name: 'Steel Med Helm',      kind: 'helmet', cost: 35,   rarity: 'common',    sprite: `${S}Steel_med_helm.png` },
  { id: 'steel-helmet',  name: 'Steel Helmet',   kind: 'helmet', cost: 2,  rarity: 'uncommon',  sprite: `${A}steel helmet.png`,
    stats: { acBonus: 1 } },
  { id: 'knight-helmet',     name: 'Knight Helmet',      kind: 'helmet', cost: 3, rarity: 'uncommon',  sprite: `${A}knight helmet.png`,
    stats: { acBonus: 1 } },
  { id: 'golden-helmet',      name: 'Golden Helmet',       kind: 'helmet', cost: 5, rarity: 'rare',  sprite: `${A}golden helmet.png`,
    stats: { acBonus: 2 } },

  // ── Capes ───────────────────────────────────────────────────────────────────
  { id: 'movility-cape',  name: 'Movility Cape',    kind: 'cape', cost: 10,   rarity: 'legendary', sprite: `${S}Infernal_cape.png`,
    requiresAttunement: true, stats: { abilityBonus: { dex: 2 } } },
  { id: 'obsidian-cape',  name: 'Obsidian Cape',    kind: 'cape', cost: 2000, rarity: 'uncommon',  sprite: `${S}Obsidian_cape.png`,
    stats: { acBonus: 1 } },
  { id: 'fire-cape',      name: 'Fire Cape',        kind: 'cape', cost: 0,    rarity: 'rare',      sprite: `${S}Fire_cape.png`,
    requiresAttunement: true, stats: { acBonus: 1, savingThrowBonus: { dex: 1 } } },
  { id: 'infernal-cape',  name: 'Infernal Cape',    kind: 'cape', cost: 0,    rarity: 'legendary', sprite: `${S}Infernal_cape.png`,
    requiresAttunement: true, stats: { acBonus: 2, savingThrowBonus: { dex: 2, con: 1 } } },

  // ── Amulets ─────────────────────────────────────────────────────────────────
  { id: 'amulet-of-power',    name: 'Amulet of Power',    kind: 'amulet', cost: 300,   rarity: 'uncommon',  sprite: `${S}Amulet_of_power.png`,
    requiresAttunement: true, stats: { savingThrowBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } } },
  { id: 'amulet-of-strength', name: 'Amulet of Strength', kind: 'amulet', cost: 150,   rarity: 'uncommon',  sprite: `${S}Amulet_of_strength.png`,
    requiresAttunement: true, stats: { skillBonus: { athletics: 2 } } },
  { id: 'amulet-of-glory',    name: 'Amulet of Glory',    kind: 'amulet', cost: 800,   rarity: 'rare',      sprite: `${S}Amulet_of_glory.png`,
    requiresAttunement: true, stats: { skillBonus: { perception: 2, persuasion: 2 } } },
  { id: 'amulet-of-torture',  name: 'Amulet of Torture',  kind: 'amulet', cost: 0,     rarity: 'legendary', sprite: `${S}Amulet_of_torture.png`,
    requiresAttunement: true, stats: { savingThrowBonus: { str: 2 }, skillBonus: { athletics: 3 } } },
  { id: 'necklace-of-anguish', name: 'Necklace of Anguish', kind: 'amulet', cost: 0,   rarity: 'legendary', sprite: `${S}Necklace_of_anguish.png`,
    requiresAttunement: true, stats: { skillBonus: { perception: 3 }, advantage: { skills: ['perception'] } } },

  // ── Necklaces ───────────────────────────────────────────────────────────────
  { id: 'pearl-necklace', name: 'Pearl Necklace', kind: 'necklace', cost: 50,  rarity: 'common',
    stats: { advantage: { savingThrows: ['wis'] } } },
  { id: 'ruby-necklace',  name: 'Ruby Necklace',  kind: 'necklace', cost: 200, rarity: 'uncommon',
    requiresAttunement: true, stats: { savingThrowBonus: { int: 2 } } },

  // ── Gloves ──────────────────────────────────────────────────────────────────
  { id: 'leather-gloves',    name: 'Leather Gloves',      kind: 'gloves', cost: 1,    rarity: 'common',    sprite: `${S}Leather_gloves.png` },
  { id: 'rune-gloves',       name: 'Rune Gloves',         kind: 'gloves', cost: 750,  rarity: 'uncommon',  sprite: `${S}Rune_gloves.png`,
    requiresAttunement: true, stats: { skillBonus: { athletics: 2, sleightOfHand: 1 } } },
  { id: 'barrows-gloves',    name: 'Barrows Gloves',      kind: 'gloves', cost: 0,    rarity: 'rare',      sprite: `${S}Barrows_gloves.png`,
    requiresAttunement: true, stats: { acBonus: 1, skillBonus: { athletics: 2 } } },
  { id: 'void-mage-gloves',  name: 'Void Mage Gloves',   kind: 'gloves', cost: 0,    rarity: 'rare',
    requiresAttunement: true, stats: { skillBonus: { arcana: 2 } } },
  { id: 'void-range-gloves', name: 'Void Ranger Gloves', kind: 'gloves', cost: 0,    rarity: 'rare',
    requiresAttunement: true, stats: { skillBonus: { stealth: 2 } } },

  // ── Boots ───────────────────────────────────────────────────────────────────
  { id: 'leather-boots',    name: 'Leather Boots',    kind: 'boots', cost: 1,    rarity: 'common',    sprite: `${S}Leather_boots.png` },
  { id: 'snakeskin-boots',  name: 'Snakeskin Boots',  kind: 'boots', cost: 250,  rarity: 'uncommon',  sprite: `${S}Snakeskin_boots.png`,
    stats: { skillBonus: { stealth: 2 } } },
  { id: 'dragon-boots',     name: 'Dragon Boots',     kind: 'boots', cost: 3000, rarity: 'rare',      sprite: `${A}dragon boots.png`,
    requiresAttunement: true, stats: { acBonus: 1 } },
  { id: 'primordial-boots', name: 'Primordial Boots', kind: 'boots', cost: 0,    rarity: 'legendary', sprite: `${S}Primordial_boots.png`,
    requiresAttunement: true, stats: { acBonus: 2, skillBonus: { athletics: 2 } } },
  { id: 'steel-plate-boots', name: 'Steel Plate Boots', kind: 'boots', cost: 1,    rarity: 'legendary', sprite: `${A}steel plate boots.png`,
    requiresAttunement: true, stats: { acBonus: 2, skillBonus: { athletics: 2 } } },
  { id: 'boots-of-haste', name: 'Boots of Haste', kind: 'boots', cost: 1,    rarity: 'legendary', sprite: `${A}boots of haste.png`,
    requiresAttunement: true, stats: { acBonus: 2, advantage: { savingThrows: ['dex'] } } },
  { id: 'golden-boots', name: 'Golden Boots', kind: 'boots', cost: 1,    rarity: 'legendary', sprite: `${A}golden boots.png`,
    requiresAttunement: true, stats: { acBonus: 2, skillBonus: { athletics: 2 } } },

  // ── Legs ────────────────────────────────────────────────────────────────────
  { id: 'leather-legs',      name: 'Leather Legs',       kind: 'legs', cost: 4,    rarity: 'common',    sprite: `${A}leather legs.png` },
  { id: 'steel-plate-legs', name: 'Steel Plate Legs', kind: 'legs', cost: 1,   rarity: 'legendary', sprite: `${A}steel plate legs.png`,
    requiresAttunement: true, stats: { advantage: { savingThrows: ['con'] } } },
  { id: 'knight-legs', name: 'Knight Legs', kind: 'legs', cost: 1,   rarity: 'legendary', sprite: `${A}knight legs.png`,
    requiresAttunement: true, stats: { advantage: { savingThrows: ['dex', 'con'] } } },
  { id: 'golden-legs', name: 'Golden Legs', kind: 'legs', cost: 1 ,   rarity: 'legendary', sprite: `${A}golden legs.png`,
    requiresAttunement: true, stats: { acBonus: 1, advantage: { savingThrows: ['con'] } } },

  // ── Rings ───────────────────────────────────────────────────────────────────
  { id: 'ring-of-recoil',   name: 'Ring of Recoil',     kind: 'ring', cost: 50,   rarity: 'common',    sprite: `${S}Ring_of_recoil.png` },
  { id: 'ring-of-fire-damage',     name: 'Ring of Fire (Damage)',     kind: 'ring', cost: 50,  rarity: 'uncommon',  sprite: `${S}Ring_of_life.png`,
    requiresAttunement: true, stats: { bonusDamage: { flat: 2, dmgType: 'fire', appliesTo: 'melee' } } },
  { id: 'shocking-ring',     name: 'Shocking Ring',     kind: 'ring', cost: 50,  rarity: 'uncommon',  sprite: `${S}Ring_of_life.png`,
    requiresAttunement: true, stats: { bonusDamage: { dice: '1d6', dmgType: 'lightning', appliesTo: 'melee' } } },
  { id: 'ring-of-fire',     name: 'Ring of Fire',       kind: 'ring', cost: 500,  rarity: 'uncommon',  sprite: `${S}Ring_of_life.png`,
    requiresAttunement: true, stats: { savingThrowBonus: { con: 1 } } },
  { id: 'ring-of-life',     name: 'Ring of Life',       kind: 'ring', cost: 500,  rarity: 'uncommon',  sprite: `${S}Ring_of_life.png`,
    requiresAttunement: true, stats: { advantage: { deathSaves: true } } },
  { id: 'berserker-ring',   name: 'Berserker Ring',     kind: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Berserker_ring.png`,
    requiresAttunement: true, stats: { skillBonus: { athletics: 2 } } },
  { id: 'archer-ring',      name: "Archer's Ring",      kind: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Archers_ring.png`,
    requiresAttunement: true, stats: { skillBonus: { stealth: 2 } } },
  { id: 'seers-ring',       name: "Seer's Ring",        kind: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Seers_ring.png`,
    requiresAttunement: true, stats: { skillBonus: { arcana: 2 } } },
  { id: 'berserker-ring-i', name: 'Berserker Ring (i)', kind: 'ring', cost: 0,    rarity: 'legendary', sprite: `${S}Berserker_ring_(i).png`,
    requiresAttunement: true, stats: { acBonus: 1, skillBonus: { athletics: 4 } } },
  { id: 'ring-of-sharpness', name: 'Ring of Sharpness', kind: 'ring', cost: 2000, rarity: 'rare', sprite: `${S}Ring_of_life.png`,
    requiresAttunement: true, stats: { critModifier: { all: 1 } } },
  { id: 'ring-of-precision', name: 'Ring of Precision', kind: 'ring', cost: 5000, rarity: 'very rare', sprite: `${S}Ring_of_life.png`,
    requiresAttunement: true, stats: { critModifier: { melee: 1, ranged: 1 } } },
]

export let GEAR_BY_ID: Record<string, GearEquipmentItem> =
  Object.fromEntries(GEAR.map(g => [g.id, g]))

/** Armor and shields only — derived view for armor-picker UIs. */
export function armorAndShields(): GearEquipmentItem[] {
  return GEAR.filter(g => isArmorKind(g.kind))
}

export function setGearData(items: GearEquipmentItem[]): void {
  GEAR = items
  GEAR_BY_ID = Object.fromEntries(items.map(g => [g.id, g]))
}
