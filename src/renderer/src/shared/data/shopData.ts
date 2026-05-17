import { ARMOR_LIST } from './armorData'
import { WEAPONS } from './weaponData'

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary'

export type AccessorySlot =
  | 'helmet' | 'necklace' | 'cape' | 'legs' | 'boots'
  | 'gloves' | 'quiver' | 'ring' | 'amulet'

export type ShopItemKind = 'armor' | 'shield' | 'weapon' | AccessorySlot

export interface AccessoryStats {
  attackBonus?: Partial<{ stab: number; slash: number; crush: number; magic: number; ranged: number }>
  defenceBonus?: Partial<{ stab: number; slash: number; crush: number; magic: number; ranged: number }>
  other?: Partial<{ meleeStr: number; rangedStr: number; magicStr: number; prayer: number }>
}

export interface AccessoryDef {
  id: string
  name: string
  slot: AccessorySlot
  cost: number
  stats?: AccessoryStats
  sprite?: string
  rarity?: ItemRarity
}

export const SLOT_PLACEHOLDER_URLS: Record<string, string> = {
  helmet:   'https://oldschool.runescape.wiki/images/Empty_helm_slot.png',
  necklace: 'https://oldschool.runescape.wiki/images/Empty_amulet_slot.png',
  cape:     'https://oldschool.runescape.wiki/images/Empty_cape_slot.png',
  weapon:   'https://oldschool.runescape.wiki/images/Empty_weapon_slot.png',
  armor:    'https://oldschool.runescape.wiki/images/Empty_torso_slot.png',
  shield:   'https://oldschool.runescape.wiki/images/Empty_shield_slot.png',
  legs:     'https://oldschool.runescape.wiki/images/Empty_legs_slot.png',
  gloves:   'https://oldschool.runescape.wiki/images/Empty_gloves_slot.png',
  boots:    'https://oldschool.runescape.wiki/images/Empty_boots_slot.png',
  quiver:   'https://oldschool.runescape.wiki/images/Empty_ammo_slot.png',
  ring:     'https://oldschool.runescape.wiki/images/Empty_ring_slot.png',
  amulet:   'https://oldschool.runescape.wiki/images/Empty_amulet_slot.png',
}

export function slotPlaceholderUrl(kind: ShopItemKind | string): string {
  return SLOT_PLACEHOLDER_URLS[kind] ?? ''
}

const W = 'https://oldschool.runescape.wiki/images/'

