import type { AccessorySlot, AccessoryStats, ItemRarity, AccessoryEquipmentItem, ArmorEquipmentItem, ArmorType, ArmorProficiency } from './types'
export type { AccessorySlot, AccessoryStats, ItemRarity }
export type { AccessoryEquipmentItem }
export type AccessoryDef = AccessoryEquipmentItem
export type { ArmorEquipmentItem, ArmorType, ArmorProficiency }
export type ArmorDef = ArmorEquipmentItem

export function armorAllowed(armorType: ArmorType, proficiencies: ArmorProficiency[]): boolean {
  if (armorType === 'none') return true
  return proficiencies.includes(armorType as ArmorProficiency)
}

const S = '/assets/equipment/sprites/'

// ── Armor & Shields ───────────────────────────────────────────────────────────

export const ARMOR_LIST: ArmorEquipmentItem[] = [
  // ── Unarmored / Shields ───────────────────────────────────────────────────
  { id: 'none',          name: 'Unarmored',          kind: 'armor',  type: 'none',   baseAC: 10, cost: 0 },
  { id: 'shield',        name: 'Shield',              kind: 'shield', type: 'none',   baseAC: 0,  cost: 10 },
  { id: 'towerShield',   name: 'Tower Shield',        kind: 'shield', type: 'none',   baseAC: 0,  cost: 20 },
  // ── Light ─────────────────────────────────────────────────────────────────
  { id: 'padded',        name: 'Padded',              kind: 'armor',  type: 'light',  baseAC: 11, cost: 5,    stealthDisadvantage: true },
  { id: 'leather',       name: 'Leather',             kind: 'armor',  type: 'light',  baseAC: 11, cost: 10 },
  { id: 'studded',       name: 'Studded Leather',     kind: 'armor',  type: 'light',  baseAC: 12, cost: 45 },
  // ── Medium ────────────────────────────────────────────────────────────────
  { id: 'hide',          name: 'Hide',                kind: 'armor',  type: 'medium', baseAC: 12, cost: 10,   dexCap: 2, stealthDisadvantage: true },
  { id: 'chainShirt',    name: 'Chain Shirt',         kind: 'armor',  type: 'medium', baseAC: 13, cost: 50,   dexCap: 2 },
  { id: 'scaleMail',     name: 'Scale Mail',          kind: 'armor',  type: 'medium', baseAC: 14, cost: 50,   dexCap: 2, stealthDisadvantage: true },
  { id: 'breastplate',   name: 'Breastplate',         kind: 'armor',  type: 'medium', baseAC: 14, cost: 400,  dexCap: 2 },
  { id: 'halfPlate',     name: 'Half Plate',          kind: 'armor',  type: 'medium', baseAC: 15, cost: 750,  dexCap: 2, stealthDisadvantage: true },
  // ── Heavy ─────────────────────────────────────────────────────────────────
  { id: 'ringMail',      name: 'Ring Mail',           kind: 'armor',  type: 'heavy',  baseAC: 14, cost: 30,   dexCap: 0, stealthDisadvantage: true },
  { id: 'chainMail',     name: 'Chain Mail',          kind: 'armor',  type: 'heavy',  baseAC: 16, cost: 75,   dexCap: 0, stealthDisadvantage: true, strRequirement: 13 },
  { id: 'splint',        name: 'Splint',              kind: 'armor',  type: 'heavy',  baseAC: 17, cost: 200,  dexCap: 0, stealthDisadvantage: true, strRequirement: 15 },
  { id: 'plate',         name: 'Plate',               kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 1500, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, sprite: `${S}Armor_test.png` },
  // ── Magic — Uncommon (+1) ─────────────────────────────────────────────────
  { id: 'shield+1',      name: 'Shield +1',           kind: 'shield', type: 'none',   baseAC: 0,  cost: 1000, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'leather+1',     name: 'Leather +1',          kind: 'armor',  type: 'light',  baseAC: 11, cost: 0, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'studded+1',     name: 'Studded Leather +1',  kind: 'armor',  type: 'light',  baseAC: 12, cost: 0, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'breastplate+1', name: 'Breastplate +1',      kind: 'armor',  type: 'medium', baseAC: 14, cost: 0, dexCap: 2, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'halfPlate+1',   name: 'Half Plate +1',       kind: 'armor',  type: 'medium', baseAC: 15, cost: 0, dexCap: 2, stealthDisadvantage: true, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'ringMail+1',    name: 'Ring Mail +1',        kind: 'armor',  type: 'heavy',  baseAC: 14, cost: 0, dexCap: 0, stealthDisadvantage: true, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'chainMail+1',   name: 'Chain Mail +1',       kind: 'armor',  type: 'heavy',  baseAC: 16, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 13, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'splint+1',      name: 'Splint +1',           kind: 'armor',  type: 'heavy',  baseAC: 17, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 1, rarity: 'uncommon' },
  { id: 'plate+1',       name: 'Plate +1',            kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 1, rarity: 'uncommon' },
  // ── Magic — Rare (+2) ─────────────────────────────────────────────────────
  { id: 'shield+2',      name: 'Shield +2',           kind: 'shield', type: 'none',   baseAC: 0,  cost: 0, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'studded+2',     name: 'Studded Leather +2',  kind: 'armor',  type: 'light',  baseAC: 12, cost: 0, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'breastplate+2', name: 'Breastplate +2',      kind: 'armor',  type: 'medium', baseAC: 14, cost: 0, dexCap: 2, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'halfPlate+2',   name: 'Half Plate +2',       kind: 'armor',  type: 'medium', baseAC: 15, cost: 0, dexCap: 2, stealthDisadvantage: true, enchantmentBonus: 2, rarity: 'rare' },
  { id: 'plate+2',       name: 'Plate +2',            kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 2, rarity: 'rare' },
  // ── Magic — Very Rare (+3) ────────────────────────────────────────────────
  { id: 'shield+3',      name: 'Shield +3',           kind: 'shield', type: 'none',   baseAC: 0,  cost: 0, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'studded+3',     name: 'Studded Leather +3',  kind: 'armor',  type: 'light',  baseAC: 12, cost: 0, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'breastplate+3', name: 'Breastplate +3',      kind: 'armor',  type: 'medium', baseAC: 14, cost: 0, dexCap: 2, enchantmentBonus: 3, rarity: 'very rare' },
  { id: 'plate+3',       name: 'Plate +3',            kind: 'armor',  type: 'heavy',  baseAC: 18, cost: 0, dexCap: 0, stealthDisadvantage: true, strRequirement: 15, enchantmentBonus: 3, rarity: 'very rare' },
]

