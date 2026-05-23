import type { WeaponProficiencyCategory, WeaponRangeType, ItemRarity, WeaponEquipmentItem } from './types'
export type { WeaponProficiencyCategory, WeaponRangeType, ItemRarity }
export type { WeaponEquipmentItem }
export type WeaponDef = WeaponEquipmentItem

const W = '/assets/equipment/sprites/weapons/'

export let WEAPONS: WeaponEquipmentItem[] = [
  // ── Unarmed ──────────────────────────────────────────────────────────────
  { id: 'unarmed',       name: 'Unarmed Strike', kind: 'weapon', damageDie: '1',    damageType: 'bludgeoning', proficiencyCategory: 'Unarmed', rangeType: 'Melee',           properties: [],                                                   isMonkWeapon: true, cost: 0   },
  // ── Simple Melee ─────────────────────────────────────────────────────────
  { id: 'club',          name: 'Club',           kind: 'weapon', damageDie: '1d4',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',  rangeType: 'Melee',           properties: ['Light'], enchantments: ["fire", "ice", "thunder", "earth", "energy"], isMonkWeapon: true, cost: 1   , sprite: `${W}club.png`},
  { id: 'dagger',        name: 'Dagger',         kind: 'weapon', damageDie: '1d4',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Melee or Ranged', properties: ['Finesse', 'Light', 'Thrown (range 20/60)'],          isMonkWeapon: true, cost: 2   , sprite: `${W}dagger.png`},
  { id: 'greatclub',     name: 'Greatclub',      kind: 'weapon', damageDie: '1d8',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',  rangeType: 'Melee',           properties: ['Two-Handed'],                                                           cost: 2   , sprite: `${W}greatclub.png`},
  { id: 'handaxe',       name: 'Handaxe',        kind: 'weapon', damageDie: '1d6',  damageType: 'slashing',    proficiencyCategory: 'Simple',  rangeType: 'Melee or Ranged', properties: ['Light', 'Thrown (range 20/60)'], enchantments: ["fire", "ice", "thunder", "earth", "energy"],  cost: 5   , sprite: `${W}handaxe.png`},
  { id: 'javelin',       name: 'Javelin',        kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Melee or Ranged', properties: ['Thrown (range 30/120)'],                            isMonkWeapon: true, cost: 5   , sprite: `${W}javelin.png`},
  { id: 'lightHammer',   name: 'Light Hammer',   kind: 'weapon', damageDie: '1d4',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',  rangeType: 'Melee or Ranged', properties: ['Light', 'Thrown (range 20/60)'],                                         cost: 2   , sprite: `${W}light hammer.png`},
  { id: 'mace',          name: 'Mace',           kind: 'weapon', damageDie: '1d6',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',  rangeType: 'Melee',           properties: [],                                                   isMonkWeapon: true, cost: 5   , sprite: `${W}mace.png`},
  { id: 'quarterstaff',  name: 'Quarterstaff',   kind: 'weapon', damageDie: '1d6',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',  rangeType: 'Melee',           properties: ['Versatile (1d8)'],                                  isMonkWeapon: true, cost: 2   , sprite: `${W}quarterstaff.png`},
  { id: 'sickle',        name: 'Sickle',         kind: 'weapon', damageDie: '1d4',  damageType: 'slashing',    proficiencyCategory: 'Simple',  rangeType: 'Melee',           properties: ['Light'],                                            isMonkWeapon: true, cost: 1   , sprite: `${W}sickle.png`},
  { id: 'spear',         name: 'Spear',          kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Melee or Ranged', properties: ['Thrown (range 20/60)', 'Versatile (1d8)'],           isMonkWeapon: true, cost: 1   , sprite: `${W}spear.png`},
  // ── Simple Ranged ────────────────────────────────────────────────────────
  { id: 'lightCrossbow', name: 'Light Crossbow', kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Ranged',          properties: ['Ammunition (range 80/320)', 'Loading', 'Two-Handed'],                   cost: 25  , sprite: `${W}light crossbow.png`},
  { id: 'dart',          name: 'Dart',           kind: 'weapon', damageDie: '1d4',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Ranged',          properties: ['Finesse', 'Thrown (range 20/60)'],                                       cost: 5   , sprite: `${W}dart.png`},
  { id: 'shortbow',      name: 'Shortbow',       kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Ranged',          properties: ['Ammunition (range 80/320)', 'Two-Handed'],                               cost: 25  , sprite: `${W}shortbow.png`},
  { id: 'sling',         name: 'Sling',          kind: 'weapon', damageDie: '1d4',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',  rangeType: 'Ranged',          properties: ['Ammunition (range 30/120)'],                                             cost: 1   , sprite: `${W}sling.png`},
  // ── Martial Melee ────────────────────────────────────────────────────────
  { id: 'battleaxe',     name: 'Battleaxe',      kind: 'weapon', damageDie: '1d8',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Versatile (1d10)'],                                                      cost: 10  , sprite: `${W}battleaxe.png`},
  { id: 'flail',         name: 'Flail',          kind: 'weapon', damageDie: '1d8',  damageType: 'bludgeoning', proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: [],                                                                        cost: 10  , sprite: `${W}flail.png`},
  { id: 'glaive',        name: 'Glaive',         kind: 'weapon', damageDie: '1d10', damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Reach', 'Two-Handed'],                                          cost: 20  , sprite: `${W}glaive.png`},
  { id: 'greataxe',      name: 'Greataxe',       kind: 'weapon', damageDie: '1d12', damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Two-Handed'],                                                   cost: 30  , sprite: `${W}greataxe.png`},
  { id: 'greatsword',    name: 'Greatsword',     kind: 'weapon', damageDie: '2d6',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Two-Handed'],                                                   cost: 50  , sprite: `${W}greatsword.png`},
  { id: 'halberd',       name: 'Halberd',        kind: 'weapon', damageDie: '1d10', damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Reach', 'Two-Handed'],                                          cost: 20  , sprite: `${W}halbert.png`},
  { id: 'lance',         name: 'Lance',          kind: 'weapon', damageDie: '1d12', damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Reach', 'Special'],                                                      cost: 10  , sprite: `${W}lance.png`},
  { id: 'longsword',     name: 'Longsword',      kind: 'weapon', damageDie: '1d8',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Versatile (1d10)'],                                                      cost: 15  , sprite: `${W}longsword.png`},
  { id: 'maul',          name: 'Maul',           kind: 'weapon', damageDie: '2d6',  damageType: 'bludgeoning', proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Two-Handed'],                                                   cost: 10  , sprite: `${W}maul.png`},
  { id: 'morningstar',   name: 'Morningstar',    kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: [],                                                                        cost: 15  , sprite: `${W}morningstar.png`},
  { id: 'pike',          name: 'Pike',           kind: 'weapon', damageDie: '1d10', damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Reach', 'Two-Handed'],                                          cost: 5   , sprite: `${W}pike.png`},
  { id: 'rapier',        name: 'Rapier',         kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Finesse'],                                                               cost: 25  , sprite: `${W}rapier.png`},
  { id: 'scimitar',      name: 'Scimitar',       kind: 'weapon', damageDie: '1d6',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Finesse', 'Light'],                                                      cost: 25  , sprite: `${W}scimitar.png`},
  { id: 'shortsword',    name: 'Shortsword',     kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Finesse', 'Light'],                                                 isMonkWeapon: true, cost: 10  , sprite: `${W}shortsword.png`},
  { id: 'trident',       name: 'Trident',        kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee or Ranged', properties: ['Thrown (range 20/60)', 'Versatile (1d8)'],                                cost: 5   , sprite: `${W}trident.png`},
  { id: 'warPick',       name: 'War Pick',       kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: [],                                                                        cost: 5   , sprite: `${W}war pick.png`},
  { id: 'warhammer',     name: 'Warhammer',      kind: 'weapon', damageDie: '1d8',  damageType: 'bludgeoning', proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Versatile (1d10)'],                                                      cost: 15  , sprite: `${W}warhammer.png`},
  { id: 'whip',          name: 'Whip',           kind: 'weapon', damageDie: '1d4',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Finesse', 'Reach'],                                                      cost: 2   , sprite: `${W}whip.png`},
  // ── Martial Ranged ───────────────────────────────────────────────────────
  { id: 'blowgun',       name: 'Blowgun',        kind: 'weapon', damageDie: '1',    damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Ranged',          properties: ['Ammunition (range 25/100)', 'Loading'],                                  cost: 10  , sprite: `${W}blowgun.png`},
  { id: 'handCrossbow',  name: 'Hand Crossbow',  kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Ranged',          properties: ['Ammunition (range 30/120)', 'Light', 'Loading'],                         cost: 75  , sprite: `${W}hand crossbow.png`},
  { id: 'heavyCrossbow', name: 'Heavy Crossbow', kind: 'weapon', damageDie: '1d10', damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Ranged',          properties: ['Ammunition (range 100/400)', 'Heavy', 'Loading', 'Two-Handed'],         cost: 50  , sprite: `${W}heavy crossbow.png`},
  { id: 'longbow',       name: 'Longbow',        kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Ranged',          properties: ['Ammunition (range 150/600)', 'Heavy', 'Two-Handed'],                     cost: 50  , sprite: `${W}longbow.png`},
  { id: 'net',           name: 'Net',            kind: 'weapon', damageDie: '—',    damageType: '—',           proficiencyCategory: 'Martial', rangeType: 'Ranged',          properties: ['Thrown (range 5/15)', 'Special'],                                        cost: 1   , sprite: `${W}net.png`},
  // ── Magic (+1) — Uncommon ────────────────────────────────────────────────
  { id: 'dagger+1',      name: 'Dagger +1',      kind: 'weapon', damageDie: '1d4',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Melee or Ranged', properties: ['Finesse', 'Light', 'Thrown (range 20/60)'],   enchantmentBonus: 1, isMonkWeapon: true, rarity: 'uncommon', cost: 500   },
  { id: 'shortsword+1',  name: 'Shortsword +1',  kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Finesse', 'Light'],                          enchantmentBonus: 1, isMonkWeapon: true, rarity: 'uncommon', cost: 500   },
  { id: 'longsword+1',   name: 'Longsword +1',   kind: 'weapon', damageDie: '1d8',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Versatile (1d10)'],                          enchantmentBonus: 1,                    rarity: 'uncommon', cost: 500   },
  { id: 'rapier+1',      name: 'Rapier +1',      kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Finesse'],                                   enchantmentBonus: 1,                    rarity: 'uncommon', cost: 500   },
  { id: 'handaxe+1',     name: 'Handaxe +1',     kind: 'weapon', damageDie: '1d6',  damageType: 'slashing',    proficiencyCategory: 'Simple',  rangeType: 'Melee or Ranged', properties: ['Light', 'Thrown (range 20/60)'],             enchantmentBonus: 1,                    rarity: 'uncommon', cost: 500   },
  { id: 'greataxe+1',    name: 'Greataxe +1',    kind: 'weapon', damageDie: '1d12', damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Two-Handed'],                       enchantmentBonus: 1,                    rarity: 'uncommon', cost: 500   },
  { id: 'greatsword+1',  name: 'Greatsword +1',  kind: 'weapon', damageDie: '2d6',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Two-Handed'],                       enchantmentBonus: 1,                    rarity: 'uncommon', cost: 500   },
  { id: 'shortbow+1',    name: 'Shortbow +1',    kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Simple',  rangeType: 'Ranged',          properties: ['Ammunition (range 80/320)', 'Two-Handed'],   enchantmentBonus: 1,                    rarity: 'uncommon', cost: 500   },
  { id: 'longbow+1',     name: 'Longbow +1',     kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Ranged',          properties: ['Ammunition (range 150/600)', 'Heavy', 'Two-Handed'], enchantmentBonus: 1,              rarity: 'uncommon', cost: 500   },
  // ── Magic (+2) — Rare ────────────────────────────────────────────────────
  { id: 'shortsword+2',  name: 'Shortsword +2',  kind: 'weapon', damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Finesse', 'Light'],                          enchantmentBonus: 2, isMonkWeapon: true, rarity: 'rare',      cost: 4000  },
  { id: 'longsword+2',   name: 'Longsword +2',   kind: 'weapon', damageDie: '1d8',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Versatile (1d10)'],                          enchantmentBonus: 2,                    rarity: 'rare',      cost: 4000  },
  { id: 'greatsword+2',  name: 'Greatsword +2',  kind: 'weapon', damageDie: '2d6',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Two-Handed'],                       enchantmentBonus: 2,                    rarity: 'rare',      cost: 4000  },
  { id: 'longbow+2',     name: 'Longbow +2',     kind: 'weapon', damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial', rangeType: 'Ranged',          properties: ['Ammunition (range 150/600)', 'Heavy', 'Two-Handed'], enchantmentBonus: 2,              rarity: 'rare',      cost: 4000  },
  // ── Magic (+3) — Very Rare ───────────────────────────────────────────────
  { id: 'longsword+3',   name: 'Longsword +3',   kind: 'weapon', damageDie: '1d8',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Versatile (1d10)'],                          enchantmentBonus: 3,                    rarity: 'very rare', cost: 16000 },
  { id: 'greatsword+3',  name: 'Greatsword +3',  kind: 'weapon', damageDie: '2d6',  damageType: 'slashing',    proficiencyCategory: 'Martial', rangeType: 'Melee',           properties: ['Heavy', 'Two-Handed'],                       enchantmentBonus: 3,                    rarity: 'very rare', cost: 16000 },
]

export let WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w])) as Record<string, WeaponEquipmentItem>

export function resolveWeaponSprite(baseSprite: string | undefined, enchantment?: string): string | undefined {
  if (!baseSprite || !enchantment) return baseSprite
  const lastSlash = baseSprite.lastIndexOf('/')
  const dir  = baseSprite.slice(0, lastSlash + 1)
  const file = baseSprite.slice(lastSlash + 1)
  return `${dir}${enchantment}/${file}`
}

export function weaponBonusDamage(w: { enchantment?: string; bonusDamageDie?: string; bonusDamageType?: string }): { die: string | null; type: string | null } {
  const die  = w.bonusDamageDie  ?? (w.enchantment ? '1d6' : null)
  const type = w.bonusDamageType ?? w.enchantment ?? null
  return { die, type }
}

export let SIMPLE_WEAPONS  = WEAPONS.filter(w => w.proficiencyCategory === 'Simple')
export let MARTIAL_WEAPONS = WEAPONS.filter(w => w.proficiencyCategory === 'Martial')

export function setWeaponsData(items: WeaponEquipmentItem[]): void {
  WEAPONS         = items
  WEAPON_BY_ID    = Object.fromEntries(items.map(w => [w.id, w])) as Record<string, WeaponEquipmentItem>
  SIMPLE_WEAPONS  = items.filter(w => w.proficiencyCategory === 'Simple')
  MARTIAL_WEAPONS = items.filter(w => w.proficiencyCategory === 'Martial')
}

export function weaponsForClass(weaponProficiencies: string[]): WeaponEquipmentItem[] {
  const hasMartial = weaponProficiencies.some(p => p.toLowerCase().includes('martial weapon'))
  const hasSimple  = weaponProficiencies.some(p => p.toLowerCase().includes('simple weapon'))
  if (hasMartial) return WEAPONS.filter(w => w.proficiencyCategory === 'Simple' || w.proficiencyCategory === 'Martial')
  if (hasSimple)  return WEAPONS.filter(w => w.proficiencyCategory === 'Simple')
  return WEAPONS.filter(w =>
    weaponProficiencies.some(p => p.toLowerCase() === w.name.toLowerCase())
    || (w.proficiencyCategory === 'Unarmed')
  )
}