export const ACCESSORIES: AccessoryDef[] = [
  // ── Helmets ──────────────────────────────────────────────────────────────
  { id: 'iron-med-helm',     name: 'Iron Med Helm',      slot: 'helmet', cost: 14,   rarity: 'common',    sprite: `${W}Iron_med_helm.png`,
    stats: { defenceBonus: { stab: 4,  slash: 3,  crush: 3,  magic: -3, ranged: 4  } } },
  { id: 'steel-med-helm',    name: 'Steel Med Helm',     slot: 'helmet', cost: 35,   rarity: 'common',    sprite: `${W}Steel_med_helm.png`,
    stats: { defenceBonus: { stab: 8,  slash: 7,  crush: 5,  magic: -3, ranged: 8  } } },
  { id: 'mithril-full-helm', name: 'Mithril Full Helm',  slot: 'helmet', cost: 200,  rarity: 'uncommon',  sprite: `${W}Mithril_full_helm.png`,
    stats: { defenceBonus: { stab: 15, slash: 14, crush: 11, magic: -5, ranged: 13 } } },
  { id: 'rune-full-helm',    name: 'Rune Full Helm',     slot: 'helmet', cost: 1000, rarity: 'uncommon',  sprite: `${W}Rune_full_helm.png`,
    stats: { defenceBonus: { stab: 30, slash: 28, crush: 26, magic: -6, ranged: 28 } } },
  { id: 'bandos-helmet',     name: 'Bandos Helmet',      slot: 'helmet', cost: 5000, rarity: 'rare',      sprite: `${W}Bandos_helmet.png`,
    stats: { defenceBonus: { stab: 43, slash: 41, crush: 40, magic: -5, ranged: 42 }, other: { prayer: 4 } } },

  // ── Capes ────────────────────────────────────────────────────────────────
  { id: 'obsidian-cape',  name: 'Obsidian Cape',    slot: 'cape', cost: 2000, rarity: 'uncommon',  sprite: `${W}Obsidian_cape.png`,
    stats: { defenceBonus: { stab: 9,  slash: 9,  crush: 9,  magic: 9,  ranged: 9  } } },
  { id: 'fire-cape',      name: 'Fire Cape',        slot: 'cape', cost: 0,    rarity: 'rare',      sprite: `${W}Fire_cape.png`,
    stats: { attackBonus:  { stab: 4,  slash: 4,  crush: 4,  magic: 4,  ranged: 4  },
             defenceBonus: { stab: 11, slash: 11, crush: 11, magic: 11, ranged: 11 },
             other: { meleeStr: 4 } } },
  { id: 'infernal-cape',  name: 'Infernal Cape',    slot: 'cape', cost: 0,    rarity: 'legendary', sprite: `${W}Infernal_cape.png`,
    stats: { attackBonus:  { stab: 8,  slash: 8,  crush: 8,  magic: 8,  ranged: 8  },
             defenceBonus: { stab: 12, slash: 12, crush: 12, magic: 12, ranged: 12 },
             other: { meleeStr: 8 } } },

  // ── Amulets ──────────────────────────────────────────────────────────────
  { id: 'amulet-of-power',    name: 'Amulet of Power',    slot: 'amulet', cost: 300,   rarity: 'uncommon',  sprite: `${W}Amulet_of_power.png`,
    stats: { attackBonus:  { stab: 6,  slash: 6,  crush: 6,  magic: 6,  ranged: 6  },
             defenceBonus: { stab: 6,  slash: 6,  crush: 6,  magic: 6,  ranged: 6  },
             other: { meleeStr: 1 } } },
  { id: 'amulet-of-strength', name: 'Amulet of Strength', slot: 'amulet', cost: 150,   rarity: 'uncommon',  sprite: `${W}Amulet_of_strength.png`,
    stats: { other: { meleeStr: 10 } } },
  { id: 'amulet-of-glory',    name: 'Amulet of Glory',    slot: 'amulet', cost: 800,   rarity: 'rare',      sprite: `${W}Amulet_of_glory.png`,
    stats: { attackBonus:  { stab: 10, slash: 10, crush: 10, magic: 10, ranged: 10 },
             defenceBonus: { stab: 3,  slash: 3,  crush: 3,  magic: 3,  ranged: 3  },
             other: { meleeStr: 3 } } },
  { id: 'amulet-of-torture',  name: 'Amulet of Torture',  slot: 'amulet', cost: 0,     rarity: 'legendary', sprite: `${W}Amulet_of_torture.png`,
    stats: { attackBonus:  { stab: 15, slash: 15, crush: 15, magic: 0,  ranged: 0  },
             other: { meleeStr: 10 } } },
  { id: 'necklace-of-anguish', name: 'Necklace of Anguish', slot: 'amulet', cost: 0,   rarity: 'legendary', sprite: `${W}Necklace_of_anguish.png`,
    stats: { attackBonus: { ranged: 15 }, other: { rangedStr: 5 } } },

  // ── Necklaces (flavour slot — D&D style) ─────────────────────────────────
  { id: 'pearl-necklace',    name: 'Pearl Necklace',    slot: 'necklace', cost: 50,  rarity: 'common',
    stats: { defenceBonus: { magic: 5 } } },
  { id: 'ruby-necklace',     name: 'Ruby Necklace',     slot: 'necklace', cost: 200, rarity: 'uncommon',
    stats: { attackBonus: { magic: 4 }, other: { magicStr: 2 } } },

  // ── Gloves ───────────────────────────────────────────────────────────────
  { id: 'leather-gloves',  name: 'Leather Gloves',   slot: 'gloves', cost: 1,    rarity: 'common',    sprite: `${W}Leather_gloves.png`,
    stats: { defenceBonus: { stab: 1,  slash: 1,  crush: 1,  magic: 0,  ranged: 1  } } },
  { id: 'rune-gloves',     name: 'Rune Gloves',      slot: 'gloves', cost: 750,  rarity: 'uncommon',  sprite: `${W}Rune_gloves.png`,
    stats: { attackBonus:  { stab: 8,  slash: 8,  crush: 8,  magic: 0,  ranged: 8  },
             defenceBonus: { stab: 8,  slash: 8,  crush: 8,  magic: 0,  ranged: 8  },
             other: { meleeStr: 4 } } },
  { id: 'barrows-gloves',  name: 'Barrows Gloves',   slot: 'gloves', cost: 0,    rarity: 'rare',      sprite: `${W}Barrows_gloves.png`,
    stats: { attackBonus:  { stab: 12, slash: 12, crush: 12, magic: 6,  ranged: 12 },
             defenceBonus: { stab: 12, slash: 12, crush: 12, magic: 6,  ranged: 12 },
             other: { meleeStr: 6, rangedStr: 6 } } },
  { id: 'void-mage-gloves',  name: 'Void Mage Gloves',   slot: 'gloves', cost: 0, rarity: 'rare',    sprite: `${W}Void_mage_gloves.png`,
    stats: { other: { magicStr: 3 } } },
  { id: 'void-range-gloves', name: 'Void Ranger Gloves', slot: 'gloves', cost: 0, rarity: 'rare',    sprite: `${W}Void_ranger_gloves.png`,
    stats: { other: { rangedStr: 3 } } },

  // ── Boots ────────────────────────────────────────────────────────────────
  { id: 'leather-boots',    name: 'Leather Boots',    slot: 'boots', cost: 1,    rarity: 'common',    sprite: `${W}Leather_boots.png`,
    stats: { defenceBonus: { stab: 2,  slash: 2,  crush: 2,  magic: 0,  ranged: 2  } } },
  { id: 'snakeskin-boots',  name: 'Snakeskin Boots',  slot: 'boots', cost: 250,  rarity: 'uncommon',  sprite: `${W}Snakeskin_boots.png`,
    stats: { defenceBonus: { ranged: 4 }, other: { rangedStr: 2 } } },
  { id: 'dragon-boots',     name: 'Dragon Boots',     slot: 'boots', cost: 3000, rarity: 'rare',      sprite: `${W}Dragon_boots.png`,
    stats: { defenceBonus: { stab: 4,  slash: 4,  crush: 4,  magic: -1, ranged: 4  },
             other: { meleeStr: 4 } } },
  { id: 'primordial-boots', name: 'Primordial Boots', slot: 'boots', cost: 0,    rarity: 'legendary', sprite: `${W}Primordial_boots.png`,
    stats: { defenceBonus: { stab: 8,  slash: 8,  crush: 8,  magic: -3, ranged: 8  },
             other: { meleeStr: 5 } } },

  // ── Legs ─────────────────────────────────────────────────────────────────
  { id: 'leather-chaps',     name: 'Leather Chaps',      slot: 'legs', cost: 4,    rarity: 'common',    sprite: `${W}Leather_chaps.png`,
    stats: { defenceBonus: { stab: 3,  slash: 3,  crush: 3,  magic: -4, ranged: 6  } } },
  { id: 'black-dhide-chaps', name: "Black D'hide Chaps", slot: 'legs', cost: 1500, rarity: 'uncommon',  sprite: `${W}Black_d%27hide_chaps.png`,
    stats: { attackBonus:  { ranged: 18 },
             defenceBonus: { stab: 18, slash: 18, crush: 18, magic: -1, ranged: 24 } } },
  { id: 'bandos-tassets',    name: 'Bandos Tassets',     slot: 'legs', cost: 5000, rarity: 'rare',      sprite: `${W}Bandos_tassets.png`,
    stats: { defenceBonus: { stab: 43, slash: 41, crush: 40, magic: -5, ranged: 42 },
             other: { meleeStr: 2, prayer: 4 } } },
  { id: 'justiciar-legguards', name: 'Justiciar Legguards', slot: 'legs', cost: 0, rarity: 'legendary', sprite: `${W}Justiciar_legguards.png`,
    stats: { defenceBonus: { stab: 55, slash: 54, crush: 52, magic: 8,  ranged: 54 },
             other: { prayer: 6 } } },

  // ── Rings ────────────────────────────────────────────────────────────────
  { id: 'ring-of-recoil',   name: 'Ring of Recoil',     slot: 'ring', cost: 50,   rarity: 'common',    sprite: `${W}Ring_of_recoil.png` },
  { id: 'ring-of-life',     name: 'Ring of Life',       slot: 'ring', cost: 500,  rarity: 'uncommon',  sprite: `${W}Ring_of_life.png` },
  { id: 'berserker-ring',   name: 'Berserker Ring',     slot: 'ring', cost: 3000, rarity: 'rare',      sprite: `${W}Berserker_ring.png`,
    stats: { attackBonus: { crush: 8 }, other: { meleeStr: 4 } } },
  { id: 'archer-ring',      name: "Archer's Ring",      slot: 'ring', cost: 3000, rarity: 'rare',      sprite: `${W}Archers_ring.png`,
    stats: { attackBonus: { ranged: 8 }, other: { rangedStr: 4 } } },
  { id: 'seers-ring',       name: "Seer's Ring",        slot: 'ring', cost: 3000, rarity: 'rare',      sprite: `${W}Seers_ring.png`,
    stats: { attackBonus: { magic: 12 } } },
  { id: 'berserker-ring-i', name: 'Berserker Ring (i)', slot: 'ring', cost: 0,    rarity: 'legendary', sprite: `${W}Berserker_ring_(i).png`,
    stats: { attackBonus: { crush: 16 }, other: { meleeStr: 8 } } },

  // ── Quiver ───────────────────────────────────────────────────────────────
  { id: 'arrow-quiver',     name: 'Arrow Quiver',      slot: 'quiver', cost: 5, rarity: 'common',
    stats: { other: { rangedStr: 1 } } },
  { id: 'avas-accumulator', name: "Ava's Accumulator", slot: 'quiver', cost: 0, rarity: 'uncommon',   sprite: `${W}Ava%27s_accumulator.png`,
    stats: { attackBonus: { ranged: 4 }, other: { rangedStr: 4 } } },
  { id: 'avas-assembler',   name: "Ava's Assembler",   slot: 'quiver', cost: 0, rarity: 'rare',       sprite: `${W}Ava%27s_assembler.png`,
    stats: { attackBonus: { ranged: 8 }, other: { rangedStr: 8 } } },
]

