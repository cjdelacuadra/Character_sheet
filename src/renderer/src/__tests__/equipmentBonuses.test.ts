import { describe, it, expect } from 'vitest'
import type { Weapon } from '@/entities/character/types'
import type { GearEquipmentItem } from '@/shared/data/equipment/types'
import {
  computeEquipmentStats,
  computeACFull,
  effectiveAbilityScore,
  computeInitiative,
  computeInitiativeFull,
} from '@/shared/data/charCalculations'
import { computeWeaponDamage } from '@/domain/rules'
import { gearToCsv, csvToGear } from '@/shared/data/equipment/csvCodec'
import { GEAR, setGearData } from '@/shared/data/equipment/gear'
import { makeChar } from './helpers'

describe('computeEquipmentStats', () => {
  it('returns zeroed stats with no accessories equipped', () => {
    const stats = computeEquipmentStats(makeChar())
    expect(stats.acBonus).toBe(0)
    expect(stats.abilityBonus).toEqual({})
    expect(stats.savingThrowBonus).toEqual({})
    expect(stats.skillBonus).toEqual({})
    expect(stats.advantage.deathSaves).toBe(false)
    expect(stats.bonusDamage).toEqual([])
  })

  it('aggregates acBonus, abilityBonus, saves, skills and advantage', () => {
    const char = makeChar({
      equipment: {
        ...makeChar().equipment,
        helmetId: 'steel-helmet',        // acBonus 1
        capeId: 'movility-cape',          // abilityBonus dex +2
        amuletId: 'amulet-of-power',      // savingThrowBonus all +1
        necklaceId: 'pearl-necklace',     // advantage save wis
      },
    })
    const stats = computeEquipmentStats(char)
    expect(stats.acBonus).toBe(1)
    expect(stats.abilityBonus.dex).toBe(2)
    expect(stats.savingThrowBonus.wis).toBe(1)
    expect(stats.advantage.savingThrows).toContain('wis')
  })

  it('flags death-save advantage from Ring of Life', () => {
    const char = makeChar({ equipment: { ...makeChar().equipment, ring1Id: 'ring-of-life' } })
    expect(computeEquipmentStats(char).advantage.deathSaves).toBe(true)
  })

  it('merges bonus damage of the same type and appliesTo across slots', () => {
    const char = makeChar({
      equipment: { ...makeChar().equipment, ring1Id: 'ring-of-fire-damage', ring2Id: 'ring-of-fire-damage' },
    })
    const rider = computeEquipmentStats(char).bonusDamage.find(b => b.dmgType === 'fire')
    expect(rider).toBeDefined()
    expect(rider!.flat).toBe(4)
    expect(rider!.appliesTo).toBe('melee')
  })

  it('aggregates stats from an equipped armor item, not just accessories', () => {
    const original = GEAR
    setGearData([...original, {
      id: 'test-stealth-armor', name: 'Test Stealth Armor', kind: 'armor',
      cost: 0, type: 'light', baseAC: 12,
      stats: { skillBonus: { stealth: 3 }, toHitBonus: 1, savingThrowBonus: { dex: 2 } },
    }])
    try {
      const char = makeChar({ equipment: { ...makeChar().equipment, armorId: 'test-stealth-armor' } })
      const stats = computeEquipmentStats(char)
      expect(stats.skillBonus.stealth).toBe(3)
      expect(stats.toHitBonus).toBe(1)
      expect(stats.savingThrowBonus.dex).toBe(2)
    } finally {
      setGearData(original)
    }
  })
})

describe('computeACFull', () => {
  it('unarmored Fighter with no equipment is AC 10', () => {
    expect(computeACFull(makeChar())).toBe(10)
  })
  it('adds accessory acBonus', () => {
    const char = makeChar({ equipment: { ...makeChar().equipment, helmetId: 'steel-helmet' } })
    expect(computeACFull(char)).toBe(11)
  })
  it('applies equipment ability bonuses to the DEX component', () => {
    const char = makeChar({ equipment: { ...makeChar().equipment, capeId: 'movility-cape' } })
    expect(computeACFull(char)).toBe(11) // 10 + mod(10 + 2)
  })
})

