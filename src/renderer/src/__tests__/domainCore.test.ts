import { describe, it, expect } from 'vitest'
import { combineDiceExpr, critDiceExpr, parseDiceExpr, rollDiceExpr, roll4d6DropLowest } from '@/domain/dice'
import { migrateCharacterV14, v13_to_v14 } from '@/domain/character/migrations'
import { CURRENT_SCHEMA_VERSION, FEATURE_KEYS, featureChoice, featureKnown, featureOn, getFeatureState, withFeatureState } from '@/domain/character/schema'
import { makeChar } from './helpers'
import type { Character } from '@/entities/character/types'

describe('domain/dice', () => {
  it('parses mixed dice + flats with subtraction', () => {
    expect(parseDiceExpr('2d6 + 1d8 - 3')).toEqual({
      dice: [{ count: 2, face: 6 }, { count: 1, face: 8 }],
      flat: -3,
    })
  })

  it('combines like dice terms and sorts by face', () => {
    expect(combineDiceExpr('1d6+2d6+1d8+4')).toBe('1d8 + 3d6 + 4')
  })

  it('doubles only dice on a crit, not flats', () => {
    expect(critDiceExpr('2d6 + 14')).toBe('4d6 + 14')
    expect(critDiceExpr('1d8')).toBe('2d8')
  })

  it('rollDiceExpr stays within expression bounds', () => {
    for (let i = 0; i < 50; i++) {
      const total = rollDiceExpr('2d6+3')
      expect(total).toBeGreaterThanOrEqual(5)
      expect(total).toBeLessThanOrEqual(15)
    }
  })

  it('roll4d6DropLowest stays within 3..18', () => {
    for (let i = 0; i < 50; i++) {
      const score = roll4d6DropLowest()
      expect(score).toBeGreaterThanOrEqual(3)
      expect(score).toBeLessThanOrEqual(18)
    }
  })
})

/** A realistic v13 character exercising every legacy field that v14 folds away. */
function makeV13Fixture(): Character {
  return makeChar({
    schemaVersion: 13,
    classId: 'Fighter',
    subclass: 'BattleMaster',
    level: 7,
    isRaging: true,
    isBladesinging: false,
    chosenTotem: 'bear',
    hexWarriorWeaponId: 'weapon-42',
    pactBoon: 'blade',
    pactBoonLocked: true,
    chainFamiliarType: 'imp',
    tomeCantrips: ['guidance', 'light'],
    warlockInvocations: ['agonizing-blast', 'devils-sight'],
    fightingStyle: 'defense',
    fightingStyleLocked: true,
    selectedManeuver: 'riposte',
    chosenManeuvers: ['trip-attack', 'riposte'],
    activeManeuver: 'trip-attack',
    arcaneShots: ['bursting-arrow'],
    activeArcaneShot: 'bursting-arrow',
    artificerInfusions: ['enhanced-defense'],
    activeArtificerInfusions: ['enhanced-defense'],
    knownRunes: ['fire-rune'],
    activeRunes: ['fire-rune'],
    circleOfLandTerrain: 'forest',
    wildShapeForm: { name: 'Brown Bear', hp: { current: 34, max: 34 }, ac: 11, cr: 1, speed: '40 ft' },
    racialActionUses: { 'breath-weapon': 1 },
    masterySpells: { level1: 'shield' },
    piercerCritExtraDie: true,
    crusherCritAdvantage: false,
    resources: { 'Superiority Dice': { used: 1, total: 5 } },
  })
}