export const ACCESSORY_BY_ID: Record<string, AccessoryDef> =
  Object.fromEntries(ACCESSORIES.map(a => [a.id, a]))

// ─── Unified Shop Catalogue ──────────────────────────────────────────────────

export interface ShopItem {
  id: string
  name: string
  kind: ShopItemKind
  cost: number
  rarity?: ItemRarity
  sprite?: string
  keyStat?: string
}

function armorKeyStat(item: (typeof ARMOR_LIST)[0]): string {
  const ac = item.baseAC + (item.enchantmentBonus ?? 0)
  const enc = item.enchantmentBonus ? ` +${item.enchantmentBonus}` : ''
  return `AC ${ac}${enc}`
}

function weaponKeyStat(item: (typeof WEAPONS)[0]): string {
  return `${item.damageDie} ${item.damageType.slice(0, 3)}`
}

function accKeyStat(item: AccessoryDef): string | undefined {
  const s = item.stats
  if (!s) return undefined
  if (s.other?.meleeStr)   return `+${s.other.meleeStr} Melee`
  if (s.other?.rangedStr)  return `+${s.other.rangedStr} Range`
  if (s.other?.magicStr)   return `+${s.other.magicStr}% Magic`
  if (s.attackBonus?.stab && s.attackBonus.stab > 0)   return `+${s.attackBonus.stab} Stab`
  if (s.attackBonus?.slash && s.attackBonus.slash > 0)  return `+${s.attackBonus.slash} Slash`
  if (s.attackBonus?.ranged && s.attackBonus.ranged > 0) return `+${s.attackBonus.ranged} Range`
  if (s.attackBonus?.magic && s.attackBonus.magic > 0)  return `+${s.attackBonus.magic} Magic`
  if (s.defenceBonus?.stab && s.defenceBonus.stab > 0)  return `+${s.defenceBonus.stab} Def`
  return undefined
}