describe('effectiveAbilityScore', () => {
  it('adds accessory ability bonuses to the base score', () => {
    const char = makeChar({ equipment: { ...makeChar().equipment, capeId: 'movility-cape' } })
    expect(effectiveAbilityScore(char, 'dex')).toBe(12)
  })
})

describe('computeInitiative', () => {
  it('uses raw DEX modifier with no equipment bonus', () => {
    expect(computeInitiative({ dex: 14 }, 'Fighter', 1, 2, [])).toBe(2)
  })
  it('applies an equipment DEX bonus', () => {
    expect(computeInitiative({ dex: 14 }, 'Fighter', 1, 2, [], undefined, { dex: 2 })).toBe(3)
  })
  it('computeInitiativeFull folds in equipped accessories', () => {
    const char = makeChar({
      abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      equipment: { ...makeChar().equipment, capeId: 'movility-cape' },
    })
    expect(computeInitiativeFull(char)).toBe(3) // mod(14 + 2)
  })
})

describe('computeWeaponDamage', () => {
  function makeWeapon(overrides: Partial<Weapon> = {}): Weapon {
    return { id: 'w', name: 'Longsword', atkBonus: 0, damage: '1d8', damageType: 'slashing', rangeType: 'Melee', ...overrides }
  }

  it('combines weapon dice with the effective ability modifier', () => {
    const char = makeChar({ abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })
    expect(computeWeaponDamage(char, makeWeapon())).toBe('1d8 + 3 slashing')
  })

  it('appends a matched melee damage rider as a separate segment', () => {
    const char = makeChar({
      abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      equipment: { ...makeChar().equipment, ring1Id: 'ring-of-fire-damage' },
    })
    expect(computeWeaponDamage(char, makeWeapon())).toBe('1d8 + 3 slashing + 2 fire')
  })

  it('omits a melee-only rider on a ranged weapon', () => {
    const char = makeChar({
      abilityScores: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 },
      equipment: { ...makeChar().equipment, ring1Id: 'ring-of-fire-damage' },
    })
    const bow = makeWeapon({ name: 'Shortbow', damage: '1d6', damageType: 'piercing', rangeType: 'Ranged' })
    expect(computeWeaponDamage(char, bow)).toBe('1d6 + 3 piercing')
  })
})

describe('csvCodec gear round-trip', () => {
  it('preserves the bonusDamage appliesTo field', () => {
    const restored = csvToGear(gearToCsv(GEAR))
    const ring = restored.find(g => g.id === 'ring-of-fire-damage')
    expect(ring?.stats?.bonusDamage?.appliesTo).toBe('melee')
    expect(ring?.stats?.bonusDamage?.flat).toBe(2)
    expect(ring?.stats?.bonusDamage?.dmgType).toBe('fire')
  })

  it('round-trips toHitBonus and full bonus damage', () => {
    const gear: GearEquipmentItem = {
      id: 'test-ring', name: 'Test Ring', kind: 'ring', cost: 100, rarity: 'rare',
      stats: { toHitBonus: 2, bonusDamage: { dice: '1d4', flat: 1, dmgType: 'cold', appliesTo: 'ranged' } },
    }
    const [restored] = csvToGear(gearToCsv([gear]))
    expect(restored.stats?.toHitBonus).toBe(2)
    expect(restored.stats?.bonusDamage).toEqual({ dice: '1d4', flat: 1, dmgType: 'cold', appliesTo: 'ranged' })
  })

  it('round-trips armor fields alongside stats on a single item', () => {
    const armor: GearEquipmentItem = {
      id: 'test-plate', name: 'Test Plate', kind: 'armor', cost: 500, rarity: 'rare',
      type: 'heavy', baseAC: 18, dexCap: 0, stealthDisadvantage: true, strRequirement: 15,
      enchantmentBonus: 1,
      stats: { skillBonus: { stealth: 2 }, toHitBonus: 1 },
    }
    const [restored] = csvToGear(gearToCsv([armor]))
    expect(restored.type).toBe('heavy')
    expect(restored.baseAC).toBe(18)
    expect(restored.dexCap).toBe(0)
    expect(restored.stealthDisadvantage).toBe(true)
    expect(restored.strRequirement).toBe(15)
    expect(restored.enchantmentBonus).toBe(1)
    expect(restored.stats?.skillBonus?.stealth).toBe(2)
    expect(restored.stats?.toHitBonus).toBe(1)
  })
})
