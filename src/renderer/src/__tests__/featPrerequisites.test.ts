import { describe, expect, it } from 'vitest'
import { featPrerequisitesMet, type FeatDef } from '@/shared/data/featsData'
import { makeChar } from './helpers'

function feat(prerequisites?: FeatDef['prerequisites']): FeatDef {
  return { id: 'test-feat', name: 'Test Feat', description: 'test', prerequisites }
}

describe('featPrerequisitesMet', () => {
  it('passes when prerequisites are absent', () => {
    expect(featPrerequisitesMet(makeChar(), feat())).toEqual({ met: true, missing: [] })
  })

  it('checks class gates', () => {
    expect(featPrerequisitesMet(makeChar({ classId: 'Wizard' }), feat({ classes: ['Fighter'] }))).toEqual({
      met: false,
      missing: ['class Fighter'],
    })
  })

  it('checks race gates', () => {
    expect(featPrerequisitesMet(makeChar({ race: 'Human' }), feat({ races: ['Elf'] }))).toEqual({
      met: false,
      missing: ['race Elf'],
    })
  })

  it('checks feat gates', () => {
    expect(featPrerequisitesMet(makeChar({ feats: [] }), feat({ feats: ['lucky'] }))).toEqual({
      met: false,
      missing: ['feat Lucky'],
    })
  })

  it('checks ability minimums', () => {
    expect(featPrerequisitesMet(makeChar({ abilityScores: { str: 12, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }), feat({ abilities: { str: 13 } }))).toEqual({
      met: false,
      missing: ['STR 13'],
    })
    expect(featPrerequisitesMet(makeChar({ abilityScores: { str: 13, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }), feat({ abilities: { str: 13 } })).met).toBe(true)
  })
})
