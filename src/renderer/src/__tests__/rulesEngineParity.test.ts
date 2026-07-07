import { describe, it, expect } from 'vitest'
import type { Character } from '@/entities/character/types'
import { computeACFull, computeSpeedFull } from '@/shared/data/charCalculations'
import { computeAC } from '@/domain/rules/defense'
import { computeSpeed } from '@/domain/rules/mobility'
import { v13_to_v14 } from '@/domain/character/migrations'
import { makeChar } from './helpers'

/**
 * Pins the new unified engine (domain/rules) to the legacy engine
 * (charCalculations) output for every scenario the legacy engine handles.
 * Intentional divergences (no class cage) are tested separately below.
 */
function parity(overrides: Partial<Character>): { legacyAC: number; newAC: number; legacySpeed: number; newSpeed: number } {
  const v13 = makeChar({ schemaVersion: 13, ...overrides })
  const v14 = v13_to_v14(v13)
  return {
    legacyAC: computeACFull(v13),
    newAC: computeAC(v14),
    legacySpeed: computeSpeedFull(v13),
    newSpeed: computeSpeed(v14),
  }
}

const CASES: Array<[string, Partial<Character>]> = [
  ['unarmored baseline', {}],
  ['unarmored with high DEX', { abilityScores: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 } }],
  ['light armor (leather) + DEX', { abilityScores: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 }, equipment: { ...makeChar().equipment, armorId: 'leather' } }],
  ['medium armor dexCap 2 (half plate, DEX 18)', { abilityScores: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 }, equipment: { ...makeChar().equipment, armorId: 'halfPlate' } }],
  ['heavy armor dexCap 0 (chain mail, DEX 18)', { abilityScores: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 }, equipment: { ...makeChar().equipment, armorId: 'chainMail' } }],
  ['shield item', { equipment: { ...makeChar().equipment, shieldId: 'shield' } }],
  ['legacy hasShield flag', { equipment: { ...makeChar().equipment, hasShield: true } }],
  ['Barbarian unarmored defense', { classId: 'Barbarian', abilityScores: { str: 16, dex: 14, con: 16, int: 8, wis: 10, cha: 8 } }],
  ['Monk unarmored defense', { classId: 'Monk', abilityScores: { str: 10, dex: 16, con: 10, int: 10, wis: 16, cha: 10 } }],
  ['Mage Armor unarmored', { activeBuffSpells: ['mage-armor'], abilityScores: { str: 8, dex: 16, con: 12, int: 16, wis: 10, cha: 10 } }],
  ['Mage Armor ignored under real armor', { activeBuffSpells: ['mage-armor'], equipment: { ...makeChar().equipment, armorId: 'chainMail' } }],
  ['Shield spell + Shield of Faith stack', { activeBuffSpells: ['shield', 'shield-of-faith'] }],
  ['Haste: AC +2 and speed ×2', { activeBuffSpells: ['haste'] }],
  ['Longstrider + Haste speed math', { activeBuffSpells: ['longstrider', 'haste'] }],
  ['restrained condition (speed ×0)', { conditionIds: [{ conditionId: 'restrained' }] }],
  ['defense fighting style in armor', { fightingStyle: 'defense', equipment: { ...makeChar().equipment, armorId: 'chainMail' } }],
  ['Bladesinger with Bladesong active', { classId: 'Wizard', subclass: 'Bladesinging', isBladesinging: true, abilityScores: { str: 8, dex: 14, con: 12, int: 18, wis: 10, cha: 10 } }],
  ['Dual Wielder +1 AC with two melee weapons', { feats: ['dualWielder'], weapons: [
    { id: 'a', name: 'Longsword', atkBonus: 0, damage: '1d8', rangeType: 'Melee' },
    { id: 'b', name: 'Rapier', atkBonus: 0, damage: '1d8', rangeType: 'Melee' },
  ] }],
]

describe('new rules engine parity with legacy (AC + speed)', () => {
  for (const [label, overrides] of CASES) {
    it(label, () => {
      const { legacyAC, newAC, legacySpeed, newSpeed } = parity(overrides)
      expect(newAC, 'AC').toBe(legacyAC)
      expect(newSpeed, 'speed').toBe(legacySpeed)
    })
  }
})

describe('intentional divergences from legacy (no class cage)', () => {
  it('Bladesong toggle works without the Bladesinging subclass', () => {
    // Legacy gated the +10 speed / +INT AC on subclass === 'Bladesinging'.
    // v14: the toggle being on is enough — a DM grant or homebrew can use it.
    const v13 = makeChar({ schemaVersion: 13, classId: 'Fighter', isBladesinging: true, abilityScores: { str: 10, dex: 14, con: 10, int: 16, wis: 10, cha: 10 } })
    const v14 = v13_to_v14(v13)
    expect(computeSpeed(v14)).toBe(40)                    // 30 + 10 bladesong
    expect(computeAC(v14)).toBe(10 + 2 + 3)               // 10 + DEX + max(1, INT)
  })
})

describe('new-engine behaviors the legacy engine lacked', () => {
  it('Dash doubles displayed speed for the turn (after all modifiers)', () => {
    const v14 = v13_to_v14(makeChar({ schemaVersion: 13, activeBuffSpells: ['longstrider'] }))
    expect(computeSpeed(v14)).toBe(40)
    expect(computeSpeed(v14, { dashed: true })).toBe(80)
  })

  it('speed-zero turn state (Steady Aim) wins over everything', () => {
    const v14 = v13_to_v14(makeChar({ schemaVersion: 13, activeBuffSpells: ['haste'] }))
    expect(computeSpeed(v14, { speedZeroUntilTurnEnd: true })).toBe(0)
  })
})
