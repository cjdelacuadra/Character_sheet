import { GEAR, isArmorKind } from './gear'
import { WEAPONS } from './weapons'
import type { GearEquipmentItem } from './gear'
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
  ring:     '/assets/equipment/placeholders/Empty_ring_slot.svg',
  amulet:   '/assets/equipment/placeholders/Empty_amulet_slot.svg',
}

export function slotPlaceholderUrl(kind: ShopItemKind | string): string {
  return SLOT_PLACEHOLDER_URLS[kind] ?? ''
}

function weaponKeyStat(item: (typeof WEAPONS)[0]): string {
  return `${item.damageDie} ${item.damageType.slice(0, 3)}`
}

export function gearKeyStat(item: GearEquipmentItem): string | undefined {
  if (isArmorKind(item.kind)) {
    const ac  = (item.baseAC ?? 0) + (item.enchantmentBonus ?? 0)
    const enc = item.enchantmentBonus ? ` +${item.enchantmentBonus}` : ''
    return `AC ${ac}${enc}`
  }
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
  const gearItems: ShopItem[] = GEAR.map(g => ({
    id: g.id,
    name: g.name,
    kind: g.kind,
    cost: g.cost,
    rarity: g.rarity,
    sprite: g.sprite ?? slotPlaceholderUrl(g.kind),
    keyStat: gearKeyStat(g),
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

  return [...gearItems, ...weaponItems]
}

const _all = getAllShopItems()
export let SHOP_CATALOGUE: ShopItem[] = _all
export let SHOP_ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(_all.map(i => [i.id, i]))

export function rebuildCatalogue(): void {
  const fresh = getAllShopItems()
  SHOP_CATALOGUE = fresh
  SHOP_ITEM_BY_ID = Object.fromEntries(fresh.map(i => [i.id, i]))
}

/** @deprecated use SHOP_CATALOGUE */
export function getShopCatalogue(): ShopItem[] { return SHOP_CATALOGUE }

export function gearToShopItem(g: GearEquipmentItem): ShopItem {
  return {
    id: g.id,
    name: g.name,
    kind: g.kind,
    cost: g.cost,
    rarity: g.rarity,
    sprite: g.sprite ?? slotPlaceholderUrl(g.kind),
    keyStat: gearKeyStat(g),
  }
}

export function getShopCatalogueWithCustom(customItems: GearEquipmentItem[]): ShopItem[] {
  // Custom items already merged into the gear catalog are listed there.
  const customShop = customItems.filter(c => !SHOP_ITEM_BY_ID[c.id]).map(gearToShopItem)
  return [...SHOP_CATALOGUE, ...customShop]
}

export function getShopItemById(id: string, customItems?: Record<string, GearEquipmentItem>): ShopItem | undefined {
  return SHOP_ITEM_BY_ID[id] ?? (customItems?.[id] ? gearToShopItem(customItems[id]) : undefined)
}
