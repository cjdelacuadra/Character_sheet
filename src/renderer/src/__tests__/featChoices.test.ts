import { describe, expect, it } from 'vitest'
import { featChoiceCount, FEAT_BY_ID } from '@/shared/data/featsData'

describe('featChoiceCount', () => {
  it('sums generalized feat-granted choice counts', () => {
    expect(featChoiceCount(['martialAdept'], 'maneuvers')).toBe(2)
    expect(featChoiceCount(['metamagic-adept'], 'metamagic')).toBe(2)
    expect(featChoiceCount(['fightingInitiate'], 'fighting-style')).toBe(1)
    expect(FEAT_BY_ID.fightingInitiate.grantsChoices).toEqual([{ kind: 'fighting-style', count: 1 }])
  })
})
