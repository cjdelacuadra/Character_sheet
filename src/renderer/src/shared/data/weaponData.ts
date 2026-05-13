export type WeaponProficiencyCategory = 'Simple' | 'Martial' | 'Unarmed' | 'Natural' | 'Improvised'
export type WeaponRangeType = 'Melee' | 'Ranged' | 'Melee or Ranged'

export interface WeaponDef {
  id: string
  name: string
  damageDie: string
  damageType: string
  proficiencyCategory: WeaponProficiencyCategory
  rangeType: WeaponRangeType
  properties: string[]
  enchantmentBonus: number
  bonusDamageDie?: string
  bonusDamageType?: string
  isMonkWeapon: boolean
}

export const WEAPONS: WeaponDef[] = [
  // ── Unarmed ──────────────────────────────────────────────────────────────
  { id: 'unarmed',          name: 'Unarmed Strike',    damageDie: '1',    damageType: 'bludgeoning', proficiencyCategory: 'Unarmed',  rangeType: 'Melee',              properties: [],                                           enchantmentBonus: 0, isMonkWeapon: true  },
  // ── Simple Melee ─────────────────────────────────────────────────────────
  { id: 'club',             name: 'Club',              damageDie: '1d4',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',   rangeType: 'Melee',              properties: ['Light'],                                    enchantmentBonus: 0, isMonkWeapon: true  },
  { id: 'dagger',           name: 'Dagger',            damageDie: '1d4',  damageType: 'piercing',    proficiencyCategory: 'Simple',   rangeType: 'Melee or Ranged',    properties: ['Finesse', 'Light', 'Thrown (range 20/60)'], enchantmentBonus: 0, isMonkWeapon: true  },
  { id: 'greatclub',        name: 'Greatclub',         damageDie: '1d8',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',   rangeType: 'Melee',              properties: ['Two-Handed'],                               enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'handaxe',          name: 'Handaxe',           damageDie: '1d6',  damageType: 'slashing',    proficiencyCategory: 'Simple',   rangeType: 'Melee or Ranged',    properties: ['Light', 'Thrown (range 20/60)'],            enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'javelin',          name: 'Javelin',           damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Simple',   rangeType: 'Melee or Ranged',    properties: ['Thrown (range 30/120)'],                    enchantmentBonus: 0, isMonkWeapon: true  },
  { id: 'lightHammer',      name: 'Light Hammer',      damageDie: '1d4',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',   rangeType: 'Melee or Ranged',    properties: ['Light', 'Thrown (range 20/60)'],            enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'mace',             name: 'Mace',              damageDie: '1d6',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',   rangeType: 'Melee',              properties: [],                                           enchantmentBonus: 0, isMonkWeapon: true  },
  { id: 'quarterstaff',     name: 'Quarterstaff',      damageDie: '1d6',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',   rangeType: 'Melee',              properties: ['Versatile (1d8)'],                          enchantmentBonus: 0, isMonkWeapon: true  },
  { id: 'sickle',           name: 'Sickle',            damageDie: '1d4',  damageType: 'slashing',    proficiencyCategory: 'Simple',   rangeType: 'Melee',              properties: ['Light'],                                    enchantmentBonus: 0, isMonkWeapon: true  },
  { id: 'spear',            name: 'Spear',             damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Simple',   rangeType: 'Melee or Ranged',    properties: ['Thrown (range 20/60)', 'Versatile (1d8)'],  enchantmentBonus: 0, isMonkWeapon: true  },
  // ── Simple Ranged ────────────────────────────────────────────────────────
  { id: 'lightCrossbow',    name: 'Light Crossbow',    damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Simple',   rangeType: 'Ranged',             properties: ['Ammunition (range 80/320)', 'Loading', 'Two-Handed'], enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'dart',             name: 'Dart',              damageDie: '1d4',  damageType: 'piercing',    proficiencyCategory: 'Simple',   rangeType: 'Ranged',             properties: ['Finesse', 'Thrown (range 20/60)'],          enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'shortbow',         name: 'Shortbow',          damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Simple',   rangeType: 'Ranged',             properties: ['Ammunition (range 80/320)', 'Two-Handed'],  enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'sling',            name: 'Sling',             damageDie: '1d4',  damageType: 'bludgeoning', proficiencyCategory: 'Simple',   rangeType: 'Ranged',             properties: ['Ammunition (range 30/120)'],                enchantmentBonus: 0, isMonkWeapon: false },
  // ── Martial Melee ────────────────────────────────────────────────────────
  { id: 'battleaxe',        name: 'Battleaxe',         damageDie: '1d8',  damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Versatile (1d10)'],                         enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'flail',            name: 'Flail',             damageDie: '1d8',  damageType: 'bludgeoning', proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: [],                                           enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'glaive',           name: 'Glaive',            damageDie: '1d10', damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Heavy', 'Reach', 'Two-Handed'],             enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'greataxe',         name: 'Greataxe',          damageDie: '1d12', damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Heavy', 'Two-Handed'],                      enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'greatsword',       name: 'Greatsword',        damageDie: '2d6',  damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Heavy', 'Two-Handed'],                      enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'halberd',          name: 'Halberd',           damageDie: '1d10', damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Heavy', 'Reach', 'Two-Handed'],             enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'lance',            name: 'Lance',             damageDie: '1d12', damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Reach', 'Special'],                         enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'longsword',        name: 'Longsword',         damageDie: '1d8',  damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Versatile (1d10)'],                         enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'maul',             name: 'Maul',              damageDie: '2d6',  damageType: 'bludgeoning', proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Heavy', 'Two-Handed'],                      enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'morningstar',      name: 'Morningstar',       damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: [],                                           enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'pike',             name: 'Pike',              damageDie: '1d10', damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Heavy', 'Reach', 'Two-Handed'],             enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'rapier',           name: 'Rapier',            damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Finesse'],                                  enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'scimitar',         name: 'Scimitar',          damageDie: '1d6',  damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Finesse', 'Light'],                         enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'shortsword',       name: 'Shortsword',        damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Finesse', 'Light'],                         enchantmentBonus: 0, isMonkWeapon: true  },
  { id: 'trident',          name: 'Trident',           damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Melee or Ranged',    properties: ['Thrown (range 20/60)', 'Versatile (1d8)'],  enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'warPick',          name: 'War Pick',          damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: [],                                           enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'warhammer',        name: 'Warhammer',         damageDie: '1d8',  damageType: 'bludgeoning', proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Versatile (1d10)'],                         enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'whip',             name: 'Whip',              damageDie: '1d4',  damageType: 'slashing',    proficiencyCategory: 'Martial',  rangeType: 'Melee',              properties: ['Finesse', 'Reach'],                         enchantmentBonus: 0, isMonkWeapon: false },
  // ── Martial Ranged ───────────────────────────────────────────────────────
  { id: 'blowgun',          name: 'Blowgun',           damageDie: '1',    damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Ranged',             properties: ['Ammunition (range 25/100)', 'Loading'],     enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'handCrossbow',     name: 'Hand Crossbow',     damageDie: '1d6',  damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Ranged',             properties: ['Ammunition (range 30/120)', 'Light', 'Loading'], enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'heavyCrossbow',    name: 'Heavy Crossbow',    damageDie: '1d10', damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Ranged',             properties: ['Ammunition (range 100/400)', 'Heavy', 'Loading', 'Two-Handed'], enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'longbow',          name: 'Longbow',           damageDie: '1d8',  damageType: 'piercing',    proficiencyCategory: 'Martial',  rangeType: 'Ranged',             properties: ['Ammunition (range 150/600)', 'Heavy', 'Two-Handed'], enchantmentBonus: 0, isMonkWeapon: false },
  { id: 'net',              name: 'Net',               damageDie: '—',    damageType: '—',           proficiencyCategory: 'Martial',  rangeType: 'Ranged',             properties: ['Thrown (range 5/15)', 'Special'],           enchantmentBonus: 0, isMonkWeapon: false },
]

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w])) as Record<string, WeaponDef>

export const SIMPLE_WEAPONS = WEAPONS.filter(w => w.proficiencyCategory === 'Simple')
export const MARTIAL_WEAPONS = WEAPONS.filter(w => w.proficiencyCategory === 'Martial')

/** Return weapons a class can use based on its weapon proficiency strings. */
export function weaponsForClass(weaponProficiencies: string[]): WeaponDef[] {
  const hasMartial = weaponProficiencies.some(p => p.toLowerCase().includes('martial weapon'))
  const hasSimple  = weaponProficiencies.some(p => p.toLowerCase().includes('simple weapon'))
  if (hasMartial) return WEAPONS.filter(w => w.proficiencyCategory === 'Simple' || w.proficiencyCategory === 'Martial')
  if (hasSimple)  return WEAPONS.filter(w => w.proficiencyCategory === 'Simple')
  // Specific weapon lists (Bard, Rogue, etc.)
  return WEAPONS.filter(w => {
    return weaponProficiencies.some(p => p.toLowerCase() === w.name.toLowerCase())
      || (w.proficiencyCategory === 'Unarmed')
  })
}
