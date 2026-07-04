import { describe, it, expect } from 'vitest'
import { METAMAGIC_BY_ID, METAMAGIC_OPTIONS, metamagicCost, metamagicKnownCount } from '@/domain/data/metamagicData'
import { CHANNEL_DIVINITY_OPTIONS, channelDivinityOptionsFor } from '@/domain/data/channelDivinityData'
import {
  arcaneWardMax, bardicInspirationDie, divineInterventionSucceeds,
  portentDiceCount, songOfRestDie, wildShapeLimit,
} from '@/domain/rules/casterFeatures'
import * as legacyRules from '@/domain/rules'
import * as newSpellcasting from '@/domain/rules/spellcasting'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { makeChar } from './helpers'
import {
  CREATE_SLOT_COST, canCreateSlot, canConvertSlot, convertSlotToPoints,
  createSlotFromPoints, sorceryPointsAvailable,
} from '@/domain/rules/fontOfMagic'

describe('metamagic catalog', () => {
  it('has the 8 PHB + 2 TCoE options with RAW costs', () => {
    expect(METAMAGIC_OPTIONS).toHaveLength(10)
    expect(METAMAGIC_BY_ID['quickened'].cost).toBe(2)
    expect(METAMAGIC_BY_ID['heightened'].cost).toBe(3)
    expect(METAMAGIC_BY_ID['twinned'].costsSpellLevel).toBe(true)
  })

  it('Twinned costs the spell level (1 for cantrips); others cost flat', () => {
    expect(metamagicCost(METAMAGIC_BY_ID['twinned'], 0)).toBe(1)
    expect(metamagicCost(METAMAGIC_BY_ID['twinned'], 4)).toBe(4)
    expect(metamagicCost(METAMAGIC_BY_ID['quickened'], 9)).toBe(2)
  })

  it('known-count progression: 2 at 3rd, 3 at 10th, 4 at 17th', () => {
    expect(metamagicKnownCount(2)).toBe(0)
    expect(metamagicKnownCount(3)).toBe(2)
    expect(metamagicKnownCount(10)).toBe(3)
    expect(metamagicKnownCount(17)).toBe(4)
  })
})

describe('Channel Divinity catalog', () => {
  it('every subclass option has a source, action type, and description', () => {
    for (const opt of CHANNEL_DIVINITY_OPTIONS) {
      expect(opt.id).toBeTruthy()
      expect(opt.desc.length, opt.id).toBeGreaterThan(20)
      expect(['action', 'bonus', 'reaction', 'special']).toContain(opt.action)
    }
  })

  it('Life cleric gets Turn Undead + Preserve Life at level 2', () => {
    const opts = channelDivinityOptionsFor('LifeDomain', 2).map(o => o.id)
    expect(opts).toContain('turn-undead')
    expect(opts).toContain('preserve-life')
    expect(opts).not.toContain('radiance-of-the-dawn')
  })

  it('level-6 options unlock at 6 (Trickery Cloak of Shadows)', () => {
    expect(channelDivinityOptionsFor('TrickeryDomain', 2).map(o => o.id)).not.toContain('cloak-of-shadows')
    expect(channelDivinityOptionsFor('TrickeryDomain', 6).map(o => o.id)).toContain('cloak-of-shadows')
  })

  it('all 14 domains have at least one option beyond Turn Undead', () => {
    for (const domain of ['LifeDomain', 'LightDomain', 'TrickeryDomain', 'KnowledgeDomain', 'NatureDomain', 'TempestDomain', 'WarDomain', 'DeathDomain', 'ArcanaDomain', 'ForgeDomain', 'GraveDomain', 'OrderDomain', 'PeaceDomain', 'TwilightDomain']) {
      const own = channelDivinityOptionsFor(domain, 6).filter(o => o.source === domain)
      expect(own.length, domain).toBeGreaterThan(0)
    }
  })
})

