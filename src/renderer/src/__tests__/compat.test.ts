import { describe, it, expect } from 'vitest'
import * as compat from '@/domain/character/compat'
import {
  activeManeuverOf, fightingStyleOf, hasPiercerCrit, invocationsOf,
  isBladesinging, isRaging, racialActionUsesOf, wildShapeFormOf,
} from '@/domain/character/compat'
import { v13_to_v14 } from '@/domain/character/migrations'
import { makeChar } from './helpers'

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

  it('THE FLIP invariant: every accessor survives v13→v14 migration unchanged', () => {
    const v13 = makeChar({
      schemaVersion: 13,
      isRaging: true,
      isBladesinging: true,
      fightingStyle: 'defense',
      fightingStyleLocked: true,
      hexWarriorWeaponId: 'w9',
      chosenTotem: 'wolf',
      circleOfLandTerrain: 'coast',
      pactBoon: 'tome',
      pactBoonLocked: true,
      chainFamiliarType: 'imp',
      tomeCantrips: ['light'],
      warlockInvocations: ['agonizingBlast'],
      chosenManeuvers: ['riposte'],
      activeManeuver: 'riposte',
      arcaneShots: ['bursting-arrow'],
      activeArcaneShot: 'bursting-arrow',
      artificerInfusions: ['enhanced-defense'],
      activeArtificerInfusions: ['enhanced-defense'],
      knownRunes: ['fire-rune'],
      activeRunes: ['fire-rune'],
      racialActionUses: { breath: 1 },
      wildShapeForm: { name: 'Wolf', hp: { current: 11, max: 11 }, ac: 13, cr: 0.25, speed: '40 ft' },
      masterySpells: { level1: 'shield' },
      feats: ['piercer'],
    })
    const v14 = v13_to_v14(v13)

    const accessors: Array<(c: Parameters<typeof compat.isRaging>[0]) => unknown> = [
      compat.isRaging, compat.isBladesinging, compat.fightingStyleOf, compat.fightingStyleLocked,
      compat.hexWarriorWeaponIdOf, compat.chosenTotemOf, compat.landTerrainOf,
      compat.pactBoonOf, compat.pactBoonLockedOf, compat.chainFamiliarOf, compat.tomeCantripsOf,
      compat.invocationsOf, compat.maneuversKnownOf, compat.activeManeuverOf,
      compat.arcaneShotsKnownOf, compat.activeArcaneShotOf, compat.infusionsKnownOf,
      compat.activeInfusionsOf, compat.runesKnownOf, compat.activeRunesOf,
      compat.racialActionUsesOf, compat.wildShapeFormOf, compat.masterySpellsOf,
      compat.hasPiercerCrit, compat.hasCrusherCrit, compat.hasSpellSniper,
    ]
    for (const accessor of accessors) {
      expect(accessor(v14), accessor.name).toEqual(accessor(v13))
    }
  })
})
