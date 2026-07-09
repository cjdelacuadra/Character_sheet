import { afterEach, describe, it, expect } from 'vitest'
import { applyRestToResources } from '@/domain/rules/resources'
import { FEATS, setFeatsData } from '@/shared/data/featsData'

const scores = { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 }
const ORIGINAL_FEATS = [...FEATS]

afterEach(() => {
  setFeatsData(ORIGINAL_FEATS)
})

describe('domain/rules/resources — data-driven rest recovery', () => {
  it('BattleMaster Superiority Dice recover on short rest via def, not a class branch', () => {
    const next = applyRestToResources({
      classId: 'Fighter', subclass: 'BattleMaster', level: 7, abilityScores: scores,
      resources: { 'Superiority Dice': { used: 3, total: 5 } },
    }, 'short')
    expect(next['Superiority Dice']).toEqual({ used: 0, total: 5 })
  })

  it('Psi Warrior regains exactly one Psionic Energy die on a short rest', () => {
    const next = applyRestToResources({
      classId: 'Fighter', subclass: 'PsiWarrior', level: 5, abilityScores: scores,
      resources: { 'Psionic Energy': { used: 4, total: 6 } },
    }, 'short')
    expect(next['Psionic Energy'].used).toBe(3)
  })

  it('Rune resources (dynamic keys) fully recharge on a short rest', () => {
    const next = applyRestToResources({
      classId: 'Fighter', subclass: 'RuneKnight', level: 3, abilityScores: scores,
      resources: { 'Rune:fire': { used: 1, total: 1 }, 'Rune:cloud': { used: 1, total: 1 } },
    }, 'short')
    expect(next['Rune:fire'].used).toBe(0)
    expect(next['Rune:cloud'].used).toBe(0)
  })

  it('feat free-casts stay spent through a short rest, recover on long', () => {
    const char = {
      classId: 'Fighter' as const, level: 4, abilityScores: scores,
      resources: { 'Feat:misty-step': { used: 1, total: 1 } },
    }
    expect(applyRestToResources({ ...char, classId: 'Fighter' }, 'short')['Feat:misty-step'].used).toBe(1)
    expect(applyRestToResources({ ...char, classId: 'Fighter' }, 'long')['Feat:misty-step'].used).toBe(0)
  })

  it('feat free-casts with short recharge recover on short rest while long-only spells stay spent', () => {
    setFeatsData([...ORIGINAL_FEATS, {
      id: 'test-short-caster',
      name: 'Test Short Caster',
      description: 'test',
      grantedSpells: ['misty-step', 'invisibility'],
      freeCastSpells: ['misty-step', 'invisibility'],
      freeCastRecharge: { 'misty-step': 'short' },
    }])
    const next = applyRestToResources({
      classId: 'Fighter',
      level: 4,
      abilityScores: scores,
      feats: ['test-short-caster'],
      resources: {
        'Feat:misty-step': { used: 1, total: 1 },
        'Feat:invisibility': { used: 1, total: 1 },
      },
    }, 'short')

    expect(next['Feat:misty-step'].used).toBe(0)
    expect(next['Feat:invisibility'].used).toBe(1)
  })

  it('homebrew resources on any class survive a short rest and reset on long (no class cage)', () => {
    const char = {
      classId: 'Wizard', level: 5, abilityScores: scores,
      resources: { 'Ki (granted)': { used: 2, total: 3 } },
    }
    expect(applyRestToResources(char, 'short')['Ki (granted)']).toEqual({ used: 2, total: 3 })
    expect(applyRestToResources(char, 'long')['Ki (granted)']).toEqual({ used: 0, total: 3 })
  })

  it('long rest resets everything and seeds missing class defaults', () => {
    const next = applyRestToResources({
      classId: 'Fighter', level: 5, abilityScores: scores,
      resources: { 'Second Wind': { used: 1, total: 1 } },
    }, 'long')
    expect(next['Second Wind'].used).toBe(0)
    expect(next['Action Surge']).toBeDefined()   // seeded from class defaults
  })

  it('short rest refreshes totals from level scaling (level-up mid-day)', () => {
    const next = applyRestToResources({
      classId: 'Fighter', subclass: 'BattleMaster', level: 15, abilityScores: scores,
      resources: { 'Superiority Dice': { used: 2, total: 5 } },
    }, 'short')
    expect(next['Superiority Dice'].total).toBe(6)   // 15+ ⇒ 6 dice
    expect(next['Superiority Dice'].used).toBe(0)
  })
})
