import { describe, it, expect, afterEach } from 'vitest'
import { getAvailableActions } from '@/domain/rules'
import { computeACFull } from '@/shared/data/charCalculations'
import { computeAC as newComputeAC } from '@/domain/rules/defense'
import { raceSaveAdvantagesOf, RACES, RACE_BY_ID, setRacesData } from '@/shared/data/raceData'
import { FEATS, setFeatsData } from '@/shared/data/featsData'
import { computeEquipmentStats, effectiveAbilityScore } from '@/shared/data/charCalculations'
import { computeSpeed } from '@/domain/rules/mobility'
import { computeSpeedFull } from '@/shared/data/charCalculations'
import { makeChar } from './helpers'

// Parity gates for Phase 1 catalog externalization: behavior pinned BEFORE
// converting naturalAC to data, folding save advantages into RaceDef, and
// extracting the action catalogs out of the rules engine.

describe('natural armor parity (naturalAC as data)', () => {
  const unarmored = (race: string, scores: Partial<Record<'str'|'dex'|'con'|'int'|'wis'|'cha', number>>) =>
    makeChar({
      schemaVersion: 13,
      race,
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...scores },
      equipment: { ...makeChar().equipment, armorId: null, shieldId: null },
    })

  it.each([
    ['Lizardfolk', { dex: 16 }, 16],   // 13 + dex mod
    ['Tortle',     { dex: 16 }, 17],   // flat 17, dex irrelevant
    ['Warforged',  { dex: 14 }, 13],   // 11 + dex mod
    ['Githzerai',  { dex: 14, wis: 16 }, 15],  // 10 + dex + wis
  ] as const)('%s unarmored AC in both engines', (race, scores, expected) => {
    const char = unarmored(race, scores)
    expect(computeACFull(char)).toBe(expected)
    const v14 = { ...char, featureState: char.featureState ?? {} }
    expect(newComputeAC(v14)).toBe(expected)
  })
})

describe('racial save advantages accessor', () => {
  it('Dwarf and StoutHalfling entries survive the RaceDef fold', () => {
    expect(raceSaveAdvantagesOf('Dwarf')).toEqual([
      { saves: ['con'], vs: 'vs poison', source: 'Dwarven Resilience' },
    ])
    expect(raceSaveAdvantagesOf('StoutHalfling')).toHaveLength(2)
    expect(raceSaveAdvantagesOf('Human')).toEqual([])
  })
})

describe('feat/race passive stat wiring (both engines)', () => {
  const ORIGINAL_FEATS = [...FEATS]
  const ORIGINAL_RACES = [...RACES]
  afterEach(() => { setFeatsData(ORIGINAL_FEATS); setRacesData(ORIGINAL_RACES) })

  it('feat stats fold into AC and speed in both calculation paths', () => {
    setFeatsData([...ORIGINAL_FEATS, {
      id: 'test-bulwark', name: 'Bulwark', description: 'test',
      stats: { acBonus: 1, speedBonus: 10 },
    }])
    const base = makeChar({ schemaVersion: 13 })
    const feated = { ...base, feats: [...base.feats, 'test-bulwark'] }

    expect(computeACFull(feated) - computeACFull(base)).toBe(1)
    const v14 = (c: typeof base) => ({ ...c, featureState: c.featureState ?? {} })
    expect(newComputeAC(v14(feated)) - newComputeAC(v14(base))).toBe(1)

    expect(computeSpeedFull(feated) - computeSpeedFull(base)).toBe(10)
    expect(computeSpeed(v14(feated)) - computeSpeed(v14(base))).toBe(10)
  })

  it('race stats fold: skill bonus and ability floor apply', () => {
    const human = RACE_BY_ID['Human']
    setRacesData([...ORIGINAL_RACES.filter(r => r.id !== 'Human'), {
      ...human,
      stats: { skillBonus: { stealth: 2 }, abilitySet: { str: 16 } },
    }])
    const char = makeChar({
      schemaVersion: 13, race: 'Human',
      abilityScores: { str: 8, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    })
    expect(computeEquipmentStats(char).skillBonus.stealth).toBe(2)
    expect(effectiveAbilityScore(char, 'str')).toBe(16)   // racial floor
  })
})

describe('getAvailableActions snapshot (actions catalog extraction)', () => {
  it.each([
    ['Fighter', 5, ['Attack','Dash','Dodge','Help','Hide','Ready','Search','Use Object','Grapple','Shove','Disengage','Escape Grapple','Mount / Dismount','Opportunity Attack','Readied Action','Second Wind','Action Surge','Extra Attack']],
    ['Cleric', 3, ['Attack','Dash','Dodge','Help','Hide','Ready','Search','Use Object','Grapple','Shove','Disengage','Escape Grapple','Mount / Dismount','Opportunity Attack','Readied Action','Cast a Spell','Cast a Spell (Bonus)','Cast a Spell (Reaction)','Channel Divinity','Turn Undead']],
    ['Sorcerer', 3, ['Attack','Dash','Dodge','Help','Hide','Ready','Search','Use Object','Grapple','Shove','Disengage','Escape Grapple','Mount / Dismount','Opportunity Attack','Readied Action','Cast a Spell','Cast a Spell (Bonus)','Cast a Spell (Reaction)','Metamagic']],
  ] as const)('%s %d action list unchanged', (classId, level, expected) => {
    const char = makeChar({ schemaVersion: 13, classId, level })
    expect(getAvailableActions(char).map(a => a.name)).toEqual([...expected])
  })
})