describe('trackable caster features', () => {
  it('Portent dice: 2, then 3 at level 14', () => {
    expect(portentDiceCount(2)).toBe(2)
    expect(portentDiceCount(14)).toBe(3)
  })

  it('Song of Rest die progression d6→d12', () => {
    expect(songOfRestDie(1)).toBeNull()
    expect(songOfRestDie(2)).toBe('1d6')
    expect(songOfRestDie(9)).toBe('1d8')
    expect(songOfRestDie(13)).toBe('1d10')
    expect(songOfRestDie(17)).toBe('1d12')
  })

  it('Bardic Inspiration die scaling', () => {
    expect(bardicInspirationDie(1)).toBe('1d6')
    expect(bardicInspirationDie(5)).toBe('1d8')
    expect(bardicInspirationDie(10)).toBe('1d10')
    expect(bardicInspirationDie(15)).toBe('1d12')
  })

  it('Arcane Ward max = 2×level + INT mod', () => {
    expect(arcaneWardMax(6, 4)).toBe(16)
  })

  it('Wild Shape: Moon druids get CR 1 as a bonus action at 2, floor(level/3) from 6', () => {
    expect(wildShapeLimit(1, false)).toBeNull()
    expect(wildShapeLimit(2, false)).toEqual({ maxCR: 0.25, canSwim: false, canFly: false, economy: 'action' })
    expect(wildShapeLimit(4, false)?.maxCR).toBe(0.5)
    expect(wildShapeLimit(8, false)).toEqual({ maxCR: 1, canSwim: true, canFly: true, economy: 'action' })
    expect(wildShapeLimit(2, true)).toEqual({ maxCR: 1, canSwim: false, canFly: false, economy: 'bonus' })
    expect(wildShapeLimit(9, true)?.maxCR).toBe(3)
  })

  it('Divine Intervention: d100 ≤ level, automatic at 20', () => {
    expect(divineInterventionSucceeds(10, 10)).toBe(true)
    expect(divineInterventionSucceeds(10, 11)).toBe(false)
    expect(divineInterventionSucceeds(20, 100)).toBe(true)
  })
})

describe('Agonizing Blast wiring', () => {
  const eldritchBlast = SPELL_BY_ID['eldritch-blast']

  it('legacy engine adds CHA mod per beam only with the invocation known', () => {
    const base = makeChar({ schemaVersion: 13, classId: 'Warlock', abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 18 } })
    const plain = legacyRules.computeSpellDamage(eldritchBlast, 0, base)
    expect(plain.hitFormula).toBe('1d10 force')
    const agonizing = legacyRules.computeSpellDamage(eldritchBlast, 0, { ...base, warlockInvocations: ['agonizingBlast'] })
    expect(agonizing.hitFormula).toBe('1d10 + 4 force')
  })

  it('new engine reads either schema generation (no class gate)', () => {
    const v13 = makeChar({ schemaVersion: 13, classId: 'Bard', abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 }, warlockInvocations: ['agonizingBlast'] })
    expect(newSpellcasting.computeSpellDamage(eldritchBlast, 0, v13).hitFormula).toBe('1d10 + 3 force')
    const v14 = { ...v13, warlockInvocations: undefined, featureState: { invocations: { known: ['agonizingBlast'] } } }
    expect(newSpellcasting.computeSpellDamage(eldritchBlast, 0, v14).hitFormula).toBe('1d10 + 3 force')
  })
})

describe('Font of Magic — flexible casting', () => {
  const sorcerer = {
    resources: { 'Sorcery Points': { used: 2, total: 10 } },   // 8 available
    spellSlots: {
      1: { used: 1, total: 4 },
      3: { used: 3, total: 3 },
      6: { used: 0, total: 1 },
    },
  }

  it('RAW creation costs', () => {
    expect(CREATE_SLOT_COST).toEqual({ 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 })
  })

  it('creates an expended slot by spending points', () => {
    const patch = createSlotFromPoints(sorcerer, 3)!
    expect(patch.spellSlots[3].used).toBe(2)
    expect(patch.resources['Sorcery Points'].used).toBe(7)   // 2 + 5
    expect(sorceryPointsAvailable(patch)).toBe(3)
  })

  it('refuses to create 6th+ level slots per RAW', () => {
    expect(canCreateSlot(sorcerer, 6)).toBe('slot-level-not-creatable')
  })

  it('refuses when points are insufficient or no slot is expended', () => {
    const broke = { ...sorcerer, resources: { 'Sorcery Points': { used: 9, total: 10 } } }
    expect(canCreateSlot(broke, 3)).toBe('not-enough-points')
    const fresh = { ...sorcerer, spellSlots: { ...sorcerer.spellSlots, 3: { used: 0, total: 3 } } }
    expect(canCreateSlot(fresh, 3)).toBe('no-expended-slot')
  })

  it('converts an available slot into points equal to its level', () => {
    const patch = convertSlotToPoints(sorcerer, 1)!
    expect(patch.spellSlots[1].used).toBe(2)
    expect(patch.resources['Sorcery Points'].used).toBe(1)   // 2 - 1
  })

  it('refuses to convert when every slot of that level is spent', () => {
    expect(canConvertSlot(sorcerer, 3)).toBe('no-available-slot')
  })

  it('any character with the resource can use it — no class gate', () => {
    const homebrewBard = {
      resources: { 'Sorcery Points': { used: 0, total: 4 } },
      spellSlots: { 2: { used: 1, total: 3 } },
    }
    expect(canCreateSlot(homebrewBard, 2)).toBeNull()
    const withoutPool = { resources: {}, spellSlots: { 2: { used: 1, total: 3 } } }
    expect(canCreateSlot(withoutPool, 2)).toBe('no-sorcery-points-resource')
  })
})
