import { ARMOR_LIST } from './armor'
import { WEAPONS } from './weapons'
import { ACCESSORIES } from './accessories'
import type { AccessoryEquipmentItem } from './accessories'
import type { ShopItemKind, ItemRarity } from './types'
export type { ShopItemKind, ItemRarity }

export function slotToKind(slot: string): ShopItemKind {
  if (slot === 'armorId')  return 'armor'
  if (slot === 'shieldId') return 'shield'
  if (slot === 'ring1Id' || slot === 'ring2Id') return 'ring'
  return slot.replace('Id', '') as ShopItemKind
}

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

function accKeyStat(item: AccessoryEquipmentItem): string | undefined {
  const s = item.stats
  if (!s) return undefined
  if (s.acBonus) return `+${s.acBonus} AC`
  const saves = Object.entries(s.savingThrowBonus ?? {}).find(([, v]) => v)
  if (saves) return `+${saves[1]} ${saves[0].toUpperCase()} Save`
  const skills = Object.entries(s.skillBonus ?? {}).find(([, v]) => v)
  if (skills) return `+${skills[1]} ${skills[0].charAt(0).toUpperCase() + skills[0].slice(1)}`
  const advSave = s.advantage?.savingThrows?.[0]
  if (advSave) return `Adv ${advSave.toUpperCase()} Save`
  const advSkill = s.advantage?.skills?.[0]
  if (advSkill) return `Adv ${advSkill.charAt(0).toUpperCase() + advSkill.slice(1)}`
  if (s.advantage?.deathSaves) return 'Adv Death Saves'
  return undefined
}

export function getAllShopItems(): ShopItem[] {
  const armorItems: ShopItem[] = ARMOR_LIST.map(a => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    cost: a.cost,
    rarity: a.rarity,
    sprite: a.sprite ?? slotPlaceholderUrl(a.kind),
    keyStat: armorKeyStat(a),
  }))

  const weaponItems: ShopItem[] = WEAPONS.map(w => ({
    id: w.id,
    name: w.name,
    kind: w.kind,
    cost: w.cost,
    rarity: w.rarity,
    sprite: w.sprite ?? slotPlaceholderUrl(w.kind),
    keyStat: weaponKeyStat(w),
  }))

  const accItems: ShopItem[] = ACCESSORIES.map(a => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    cost: a.cost,
    rarity: a.rarity,
    sprite: a.sprite ?? slotPlaceholderUrl(a.kind),
    keyStat: accKeyStat(a),
  }))

  return [...armorItems, ...weaponItems, ...accItems]
}

const _all = getAllShopItems()
export const SHOP_CATALOGUE: ShopItem[] = _all
export const SHOP_ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(_all.map(i => [i.id, i]))

/** @deprecated use SHOP_CATALOGUE */
export function getShopCatalogue(): ShopItem[] { return SHOP_CATALOGUE }
