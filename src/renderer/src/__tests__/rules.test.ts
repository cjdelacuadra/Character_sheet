import { describe, it, expect } from 'vitest'
import {
  computeSpellSaveDC,
  computeSpellAttackBonus,
  computeAttackBonus,
  isProficientWithWeapon,
  xpForNextLevel,
  xpForLevel,
  getAvailableActions,
} from '@/domain/rules'
import type { Weapon } from '@/entities/character/types'
import { makeChar } from './helpers'

// ── Spellcasting ─────────────────────────────────────────────────────────────

describe('computeSpellSaveDC', () => {
  it('Wizard INT 18, level 1 (prof +2): DC = 8 + 2 + 4 = 14', () => {
    const char = makeChar({ classId: 'Wizard', abilityScores: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    expect(computeSpellSaveDC(char)).toBe(14)
  })
  it('Cleric WIS 14, level 5 (prof +3): DC = 8 + 3 + 2 = 13', () => {
    const char = makeChar({ classId: 'Cleric', abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 }, proficiencyBonus: 3 })
    expect(computeSpellSaveDC(char)).toBe(13)
  })
  it('non-spellcaster (Fighter) returns 8 + prof + 0', () => {
    const char = makeChar({ classId: 'Fighter', proficiencyBonus: 2 })
    expect(computeSpellSaveDC(char)).toBe(10) // 8 + 2 + 0
  })
})

describe('computeSpellAttackBonus', () => {
  it('Wizard INT 18, prof +2: +6', () => {
    const char = makeChar({ classId: 'Wizard', abilityScores: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    expect(computeSpellAttackBonus(char)).toBe(6)
  })
  it('Cleric WIS 16, prof +3: +6', () => {
    const char = makeChar({ classId: 'Cleric', abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, proficiencyBonus: 3 })
    expect(computeSpellAttackBonus(char)).toBe(6)
  })
})

// ── Attack bonus ─────────────────────────────────────────────────────────────

function makeWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return { id: 'test', name: 'Dagger', atkBonus: 0, damage: '1d4', ...overrides }
}

describe('computeAttackBonus', () => {
  it('STR melee weapon: uses STR mod + prof', () => {
    const char = makeChar({ abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Club', rangeType: 'Melee' })
    expect(computeAttackBonus(char, weapon)).toBe(5) // +3 STR + 2 prof
  })
  it('ranged weapon: uses DEX mod + prof', () => {
    const char = makeChar({ abilityScores: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Shortbow', rangeType: 'Ranged' })
    expect(computeAttackBonus(char, weapon)).toBe(5) // +3 DEX + 2 prof
  })
  it('finesse weapon: picks higher of STR or DEX', () => {
    const char = makeChar({ abilityScores: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Dagger', rangeType: 'Melee', properties: ['Finesse', 'Light'] })
    expect(computeAttackBonus(char, weapon)).toBe(5) // DEX mod(+3) beats STR mod(0)
  })
  it('enchantment bonus stacks', () => {
    const char = makeChar({ abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Longsword', rangeType: 'Melee', enchantmentBonus: 1 })
    expect(computeAttackBonus(char, weapon)).toBe(6) // +3 + 2 + 1
  })
  it('non-proficient: no proficiency bonus', () => {
    const char = makeChar({ classId: 'Wizard', abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Longsword', rangeType: 'Melee' })
    expect(computeAttackBonus(char, weapon)).toBe(3) // +3 STR only, not proficient
  })
})

describe('isProficientWithWeapon', () => {
  it('Cleric is proficient with simple weapons', () => {
    const char = makeChar({ classId: 'Cleric' })
    const weapon = makeWeapon({ name: 'Dagger' })
    expect(isProficientWithWeapon(char, weapon)).toBe(true)
  })
  it('Cleric is NOT proficient with martial weapons', () => {
    const char = makeChar({ classId: 'Cleric' })
    const weapon = makeWeapon({ name: 'Longsword' })
    expect(isProficientWithWeapon(char, weapon)).toBe(false)
  })
  it('Fighter is proficient with all weapons', () => {
    const char = makeChar({ classId: 'Fighter' })
    expect(isProficientWithWeapon(char, makeWeapon({ name: 'Dagger' }))).toBe(true)
    expect(isProficientWithWeapon(char, makeWeapon({ name: 'Longsword' }))).toBe(true)
  })
  it('custom (unnamed) weapon is assumed proficient', () => {
    const char = makeChar({ classId: 'Cleric' })
    const weapon = makeWeapon({ name: 'Cursed Blade' })
    expect(isProficientWithWeapon(char, weapon)).toBe(true)
  })
})

// ── XP thresholds ─────────────────────────────────────────────────────────────

describe('xpForLevel', () => {
  it('level 1 → 0', () => expect(xpForLevel(1)).toBe(0))
  it('level 2 → 300', () => expect(xpForLevel(2)).toBe(300))
  it('level 20 → 355000', () => expect(xpForLevel(20)).toBe(355000))
})

describe('xpForNextLevel', () => {
  it('level 1 needs 300 XP to reach level 2', () => expect(xpForNextLevel(1)).toBe(300))
  it('level 19 needs 355000 XP to reach level 20', () => expect(xpForNextLevel(19)).toBe(355000))
  it('level 20 → null (max level)', () => expect(xpForNextLevel(20)).toBeNull())
})

// ── Available actions ─────────────────────────────────────────────────────────

describe('getAvailableActions', () => {
  it('all characters have the Attack action', () => {
    const char = makeChar({ classId: 'Fighter' })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Attack')
  })
  it('Wizard has Cast a Spell', () => {
    const char = makeChar({ classId: 'Wizard' })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Cast a Spell')
  })
  it('Fighter does NOT have Cast a Spell', () => {
    const char = makeChar({ classId: 'Fighter' })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).not.toContain('Cast a Spell')
  })
  it('Rogue level 2 has Cunning Action', () => {
    const char = makeChar({ classId: 'Rogue', level: 2 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Cunning Action')
  })
  it('Rogue level 1 does NOT have Cunning Action (requires level 2)', () => {
    const char = makeChar({ classId: 'Rogue', level: 1 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).not.toContain('Cunning Action')
  })
  it('Fighter level 2 has Second Wind and Action Surge', () => {
    const char = makeChar({ classId: 'Fighter', level: 2 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Second Wind')
    expect(names).toContain('Action Surge')
  })
  it('Barbarian actions are not shown for a Fighter', () => {
    const char = makeChar({ classId: 'Fighter', level: 5 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).not.toContain('Rage')
  })
})