export const ARMOR_BY_ID = Object.fromEntries(ARMOR_LIST.map(a => [a.id, a])) as Record<string, ArmorEquipmentItem>

// ── Accessories ───────────────────────────────────────────────────────────────

export const ACCESSORIES: AccessoryEquipmentItem[] = [
  // ── Helmets ──────────────────────────────────────────────────────────────
  { id: 'iron-med-helm',      name: 'Iron Med Helm',       kind: 'helmet', cost: 14,   rarity: 'common',    sprite: `${S}Iron_med_helm.png` },
  { id: 'steel-med-helm',     name: 'Steel Med Helm',      kind: 'helmet', cost: 35,   rarity: 'common',    sprite: `${S}Steel_med_helm.png` },
  { id: 'mithril-full-helm',  name: 'Mithril Full Helm',   kind: 'helmet', cost: 200,  rarity: 'uncommon',  sprite: `${S}Mithril_full_helm.png`,
    stats: { acBonus: 1 } },
  { id: 'rune-full-helm',     name: 'Rune Full Helm',      kind: 'helmet', cost: 1000, rarity: 'uncommon',  sprite: `${S}Rune_full_helm.png`,
    stats: { acBonus: 1 } },
  { id: 'bandos-helmet',      name: 'Bandos Helmet',       kind: 'helmet', cost: 5000, rarity: 'rare',
    stats: { acBonus: 2 } },

  // ── Capes ────────────────────────────────────────────────────────────────
  { id: 'obsidian-cape',  name: 'Obsidian Cape',    kind: 'cape', cost: 2000, rarity: 'uncommon',  sprite: `${S}Obsidian_cape.png`,
    stats: { acBonus: 1 } },
  { id: 'fire-cape',      name: 'Fire Cape',        kind: 'cape', cost: 0,    rarity: 'rare',      sprite: `${S}Fire_cape.png`,
    stats: { acBonus: 1, savingThrowBonus: { dex: 1 } } },
  { id: 'infernal-cape',  name: 'Infernal Cape',    kind: 'cape', cost: 0,    rarity: 'legendary', sprite: `${S}Infernal_cape.png`,
    stats: { acBonus: 2, savingThrowBonus: { dex: 2, con: 1 } } },

  // ── Amulets ──────────────────────────────────────────────────────────────
  { id: 'amulet-of-power',    name: 'Amulet of Power',    kind: 'amulet', cost: 300,   rarity: 'uncommon',  sprite: `${S}Amulet_of_power.png`,
    stats: { savingThrowBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } } },
  { id: 'amulet-of-strength', name: 'Amulet of Strength', kind: 'amulet', cost: 150,   rarity: 'uncommon',  sprite: `${S}Amulet_of_strength.png`,
    stats: { skillBonus: { athletics: 2 } } },
  { id: 'amulet-of-glory',    name: 'Amulet of Glory',    kind: 'amulet', cost: 800,   rarity: 'rare',      sprite: `${S}Amulet_of_glory.png`,
    stats: { skillBonus: { perception: 2, persuasion: 2 } } },
  { id: 'amulet-of-torture',  name: 'Amulet of Torture',  kind: 'amulet', cost: 0,     rarity: 'legendary', sprite: `${S}Amulet_of_torture.png`,
    stats: { savingThrowBonus: { str: 2 }, skillBonus: { athletics: 3 } } },
  { id: 'necklace-of-anguish', name: 'Necklace of Anguish', kind: 'amulet', cost: 0,   rarity: 'legendary', sprite: `${S}Necklace_of_anguish.png`,
    stats: { skillBonus: { perception: 3 }, advantage: { skills: ['perception'] } } },

  // ── Necklaces ────────────────────────────────────────────────────────────
  { id: 'pearl-necklace', name: 'Pearl Necklace', kind: 'necklace', cost: 50,  rarity: 'common',
    stats: { advantage: { savingThrows: ['wis'] } } },
  { id: 'ruby-necklace',  name: 'Ruby Necklace',  kind: 'necklace', cost: 200, rarity: 'uncommon',
    stats: { savingThrowBonus: { int: 2 } } },

  // ── Gloves ───────────────────────────────────────────────────────────────
  { id: 'leather-gloves',    name: 'Leather Gloves',      kind: 'gloves', cost: 1,    rarity: 'common',    sprite: `${S}Leather_gloves.png` },
  { id: 'rune-gloves',       name: 'Rune Gloves',         kind: 'gloves', cost: 750,  rarity: 'uncommon',  sprite: `${S}Rune_gloves.png`,
    stats: { skillBonus: { athletics: 2, sleightOfHand: 1 } } },
  { id: 'barrows-gloves',    name: 'Barrows Gloves',      kind: 'gloves', cost: 0,    rarity: 'rare',      sprite: `${S}Barrows_gloves.png`,
    stats: { acBonus: 1, skillBonus: { athletics: 2 } } },
  { id: 'void-mage-gloves',  name: 'Void Mage Gloves',   kind: 'gloves', cost: 0,    rarity: 'rare',
    stats: { skillBonus: { arcana: 2 } } },
  { id: 'void-range-gloves', name: 'Void Ranger Gloves', kind: 'gloves', cost: 0,    rarity: 'rare',
    stats: { skillBonus: { stealth: 2 } } },

  // ── Boots ────────────────────────────────────────────────────────────────
  { id: 'leather-boots',    name: 'Leather Boots',    kind: 'boots', cost: 1,    rarity: 'common',    sprite: `${S}Leather_boots.png` },
  { id: 'snakeskin-boots',  name: 'Snakeskin Boots',  kind: 'boots', cost: 250,  rarity: 'uncommon',  sprite: `${S}Snakeskin_boots.png`,
    stats: { skillBonus: { stealth: 2 } } },
  { id: 'dragon-boots',     name: 'Dragon Boots',     kind: 'boots', cost: 3000, rarity: 'rare',      sprite: `${S}Dragon_boots.png`,
    stats: { acBonus: 1 } },
  { id: 'primordial-boots', name: 'Primordial Boots', kind: 'boots', cost: 0,    rarity: 'legendary', sprite: `${S}Primordial_boots.png`,
    stats: { acBonus: 2, skillBonus: { athletics: 2 } } },

  // ── Legs ─────────────────────────────────────────────────────────────────
  { id: 'leather-chaps',      name: 'Leather Chaps',       kind: 'legs', cost: 4,    rarity: 'common',    sprite: `${S}Leather_chaps.png` },
  { id: 'black-dhide-chaps',  name: "Black D'hide Chaps",  kind: 'legs', cost: 1500, rarity: 'uncommon',  sprite: `${S}Black_d%27hide_chaps.png`,
    stats: { acBonus: 1, advantage: { savingThrows: ['dex'] } } },
  { id: 'bandos-tassets',     name: 'Bandos Tassets',      kind: 'legs', cost: 5000, rarity: 'rare',      sprite: `${S}Bandos_tassets.png`,
    stats: { acBonus: 2 } },
  { id: 'justiciar-legguards', name: 'Justiciar Legguards', kind: 'legs', cost: 0,   rarity: 'legendary', sprite: `${S}Justiciar_legguards.png`,
    stats: { acBonus: 3, advantage: { savingThrows: ['con'] } } },

  // ── Rings ────────────────────────────────────────────────────────────────
  { id: 'ring-of-recoil',   name: 'Ring of Recoil',     kind: 'ring', cost: 50,   rarity: 'common',    sprite: `${S}Ring_of_recoil.png` },
  { id: 'ring-of-life',     name: 'Ring of Life',       kind: 'ring', cost: 500,  rarity: 'uncommon',  sprite: `${S}Ring_of_life.png`,
    stats: { advantage: { deathSaves: true } } },
  { id: 'berserker-ring',   name: 'Berserker Ring',     kind: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Berserker_ring.png`,
    stats: { skillBonus: { athletics: 2 } } },
  { id: 'archer-ring',      name: "Archer's Ring",      kind: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Archers_ring.png`,
    stats: { skillBonus: { stealth: 2 } } },
  { id: 'seers-ring',       name: "Seer's Ring",        kind: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Seers_ring.png`,
    stats: { skillBonus: { arcana: 2 } } },
  { id: 'berserker-ring-i', name: 'Berserker Ring (i)', kind: 'ring', cost: 0,    rarity: 'legendary', sprite: `${S}Berserker_ring_(i).png`,
    stats: { acBonus: 1, skillBonus: { athletics: 4 } } },

  // ── Quiver ───────────────────────────────────────────────────────────────
  { id: 'arrow-quiver',     name: 'Arrow Quiver',      kind: 'quiver', cost: 5, rarity: 'common' },
  { id: 'avas-accumulator', name: "Ava's Accumulator", kind: 'quiver', cost: 0, rarity: 'uncommon',   sprite: `${S}Ava%27s_accumulator.png`,
    stats: { advantage: { skills: ['perception'] } } },
  { id: 'avas-assembler',   name: "Ava's Assembler",   kind: 'quiver', cost: 0, rarity: 'rare',       sprite: `${S}Ava%27s_assembler.png`,
    stats: { acBonus: 1, advantage: { skills: ['perception'] } } },
]

export const ACCESSORY_BY_ID: Record<string, AccessoryEquipmentItem> =
  Object.fromEntries(ACCESSORIES.map(a => [a.id, a]))
