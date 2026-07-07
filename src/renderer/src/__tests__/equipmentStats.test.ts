import { describe, it, expect, afterEach } from 'vitest'
import { csvToGear, csvToWeapons, gearToCsv, weaponsToCsv } from '@/shared/data/equipment/csvCodec'
import type { GearEquipmentItem, WeaponEquipmentItem } from '@/shared/data/equipment/types'
import { GEAR, setGearData } from '@/shared/data/equipment/gear'
import { setWeaponsData, WEAPONS } from '@/shared/data/equipment/weapons'
import { computeEquipmentStats, effectiveAbilityScore } from '@/shared/data/charCalculations'
import { critExtraDice, computeAttackBonus, computeWeaponDamage } from '@/domain/rules'
import * as newAttacks from '@/domain/rules/attacks'
import { makeChar } from './helpers'
import { buildAttackRows } from '@/features/combat-actions/attackRows'

const ORIGINAL_GEAR = [...GEAR]
const ORIGINAL_WEAPONS = [...WEAPONS]
afterEach(() => {
  setGearData(ORIGINAL_GEAR)
  setWeaponsData(ORIGINAL_WEAPONS)
})

const gauntlets: GearEquipmentItem = {
  id: 'hill-giant-gauntlets', name: 'Hill Giant Gauntlets', kind: 'gloves', cost: 0,
  requiresAttunement: true,
  stats: { abilitySet: { str: 18 }, critBonusDamage: { dice: '2d6', dmgType: 'bludgeoning' } },
}

const flameTongue: WeaponEquipmentItem = {
  id: 'flame-tongue-test', name: 'Flame Tongue', kind: 'weapon', cost: 0,
  damageDie: '1d8', damageType: 'slashing', proficiencyCategory: 'Martial',
  rangeType: 'Melee', properties: ['Versatile (1d10)'],
  stats: { abilityBonus: { cha: 1 }, critBonusDamage: { dice: '1d10', dmgType: 'fire' } },
}

describe('live weapon def resolution (no stale equip snapshots)', () => {
  it('an equipped weapon picks up def edits made after equipping', () => {
    const edited: WeaponEquipmentItem = { ...flameTongue, toHitFlat: 2, dmgBonusCount: 1, dmgBonusDieType: 6 }
    setWeaponsData([...ORIGINAL_WEAPONS, edited])
    // Instance snapshotted BEFORE the edit — carries none of the new bonuses.
    const stale = { id: 'flame-tongue-test', name: 'Flame Tongue', atkBonus: 0, damage: '1d8', damageType: 'slashing', rangeType: 'Melee' as const }
    const unlinked = { ...stale, id: 'custom-uuid-no-def' }   // no catalog def → passthrough
    const char = makeChar({ schemaVersion: 13, weapons: [stale] })

    expect(computeAttackBonus(char, stale) - computeAttackBonus(char, unlinked)).toBe(2)
    expect(computeWeaponDamage(char, stale)).toContain('1d6')
    // New engine agrees.
    const v14 = { ...char, featureState: char.featureState ?? {} }
    expect(newAttacks.computeAttackBonus(v14, stale)).toBe(computeAttackBonus(char, stale))
    expect(newAttacks.computeWeaponDamage(v14, stale)).toContain('1d6')
  })

  it('weapon native to-hit dice and typed bonus damage surface as an always-on attack row', () => {
    // The Mjonir pattern: To-Hit 1d4 + 2, Bonus DMG 1d6 + 1 lightning.
    const mjonir: WeaponEquipmentItem = {
      ...flameTongue, id: 'mjonir-test', name: 'Mjonir', damageType: 'bludgeoning',
      toHitDiceCount: 1, toHitDieType: 4, toHitFlat: 2,
      dmgBonusCount: 1, dmgBonusDieType: 6, dmgBonusFlat: 1, dmgBonusType: 'lightning',
    }
    setWeaponsData([...ORIGINAL_WEAPONS, mjonir])
    const instance = { id: 'mjonir-test', name: 'Mjonir', atkBonus: 0, damage: '1d8', damageType: 'bludgeoning', rangeType: 'Melee' as const }
    const char = makeChar({ schemaVersion: 13, weapons: [instance] })

    const rows = buildAttackRows(char, instance)
    const rider = rows.find(r => r.id === 'equip-bonus-weapon')
    expect(rider).toBeTruthy()
    expect(rider!.toHitDice).toBe('1d4')
    expect(rider!.bonusDmg).toContain('1d6')
    expect(rider!.bonusDmgType).toBe('lightning')
    // Flat +2 folds into the base to-hit, not the rider row.
    const noFlat = { ...mjonir, id: 'mjonir-noflat' }
    delete (noFlat as { toHitFlat?: number }).toHitFlat
    setWeaponsData([...ORIGINAL_WEAPONS, mjonir, noFlat])
    const normal = rows.find(r => r.id === 'normal')!
    const normalNoFlat = buildAttackRows(char, { ...instance, id: 'mjonir-noflat' }).find(r => r.id === 'normal')!
    expect(normal.toHit! - normalNoFlat.toHit!).toBe(2)
  })
})

