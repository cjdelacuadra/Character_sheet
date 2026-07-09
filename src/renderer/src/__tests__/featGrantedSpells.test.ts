import { describe, expect, it } from 'vitest'
import { setGrantedSpellMode, type FeatDef } from '@/shared/data/featsData'

describe('setGrantedSpellMode', () => {
  it('keeps granted, free-cast, and recharge fields consistent across modes', () => {
    const feat: FeatDef = { id: 'test', name: 'Test', description: 'test' }

    const short = setGrantedSpellMode(feat, 'misty-step', 'short')
    expect(short.grantedSpells).toEqual(['misty-step'])
    expect(short.freeCastSpells).toEqual(['misty-step'])
    expect(short.freeCastRecharge).toEqual({ 'misty-step': 'short' })

    const long = setGrantedSpellMode(short, 'misty-step', 'long')
    expect(long.grantedSpells).toEqual(['misty-step'])
    expect(long.freeCastSpells).toEqual(['misty-step'])
    expect(long.freeCastRecharge).toBeUndefined()

    const none = setGrantedSpellMode(long, 'misty-step', 'none')
    expect(none.grantedSpells).toEqual(['misty-step'])
    expect(none.freeCastSpells).toBeUndefined()
    expect(none.freeCastRecharge).toBeUndefined()
  })
})
