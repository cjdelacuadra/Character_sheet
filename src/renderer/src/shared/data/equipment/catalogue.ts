import { ARMOR_LIST } from './armor'
import { WEAPONS } from './weapons'
import { ACCESSORIES, type AccessoryDef } from './accessories'
import type { ShopItemKind, ItemRarity } from './types'
export type { ShopItemKind, ItemRarity }

export interface ShopItem {
  id: string
  name: string
  kind: ShopItemKind
  cost: number
  rarity?: ItemRarity
  sprite?: string
  keyStat?: string
}

export const SLOT_PLACEHOLDER_URLS: Record<string, string> = {
  helmet:   '/assets/equipment/placeholders/Empty_helm_slot.svg',
  necklace: '/assets/equipment/placeholders/Empty_amulet_slot.svg',
  cape:     '/assets/equipment/placeholders/Empty_cape_slot.svg',
  weapon:   '/assets/equipment/placeholders/Empty_weapon_slot.svg',
  armor:    '/assets/equipment/placeholders/Empty_torso_slot.svg',
  shield:   '/assets/equipment/placeholders/Empty_shield_slot.svg',
  legs:     '/assets/equipment/placeholders/Empty_legs_slot.svg',
  gloves:   '/assets/equipment/placeholders/Empty_gloves_slot.svg',
  boots:    '/assets/equipment/placeholders/Empty_boots_slot.svg',
  quiver:   '/assets/equipment/placeholders/Empty_ammo_slot.svg',
  ring:     '/assets/equipment/placeholders/Empty_ring_slot.svg',
  amulet:   '/assets/equipment/placeholders/Empty_amulet_slot.svg',
}

export function slotPlaceholderUrl(kind: ShopItemKind | string): string {
  return SLOT_PLACEHOLDER_URLS[kind] ?? ''
}

function armorKeyStat(item: (typeof ARMOR_LIST)[0]): string {
  const ac  = item.baseAC + (item.enchantmentBonus ?? 0)
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
  if (s.attackBonus?.stab   && s.attackBonus.stab   > 0) return `+${s.attackBonus.stab} Stab`
  if (s.attackBonus?.slash  && s.attackBonus.slash  > 0) return `+${s.attackBonus.slash} Slash`
  if (s.attackBonus?.ranged && s.attackBonus.ranged > 0) return `+${s.attackBonus.ranged} Range`
  if (s.attackBonus?.magic  && s.attackBonus.magic  > 0) return `+${s.attackBonus.magic} Magic`
  if (s.defenceBonus?.stab  && s.defenceBonus.stab  > 0) return `+${s.defenceBonus.stab} Def`
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
    kind: (a.isShield ? 'shield' : 'armor') as ShopItemKind,
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
