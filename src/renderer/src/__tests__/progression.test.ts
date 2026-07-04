import { describe, it, expect } from 'vitest'
import * as legacy from '@/domain/rules'
import { computeLevelUpDerived, computeSpellLevelUpConfig, spellsKnownAt, xpForLevel, xpForNextLevel } from '@/domain/rules/progression'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { v13_to_v14 } from '@/domain/character/migrations'
import { makeChar } from './helpers'

describe('domain/rules/progression', () => {
  it('XP thresholds parity with legacy', () => {
    for (const level of [1, 4, 5, 10, 19, 20]) {
      expect(xpForLevel(level)).toBe(legacy.xpForLevel(level))
      expect(xpForNextLevel(level)).toBe(legacy.xpForNextLevel(level))
    }
  })

  it('spell level-up config parity (known-table caster and prepared caster)', () => {
    for (const classId of ['Bard', 'Wizard', 'Sorcerer']) {
      const classDef = CLASS_BY_ID[classId]
      if (!classDef) continue
      expect(computeSpellLevelUpConfig(classDef, 4, 5)).toEqual(legacy.computeSpellLevelUpConfig(classDef, 4, 5))
    }
    expect(spellsKnownAt(7, { 1: 4, 5: 8, 9: 12 })).toBe(8)
  })

  it('Mobile feat adds +10 to CURRENT speed instead of resetting from race base (legacy bug)', () => {
    const v14 = v13_to_v14(makeChar({
      schemaVersion: 13,
      race: 'Human',           // race base 30…
      speed: 35,               // …but the character has a permanent +5 from elsewhere
      level: 4,
      feats: ['mobile'],
    }))
    const derived = computeLevelUpDerived(v14, ['mobile'])
    expect(derived.speed).toBe(45)   // 35 + 10 — legacy would have produced 40 (30 + 10)
  })

  it('mobile bonus is not re-applied when the feat is not newly gained', () => {
    const v14 = v13_to_v14(makeChar({ schemaVersion: 13, speed: 40, feats: ['mobile'] }))
    expect(computeLevelUpDerived(v14, []).speed).toBe(40)
  })

  it('AC recompute includes feats and active buffs (legacy omitted them)', () => {
    const v14 = v13_to_v14(makeChar({
      schemaVersion: 13,
      activeBuffSpells: ['shield-of-faith'],   // +2 AC must survive a level-up recompute
      abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
    }))
    expect(computeLevelUpDerived(v14).armorClass).toBe(10 + 2 + 2)
  })

  it('Tough feat recomputes max HP with +2 per level', () => {
    const base = v13_to_v14(makeChar({ schemaVersion: 13, classId: 'Fighter', level: 5 }))
    const withTough = { ...base, feats: ['tough'] }
    const plain = computeLevelUpDerived(base)
    const tough = computeLevelUpDerived(withTough)
    expect(tough.maxHp).toBe(plain.maxHp + 10)     // +2 × 5 levels
    expect(tough.bonusHpPerLevel).toBe(2)
  })
})