describe('domain/character v13→v14 migration', () => {
  const v14 = v13_to_v14(makeV13Fixture())

  it('bumps to the current schema version', () => {
    expect(v14.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(CURRENT_SCHEMA_VERSION).toBe(14)
  })

  it('maps toggles, choices, and lists into featureState', () => {
    expect(featureOn(v14, FEATURE_KEYS.rage)).toBe(true)
    expect(featureOn(v14, FEATURE_KEYS.bladesong)).toBe(false)
    expect(featureChoice(v14, FEATURE_KEYS.totemSpirit)).toBe('bear')
    expect(featureChoice(v14, FEATURE_KEYS.hexWarrior)).toBe('weapon-42')
    expect(getFeatureState(v14, FEATURE_KEYS.pactBoon)).toEqual({ choice: 'blade', locked: true })
    expect(featureChoice(v14, FEATURE_KEYS.pactOfTheChain)).toBe('imp')
    expect(featureKnown(v14, FEATURE_KEYS.pactOfTheTome)).toEqual(['guidance', 'light'])
    expect(featureKnown(v14, FEATURE_KEYS.invocations)).toEqual(['agonizing-blast', 'devils-sight'])
    expect(getFeatureState(v14, FEATURE_KEYS.fightingStyle)).toEqual({ choice: 'defense', locked: true })
    expect(featureKnown(v14, FEATURE_KEYS.arcaneShots)).toEqual(['bursting-arrow'])
    expect(getFeatureState(v14, FEATURE_KEYS.infusions)).toEqual({ known: ['enhanced-defense'], active: ['enhanced-defense'] })
    expect(getFeatureState(v14, FEATURE_KEYS.runes)).toEqual({ known: ['fire-rune'], active: ['fire-rune'] })
    expect(featureChoice(v14, FEATURE_KEYS.circleOfTheLand)).toBe('forest')
    expect(getFeatureState(v14, FEATURE_KEYS.racialActions).uses).toEqual({ 'breath-weapon': 1 })
    expect(getFeatureState(v14, FEATURE_KEYS.spellMastery).data).toEqual({ level1: 'shield' })
    expect((getFeatureState(v14, FEATURE_KEYS.wildShape).data?.form as { name: string }).name).toBe('Brown Bear')
  })

  it('folds the legacy single selectedManeuver into known and keeps active', () => {
    expect(featureKnown(v14, FEATURE_KEYS.maneuvers)).toEqual(['trip-attack', 'riposte'])
    expect(getFeatureState(v14, FEATURE_KEYS.maneuvers).active).toEqual(['trip-attack'])
  })

  it('deletes every legacy field including derived feat flags', () => {
    const raw = v14 as unknown as Record<string, unknown>
    for (const field of [
      'isRaging', 'chosenTotem', 'hexWarriorWeaponId', 'pactBoon', 'pactBoonLocked',
      'chainFamiliarType', 'tomeCantrips', 'warlockInvocations', 'fightingStyle',
      'selectedManeuver', 'chosenManeuvers', 'activeManeuver', 'arcaneShots',
      'artificerInfusions', 'knownRunes', 'circleOfLandTerrain', 'wildShapeForm',
      'racialActionUses', 'masterySpells',
      'piercerCritExtraDie', 'crusherCritAdvantage', 'spellSniperDoubleRange', 'mountedCombatantFlags',
    ]) {
      expect(raw[field], field).toBeUndefined()
    }
  })

  it('preserves untouched fields (resources, scores, equipment)', () => {
    expect(v14.resources['Superiority Dice']).toEqual({ used: 1, total: 5 })
    expect(v14.level).toBe(7)
    expect(v14.subclass).toBe('BattleMaster')
  })

  it('keeps featureState lean for characters with no legacy state', () => {
    const fresh = v13_to_v14(makeChar({ schemaVersion: 13 }))
    expect(fresh.featureState).toEqual({})
  })

  it('preserves featureState entries adopted before the flip (e.g. metamagic)', () => {
    const v13 = makeChar({
      schemaVersion: 13,
      featureState: { metamagic: { known: ['quickened', 'twinned'] } },
      chosenManeuvers: ['riposte'],
    })
    const migrated = v13_to_v14(v13)
    expect(migrated.featureState['metamagic']).toEqual({ known: ['quickened', 'twinned'] })
    expect(migrated.featureState['maneuvers']).toEqual({ known: ['riposte'] })
  })

  it('migrateCharacterV14 runs the full chain from v1 raw data', () => {
    const v1 = { id: 'old', name: 'Old Timer', race: 'Human', classId: 'Fighter', background: 'Soldier', level: 3, experiencePoints: 900, abilityScores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, hitPoints: { current: 28, max: 28, temp: 0 }, armorClass: 16, speed: 30, initiative: 1, proficiencyBonus: 2, equipment: { armorId: 'chain-mail', hasShield: true } }
    const migrated = migrateCharacterV14(v1)
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(migrated.equipment.shieldId).toBe('shield')       // v1→v2 hasShield mapping
    expect(migrated.ownedItemIds).toEqual([])                 // v7→v8 + safety net
    expect(migrated.featureState).toEqual({})
  })

  it('is idempotent for already-v14 data', () => {
    const again = migrateCharacterV14(v14)
    expect(again).toBe(v14)
  })
})

describe('domain/character featureState accessors', () => {
  it('withFeatureState merges without mutating', () => {
    const char = { featureState: { rage: { on: true } } }
    const next = withFeatureState(char, 'rage', { on: false })
    expect(next.rage).toEqual({ on: false })
    expect(char.featureState.rage).toEqual({ on: true })
  })

  it('accessors default safely for missing keys', () => {
    const char = { featureState: {} }
    expect(featureKnown(char, 'maneuvers')).toEqual([])
    expect(featureOn(char, 'rage')).toBe(false)
    expect(featureChoice(char, 'totem-spirit')).toBeUndefined()
  })
})
