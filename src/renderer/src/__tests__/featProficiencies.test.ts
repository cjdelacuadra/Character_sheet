import { afterEach, describe, expect, it } from 'vitest'
import { computeAttackBonus as legacyComputeAttackBonus, isProficientWithWeapon as legacyIsProficientWithWeapon } from '@/domain/rules'
import { computeAttackBonus as unifiedComputeAttackBonus, isProficientWithWeapon as unifiedIsProficientWithWeapon } from '@/domain/rules/attacks'
import { FEATS, setFeatsData } from '@/shared/data/featsData'
import { makeChar } from './helpers'

const ORIGINAL_FEATS = [...FEATS]

afterEach(() => {
  setFeatsData(ORIGINAL_FEATS)
})

describe('feat-granted weapon proficiencies', () => {
  it('grant martial proficiency in both attack engines', () => {
    setFeatsData([...ORIGINAL_FEATS, {
      id: 'test-martial-training',
      name: 'Test Martial Training',
      description: 'test',
      grantsProficiencies: { weapons: ['Martial'] },
    }])
    const weapon = { id: 'w1', name: 'Longsword', atkBonus: 0, damage: '1d8', damageType: 'slashing', rangeType: 'Melee' as const }
    const base = { ...makeChar({ classId: 'Wizard', feats: [], proficiencyBonus: 2 }), featureState: {} }
    const feated = { ...base, feats: ['test-martial-training'], featureState: {} }

    expect(legacyIsProficientWithWeapon(feated, weapon)).toBe(true)
    expect(unifiedIsProficientWithWeapon(feated, weapon)).toBe(true)
    expect(legacyComputeAttackBonus(feated, weapon) - legacyComputeAttackBonus(base, weapon)).toBe(base.proficiencyBonus)
    expect(unifiedComputeAttackBonus(feated, weapon) - unifiedComputeAttackBonus(base, weapon)).toBe(base.proficiencyBonus)
  })
})
