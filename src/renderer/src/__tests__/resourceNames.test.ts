import { describe, expect, it } from 'vitest'
import { buildSpendAction } from '@/features/content-editor/resourceNames'

describe('buildSpendAction', () => {
  it('creates inside-attack spend actions as free actions requiring an attack first', () => {
    const action = buildSpendAction('Focus Dice', 'Inside attack')

    expect(action).toMatchObject({
      id: 'spend-focus-dice',
      name: 'Use Focus Dice',
      type: 'Free',
      generic: true,
      resourceKey: 'Focus Dice',
      resourceCost: 1,
      requiresAttackThisTurn: true,
      short: 'On an attack: spend 1 Focus Dice.',
    })
  })
})
