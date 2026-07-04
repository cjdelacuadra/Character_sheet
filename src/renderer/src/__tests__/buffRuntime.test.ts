import { describe, expect, it } from 'vitest'
import { consumeOneShotBuff } from '@/features/buffs/buffRuntime'
import { makeChar } from './helpers'

describe('consumeOneShotBuff', () => {
  it('sets oneShotUsed during consumption and removes the buff state entry', () => {
    const char = makeChar({
      activeBuffSpells: ['searing-smite', 'longstrider'],
      buffStates: { 'searing-smite': {}, longstrider: {} },
    })

    const patch = consumeOneShotBuff(char, 'searing-smite')

    expect(patch.activeBuffSpells).toEqual(['longstrider'])
    expect(patch.buffStates?.['searing-smite']).toBeUndefined()
    expect(patch.buffStates?.longstrider).toEqual({})
  })
})
