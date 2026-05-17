import type { AccessorySlot, AccessoryStats, ItemRarity } from './types'
export type { AccessorySlot, AccessoryStats, ItemRarity }

export interface AccessoryDef {
  id: string
  name: string
  slot: AccessorySlot
  cost: number
  stats?: AccessoryStats
  sprite?: string
  rarity?: ItemRarity
}

const S = '/assets/equipment/sprites/'

export const ACCESSORIES: AccessoryDef[] = [
  // ── Helmets ──────────────────────────────────────────────────────────────
  { id: 'iron-med-helm',     name: 'Iron Med Helm',      slot: 'helmet', cost: 14,   rarity: 'common',    sprite: `${S}Iron_med_helm.png` },
  { id: 'steel-med-helm',    name: 'Steel Med Helm',     slot: 'helmet', cost: 35,   rarity: 'common',    sprite: `${S}Steel_med_helm.png` },
  { id: 'mithril-full-helm', name: 'Mithril Full Helm',  slot: 'helmet', cost: 200,  rarity: 'uncommon',  sprite: `${S}Mithril_full_helm.png`,
    stats: { acBonus: 1 } },
  { id: 'rune-full-helm',    name: 'Rune Full Helm',     slot: 'helmet', cost: 1000, rarity: 'uncommon',  sprite: `${S}Rune_full_helm.png`,
    stats: { acBonus: 1 } },
  { id: 'bandos-helmet',     name: 'Bandos Helmet',      slot: 'helmet', cost: 5000, rarity: 'rare',
    stats: { acBonus: 2 } },

  // ── Capes ────────────────────────────────────────────────────────────────
  { id: 'obsidian-cape',  name: 'Obsidian Cape',    slot: 'cape', cost: 2000, rarity: 'uncommon',  sprite: `${S}Obsidian_cape.png`,
    stats: { acBonus: 1 } },
  { id: 'fire-cape',      name: 'Fire Cape',        slot: 'cape', cost: 0,    rarity: 'rare',      sprite: `${S}Fire_cape.png`,
    stats: { acBonus: 1, savingThrowBonus: { dex: 1 } } },
  { id: 'infernal-cape',  name: 'Infernal Cape',    slot: 'cape', cost: 0,    rarity: 'legendary', sprite: `${S}Infernal_cape.png`,
    stats: { acBonus: 2, savingThrowBonus: { dex: 2, con: 1 } } },

  // ── Amulets ──────────────────────────────────────────────────────────────
  { id: 'amulet-of-power',    name: 'Amulet of Power',    slot: 'amulet', cost: 300,   rarity: 'uncommon',  sprite: `${S}Amulet_of_power.png`,
    stats: { savingThrowBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } } },
  { id: 'amulet-of-strength', name: 'Amulet of Strength', slot: 'amulet', cost: 150,   rarity: 'uncommon',  sprite: `${S}Amulet_of_strength.png`,
    stats: { skillBonus: { athletics: 2 } } },
  { id: 'amulet-of-glory',    name: 'Amulet of Glory',    slot: 'amulet', cost: 800,   rarity: 'rare',      sprite: `${S}Amulet_of_glory.png`,
    stats: { skillBonus: { perception: 2, persuasion: 2 } } },
  { id: 'amulet-of-torture',  name: 'Amulet of Torture',  slot: 'amulet', cost: 0,     rarity: 'legendary', sprite: `${S}Amulet_of_torture.png`,
    stats: { savingThrowBonus: { str: 2 }, skillBonus: { athletics: 3 } } },
  { id: 'necklace-of-anguish', name: 'Necklace of Anguish', slot: 'amulet', cost: 0,   rarity: 'legendary', sprite: `${S}Necklace_of_anguish.png`,
    stats: { skillBonus: { perception: 3 }, advantage: { skills: ['perception'] } } },

  // ── Necklaces (flavour slot — D&D style) ─────────────────────────────────
  { id: 'pearl-necklace',    name: 'Pearl Necklace',    slot: 'necklace', cost: 50,  rarity: 'common',
    stats: { advantage: { savingThrows: ['wis'] } } },
  { id: 'ruby-necklace',     name: 'Ruby Necklace',     slot: 'necklace', cost: 200, rarity: 'uncommon',
    stats: { savingThrowBonus: { int: 2 } } },

  // ── Gloves ───────────────────────────────────────────────────────────────
  { id: 'leather-gloves',  name: 'Leather Gloves',   slot: 'gloves', cost: 1,    rarity: 'common',    sprite: `${S}Leather_gloves.png` },
  { id: 'rune-gloves',     name: 'Rune Gloves',      slot: 'gloves', cost: 750,  rarity: 'uncommon',  sprite: `${S}Rune_gloves.png`,
    stats: { skillBonus: { athletics: 2, sleightOfHand: 1 } } },
  { id: 'barrows-gloves',  name: 'Barrows Gloves',   slot: 'gloves', cost: 0,    rarity: 'rare',      sprite: `${S}Barrows_gloves.png`,
    stats: { acBonus: 1, skillBonus: { athletics: 2 } } },
  { id: 'void-mage-gloves',  name: 'Void Mage Gloves',   slot: 'gloves', cost: 0, rarity: 'rare',
    stats: { skillBonus: { arcana: 2 } } },
  { id: 'void-range-gloves', name: 'Void Ranger Gloves', slot: 'gloves', cost: 0, rarity: 'rare',
    stats: { skillBonus: { stealth: 2 } } },

  // ── Boots ────────────────────────────────────────────────────────────────
  { id: 'leather-boots',    name: 'Leather Boots',    slot: 'boots', cost: 1,    rarity: 'common',    sprite: `${S}Leather_boots.png` },
  { id: 'snakeskin-boots',  name: 'Snakeskin Boots',  slot: 'boots', cost: 250,  rarity: 'uncommon',  sprite: `${S}Snakeskin_boots.png`,
    stats: { skillBonus: { stealth: 2 } } },
  { id: 'dragon-boots',     name: 'Dragon Boots',     slot: 'boots', cost: 3000, rarity: 'rare',      sprite: `${S}Dragon_boots.png`,
    stats: { acBonus: 1 } },
  { id: 'primordial-boots', name: 'Primordial Boots', slot: 'boots', cost: 0,    rarity: 'legendary', sprite: `${S}Primordial_boots.png`,
    stats: { acBonus: 2, skillBonus: { athletics: 2 } } },

  // ── Legs ─────────────────────────────────────────────────────────────────
  { id: 'leather-chaps',     name: 'Leather Chaps',      slot: 'legs', cost: 4,    rarity: 'common',    sprite: `${S}Leather_chaps.png` },
  { id: 'black-dhide-chaps', name: "Black D'hide Chaps", slot: 'legs', cost: 1500, rarity: 'uncommon',  sprite: `${S}Black_d%27hide_chaps.png`,
    stats: { acBonus: 1, advantage: { savingThrows: ['dex'] } } },
  { id: 'bandos-tassets',    name: 'Bandos Tassets',     slot: 'legs', cost: 5000, rarity: 'rare',      sprite: `${S}Bandos_tassets.png`,
    stats: { acBonus: 2 } },
  { id: 'justiciar-legguards', name: 'Justiciar Legguards', slot: 'legs', cost: 0, rarity: 'legendary', sprite: `${S}Justiciar_legguards.png`,
    stats: { acBonus: 3, advantage: { savingThrows: ['con'] } } },

  // ── Rings ────────────────────────────────────────────────────────────────
  { id: 'ring-of-recoil',   name: 'Ring of Recoil',     slot: 'ring', cost: 50,   rarity: 'common',    sprite: `${S}Ring_of_recoil.png` },
  { id: 'ring-of-life',     name: 'Ring of Life',       slot: 'ring', cost: 500,  rarity: 'uncommon',  sprite: `${S}Ring_of_life.png`,
    stats: { advantage: { deathSaves: true } } },
  { id: 'berserker-ring',   name: 'Berserker Ring',     slot: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Berserker_ring.png`,
    stats: { skillBonus: { athletics: 2 } } },
  { id: 'archer-ring',      name: "Archer's Ring",      slot: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Archers_ring.png`,
    stats: { skillBonus: { stealth: 2 } } },
  { id: 'seers-ring',       name: "Seer's Ring",        slot: 'ring', cost: 3000, rarity: 'rare',      sprite: `${S}Seers_ring.png`,
    stats: { skillBonus: { arcana: 2 } } },
  { id: 'berserker-ring-i', name: 'Berserker Ring (i)', slot: 'ring', cost: 0,    rarity: 'legendary', sprite: `${S}Berserker_ring_(i).png`,
    stats: { acBonus: 1, skillBonus: { athletics: 4 } } },

  // ── Quiver ───────────────────────────────────────────────────────────────
  { id: 'arrow-quiver',     name: 'Arrow Quiver',      slot: 'quiver', cost: 5, rarity: 'common' },
  { id: 'avas-accumulator', name: "Ava's Accumulator", slot: 'quiver', cost: 0, rarity: 'uncommon',   sprite: `${S}Ava%27s_accumulator.png`,
    stats: { advantage: { skills: ['perception'] } } },
  { id: 'avas-assembler',   name: "Ava's Assembler",   slot: 'quiver', cost: 0, rarity: 'rare',       sprite: `${S}Ava%27s_assembler.png`,
    stats: { acBonus: 1, advantage: { skills: ['perception'] } } },
]

export const ACCESSORY_BY_ID: Record<string, AccessoryDef> =
  Object.fromEntries(ACCESSORIES.map(a => [a.id, a]))
