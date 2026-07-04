import { describe, it, expect } from 'vitest'
import {
  activeManeuverOf, fightingStyleOf, hasPiercerCrit, invocationsOf,
  isBladesinging, isRaging, racialActionUsesOf, wildShapeFormOf,
} from '@/domain/character/compat'

describe('v13→v14 compat bridge accessors', () => {
  it('reads featureState first, then the legacy field', () => {
    expect(isRaging({ isRaging: true })).toBe(true)
    expect(isRaging({ isRaging: true, featureState: { rage: { on: false } } })).toBe(false)
    expect(isRaging({ featureState: { rage: { on: true } } })).toBe(true)
    expect(isRaging({})).toBe(false)

    expect(fightingStyleOf({ fightingStyle: 'defense' })).toBe('defense')
    expect(fightingStyleOf({ fightingStyle: 'defense', featureState: { 'fighting-style': { choice: 'archery' } } })).toBe('archery')

    expect(activeManeuverOf({ activeManeuver: 'riposte' })).toBe('riposte')
    expect(activeManeuverOf({ featureState: { maneuvers: { active: ['trip-attack'] } } })).toBe('trip-attack')
    expect(activeManeuverOf({})).toBeNull()

    expect(invocationsOf({ warlockInvocations: ['agonizingBlast'] })).toEqual(['agonizingBlast'])
    expect(invocationsOf({ featureState: { invocations: { known: ['devils-sight'] } }, warlockInvocations: ['agonizingBlast'] })).toEqual(['devils-sight'])

    expect(racialActionUsesOf({ racialActionUses: { breath: 1 } })).toEqual({ breath: 1 })
    expect(racialActionUsesOf({ featureState: { 'racial-actions': { uses: { breath: 2 } } } })).toEqual({ breath: 2 })

    const form = { name: 'Wolf', hp: { current: 11, max: 11 }, ac: 13, cr: 0.25, speed: '40 ft' }
    expect(wildShapeFormOf({ featureState: { 'wild-shape': { data: { form } } } })).toEqual(form)
    expect(wildShapeFormOf({ wildShapeForm: form })).toEqual(form)
  })

  it('feat riders derive from the feat list, with the stored flag as fallback', () => {
    expect(hasPiercerCrit({ feats: ['piercer'] })).toBe(true)
    expect(hasPiercerCrit({ feats: [], piercerCritExtraDie: true })).toBe(true)
    expect(hasPiercerCrit({ feats: [] })).toBe(false)
  })

  it('bladesong toggle works from either generation', () => {
    expect(isBladesinging({ isBladesinging: true })).toBe(true)
    expect(isBladesinging({ featureState: { bladesong: { on: true } } })).toBe(true)
  })
})
