import { describe, expect, it } from 'vitest'
import { computeACFull, computeConditionModifiers, computeSpeedFull } from '@/shared/data/charCalculations'
import { makeChar } from './helpers'

describe('condition modifiers', () => {
  it('folds slowed AC, DEX save and speed modifiers', () => {
    const char = makeChar({ conditionIds: [{ conditionId: 'slowed' }] })
    const mods = computeConditionModifiers(char)

    expect(mods.acDelta).toBe(-2)
    expect(mods.saveDeltas.dex).toBe(-2)
    expect(mods.speedMultiplier).toBe(0.5)
  })

  it('multiplies speed modifiers', () => {
    const char = makeChar({ conditionIds: [{ conditionId: 'slowed' }, { conditionId: 'difficult-terrain' }] })

    expect(computeConditionModifiers(char).speedMultiplier).toBe(0.25)
  })

  it('lets speed-zero conditions dominate', () => {
    const char = makeChar({ conditionIds: [{ conditionId: 'restrained' }] })

    expect(computeConditionModifiers(char).speedMultiplier).toBe(0)
  })

  it('folds haste AC', () => {
    const char = makeChar({ conditionIds: [{ conditionId: 'haste' }] })

    expect(computeConditionModifiers(char).acDelta).toBe(2)
  })

  it('applies condition AC deltas through computeACFull', () => {
    const normal = makeChar({ abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 } })
    const slowed = makeChar({
      abilityScores: normal.abilityScores,
      conditionIds: [{ conditionId: 'slowed' }],
    })

    expect(computeACFull(slowed)).toBe(computeACFull(normal) - 2)
  })

  it('applies speed multipliers through computeSpeedFull', () => {
    expect(computeSpeedFull(makeChar({ speed: 30, conditionIds: [{ conditionId: 'slowed' }] }))).toBe(15)
    expect(computeSpeedFull(makeChar({ speed: 30, conditionIds: [{ conditionId: 'slowed' }, { conditionId: 'difficult-terrain' }] }))).toBe(7)
    expect(computeSpeedFull(makeChar({ speed: 30, conditionIds: [{ conditionId: 'restrained' }] }))).toBe(0)
  })

  it('ignores unknown legacy condition IDs', () => {
    const char = makeChar({ conditionIds: [{ conditionId: 'old-freetext' }] })

    expect(() => computeConditionModifiers(char)).not.toThrow()
    expect(computeConditionModifiers(char)).toEqual({
      acDelta: 0,
      speedMultiplier: 1,
      saveDeltas: {},
      flags: [],
    })
  })
})
