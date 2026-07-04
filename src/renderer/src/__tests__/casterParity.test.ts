import { describe, it, expect } from 'vitest'
import { METAMAGIC_BY_ID, METAMAGIC_OPTIONS, metamagicCost, metamagicKnownCount } from '@/domain/data/metamagicData'
import {
  CREATE_SLOT_COST, canCreateSlot, canConvertSlot, convertSlotToPoints,
  createSlotFromPoints, sorceryPointsAvailable,
} from '@/domain/rules/fontOfMagic'

describe('metamagic catalog', () => {
  it('has the 8 PHB + 2 TCoE options with RAW costs', () => {
    expect(METAMAGIC_OPTIONS).toHaveLength(10)
    expect(METAMAGIC_BY_ID['quickened'].cost).toBe(2)
    expect(METAMAGIC_BY_ID['heightened'].cost).toBe(3)
    expect(METAMAGIC_BY_ID['twinned'].costsSpellLevel).toBe(true)
  })

  it('Twinned costs the spell level (1 for cantrips); others cost flat', () => {
    expect(metamagicCost(METAMAGIC_BY_ID['twinned'], 0)).toBe(1)
    expect(metamagicCost(METAMAGIC_BY_ID['twinned'], 4)).toBe(4)
    expect(metamagicCost(METAMAGIC_BY_ID['quickened'], 9)).toBe(2)
  })

  it('known-count progression: 2 at 3rd, 3 at 10th, 4 at 17th', () => {
    expect(metamagicKnownCount(2)).toBe(0)
    expect(metamagicKnownCount(3)).toBe(2)
    expect(metamagicKnownCount(10)).toBe(3)
    expect(metamagicKnownCount(17)).toBe(4)
  })
})

describe('Font of Magic — flexible casting', () => {
  const sorcerer = {
    resources: { 'Sorcery Points': { used: 2, total: 10 } },   // 8 available
    spellSlots: {
      1: { used: 1, total: 4 },
      3: { used: 3, total: 3 },
      6: { used: 0, total: 1 },
    },
  }

  it('RAW creation costs', () => {
    expect(CREATE_SLOT_COST).toEqual({ 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 })
  })

  it('creates an expended slot by spending points', () => {
    const patch = createSlotFromPoints(sorcerer, 3)!
    expect(patch.spellSlots[3].used).toBe(2)
    expect(patch.resources['Sorcery Points'].used).toBe(7)   // 2 + 5
    expect(sorceryPointsAvailable(patch)).toBe(3)
  })

  it('refuses to create 6th+ level slots per RAW', () => {
    expect(canCreateSlot(sorcerer, 6)).toBe('slot-level-not-creatable')
  })

  it('refuses when points are insufficient or no slot is expended', () => {
    const broke = { ...sorcerer, resources: { 'Sorcery Points': { used: 9, total: 10 } } }
    expect(canCreateSlot(broke, 3)).toBe('not-enough-points')
    const fresh = { ...sorcerer, spellSlots: { ...sorcerer.spellSlots, 3: { used: 0, total: 3 } } }
    expect(canCreateSlot(fresh, 3)).toBe('no-expended-slot')
  })

  it('converts an available slot into points equal to its level', () => {
    const patch = convertSlotToPoints(sorcerer, 1)!
    expect(patch.spellSlots[1].used).toBe(2)
    expect(patch.resources['Sorcery Points'].used).toBe(1)   // 2 - 1
  })

  it('refuses to convert when every slot of that level is spent', () => {
    expect(canConvertSlot(sorcerer, 3)).toBe('no-available-slot')
  })

  it('any character with the resource can use it — no class gate', () => {
    const homebrewBard = {
      resources: { 'Sorcery Points': { used: 0, total: 4 } },
      spellSlots: { 2: { used: 1, total: 3 } },
    }
    expect(canCreateSlot(homebrewBard, 2)).toBeNull()
    const withoutPool = { resources: {}, spellSlots: { 2: { used: 1, total: 3 } } }
    expect(canCreateSlot(withoutPool, 2)).toBe('no-sorcery-points-resource')
  })
})