describe('equipment stat extensions', () => {
  it('CSV round-trips abilitySet, critBonusDamage, and weapon stat blocks', () => {
    const [gearBack] = csvToGear(gearToCsv([gauntlets]))
    expect(gearBack.stats?.abilitySet).toEqual({ str: 18 })
    expect(gearBack.stats?.critBonusDamage).toEqual({ dice: '2d6', flat: undefined, dmgType: 'bludgeoning' })

    const [weaponBack] = csvToWeapons(weaponsToCsv([flameTongue]))
    expect(weaponBack.stats?.abilityBonus).toEqual({ cha: 1 })
    expect(weaponBack.stats?.critBonusDamage?.dmgType).toBe('fire')
  })

  it('abilitySet floors the score without stacking (Gauntlets of Ogre Power pattern)', () => {
    setGearData([...ORIGINAL_GEAR, gauntlets])
    const weakling = makeChar({
      schemaVersion: 13,
      abilityScores: { str: 8, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      equipment: { ...makeChar().equipment, glovesId: 'hill-giant-gauntlets' },
      attunedItemIds: ['hill-giant-gauntlets'],
    })
    expect(effectiveAbilityScore(weakling, 'str')).toBe(18)

    const bruiser = { ...weakling, abilityScores: { ...weakling.abilityScores, str: 20 } }
    expect(effectiveAbilityScore(bruiser, 'str')).toBe(20)   // no effect at 18+
  })

  it('weapon stat blocks fold when weapons are provided', () => {
    setWeaponsData([...ORIGINAL_WEAPONS, flameTongue])
    const char = makeChar({
      schemaVersion: 13,
      weapons: [{ id: 'flame-tongue-test', name: 'Flame Tongue', atkBonus: 0, damage: '1d8', damageType: 'slashing', rangeType: 'Melee' }],
    })
    const stats = computeEquipmentStats(char)
    expect(stats.abilityBonus.cha).toBe(1)
    expect(stats.critBonusDamage).toHaveLength(1)
  })

  it('attunement gates the stats: unattuned items grant nothing', () => {
    setGearData([...ORIGINAL_GEAR, gauntlets])   // requiresAttunement: true
    const base = makeChar({
      schemaVersion: 13,
      abilityScores: { str: 8, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      equipment: { ...makeChar().equipment, glovesId: 'hill-giant-gauntlets' },
    })
    // Equipped but NOT attuned → mundane gloves, no STR floor.
    expect(effectiveAbilityScore(base, 'str')).toBe(8)
    expect(computeEquipmentStats(base).critBonusDamage).toHaveLength(0)
    // Attuned → the magic works.
    const attuned = { ...base, attunedItemIds: ['hill-giant-gauntlets'] }
    expect(effectiveAbilityScore(attuned, 'str')).toBe(18)
    expect(computeEquipmentStats(attuned).critBonusDamage).toHaveLength(1)
  })

  it('critBonusDamage lands in the crit extras', () => {
    setGearData([...ORIGINAL_GEAR, gauntlets])
    const char = makeChar({
      schemaVersion: 13,
      equipment: { ...makeChar().equipment, glovesId: 'hill-giant-gauntlets' },
      attunedItemIds: ['hill-giant-gauntlets'],
    })
    const extras = critExtraDice(char, { id: 'w', name: 'Club', atkBonus: 0, damage: '1d4', damageType: 'bludgeoning', rangeType: 'Melee' }, 'bludgeoning')
    expect(extras).toContainEqual({ expr: '2d6', type: 'bludgeoning' })
  })
})
