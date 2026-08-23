import { describe, it, expect } from 'vitest'
import { resolveGrantedResourceAmount } from '@/shared/data/featsData'
import { getAvailableActions } from '@/domain/rules'
import { profBonus } from '@/shared/data/charCalculations'
import { makeChar } from './helpers'

describe('resolveGrantedResourceAmount', () => {
  it('passes plain numbers through unchanged', () => {
    expect(resolveGrantedResourceAmount(3, 2)).toBe(3)
    expect(resolveGrantedResourceAmount(0, 6)).toBe(0)
  })

  it('evaluates flat + profFactor * proficiencyBonus', () => {
    expect(resolveGrantedResourceAmount({ profFactor: 1 }, 2)).toBe(2)   // level 1-4
    expect(resolveGrantedResourceAmount({ profFactor: 1 }, 4)).toBe(4)   // level 13-16
    expect(resolveGrantedResourceAmount({ flat: 1, profFactor: 1 }, 3)).toBe(4)
    expect(resolveGrantedResourceAmount({ flat: 2 }, 5)).toBe(2)         // no factor
  })

  it('clamps to a minimum of 0', () => {
    expect(resolveGrantedResourceAmount({ flat: -5, profFactor: 1 }, 2)).toBe(0)
  })
})

describe('FFXIV role actions: feat-only pool gating', () => {
  it('does not offer Provoke to a character without the feat', () => {
    const char = makeChar({ classId: 'Fighter', level: 5, feats: [] })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).not.toContain('Provoke')
    expect(names).not.toContain('Rampart')
  })

  it('offers Provoke once the character has Role of the Vanguard', () => {
    const char = makeChar({ classId: 'Fighter', level: 5, feats: ['ff-role-vanguard'] })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Provoke')
    expect(names).toContain('Rampart')
    // Heart-tier actions still gated behind their own feat
    expect(names).not.toContain('Interject')
  })

  it('does not disturb class pool actions (Metamagic stays for a base Sorcerer)', () => {
    const char = makeChar({ classId: 'Sorcerer', level: 3, feats: [] })
    expect(getAvailableActions(char).map(a => a.name)).toContain('Metamagic')
  })
})

describe('FFXIV role feat resource grant (PB-scaled)', () => {
  it("Role of the Vanguard's Provoke pool scales with proficiency bonus", () => {
    // profFactor:1 → pool size equals proficiency bonus at the character's level.
    expect(resolveGrantedResourceAmount({ profFactor: 1 }, profBonus(1))).toBe(2)
    expect(resolveGrantedResourceAmount({ profFactor: 1 }, profBonus(17))).toBe(6)
  })
})