function parseCost(cost: string | undefined): number {
  if (!cost || cost === '—') return 0
  return parseInt(cost.replace(/[^0-9]/g, ''), 10) || 0
}

export function getAllShopItems(): ShopItem[] {
  const armorItems: ShopItem[] = ARMOR_LIST.map(a => ({
    id: a.id,
    name: a.name,
    kind: a.isShield ? 'shield' : 'armor',
    cost: parseCost(a.cost),
    rarity: a.rarity,
    keyStat: armorKeyStat(a),
  }))

  const weaponItems: ShopItem[] = WEAPONS.map(w => ({
    id: w.id,
    name: w.name,
    kind: 'weapon' as ShopItemKind,
    cost: parseCost((w as Record<string, unknown>).cost as string | undefined),
    rarity: w.rarity,
    keyStat: weaponKeyStat(w),
  }))

  const accItems: ShopItem[] = ACCESSORIES.map(a => ({
    id: a.id,
    name: a.name,
    kind: a.slot as ShopItemKind,
    cost: a.cost,
    rarity: a.rarity,
    sprite: a.sprite,
    keyStat: accKeyStat(a),
  }))

  return [...armorItems, ...weaponItems, ...accItems]
}

let _catalogue: ShopItem[] | null = null
export function getShopCatalogue(): ShopItem[] {
  if (!_catalogue) _catalogue = getAllShopItems()
  return _catalogue
}

export const SHOP_ITEM_BY_ID: Record<string, ShopItem> = {}
for (const item of getAllShopItems()) {
  SHOP_ITEM_BY_ID[item.id] = item
}
