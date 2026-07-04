import { describe, it, expect } from 'vitest'
import { collectActiveEffects, collectBuffSpellEffects } from '@/domain/collect'
import { acBaseFormulas, damageRiders, productOfSpeedMultipliers, sumOf } from '@/domain/effects'
import { makeChar } from './helpers'

describe('domain/collect — buff spells', () => {
  it('Haste emits speedMultiplier ×2 and acBonus +2', () => {
    const effects = collectBuffSpellEffects({ activeBuffSpells: ['haste'] })
    expect(productOfSpeedMultipliers(effects)).toBe(2)
    expect(sumOf(effects, 'acBonus')).toBe(2)
  })

  it('Shield + Shield of Faith acBonus stack (+7)', () => {
    const effects = collectBuffSpellEffects({ activeBuffSpells: ['shield', 'shield-of-faith'] })
    expect(sumOf(effects, 'acBonus')).toBe(7)
  })

  it('Mage Armor emits an acBase 13 formula, not a bonus', () => {
    const effects = collectBuffSpellEffects({ activeBuffSpells: ['mage-armor'] })
    expect(acBaseFormulas(effects)).toEqual([{ value: 13, addDex: true }])
    expect(sumOf(effects, 'acBonus')).toBe(0)
  })

  it('Longstrider + Haste combine: +10 ft then ×2', () => {
    const effects = collectBuffSpellEffects({ activeBuffSpells: ['longstrider', 'haste'] })
    expect(sumOf(effects, 'speedBonus')).toBe(10)
    expect(productOfSpeedMultipliers(effects)).toBe(2)
  })

  it('Searing Smite is a one-shot weapon rider until consumed', () => {
    const active = collectBuffSpellEffects({ activeBuffSpells: ['searing-smite'], buffStates: {} })
    const riders = damageRiders(active, 'melee')
    expect(riders).toHaveLength(1)
    expect(riders[0].effect).toMatchObject({ kind: 'damageRider', dice: '1d6', damageType: 'fire', oneShot: true })

    const consumed = collectBuffSpellEffects({
      activeBuffSpells: ['searing-smite'],
      buffStates: { 'searing-smite': { oneShotUsed: true } },
    })
    expect(damageRiders(consumed, 'melee')).toHaveLength(0)
  })

  it('Divine Favor rider applies to both melee and ranged weapon attacks', () => {
    const effects = collectBuffSpellEffects({ activeBuffSpells: ['divine-favor'] })
    expect(damageRiders(effects, 'melee')).toHaveLength(1)
    expect(damageRiders(effects, 'ranged')).toHaveLength(1)
    expect(damageRiders(effects, 'melee')[0].effect).toMatchObject({ dice: '1d4', damageType: 'radiant' })
  })

  it('Bless emits to-hit dice and save dice, no damage rider', () => {
    const effects = collectBuffSpellEffects({ activeBuffSpells: ['bless'] })
    expect(effects.some(e => e.effect.kind === 'toHitDice' && e.effect.dice === '1d4')).toBe(true)
    expect(effects.some(e => e.effect.kind === 'saveBonusDice' && e.effect.dice === '1d4')).toBe(true)
    expect(damageRiders(effects, 'melee')).toHaveLength(0)
  })
})

describe('domain/collect — conditions and equipment', () => {
  it('condition mechanics surface as effects with source attribution', () => {
    const char = makeChar({ conditionIds: [{ conditionId: 'restrained' }] })
    const effects = collectActiveEffects(char)
    const conditionEffects = effects.filter(e => e.sourceType === 'condition')
    expect(conditionEffects.length).toBeGreaterThan(0)
    expect(conditionEffects.every(e => e.sourceId === 'restrained')).toBe(true)
  })

  it('unknown buff ids and empty state produce no effects', () => {
    const char = makeChar({ activeBuffSpells: ['not-a-spell'] })
    expect(collectActiveEffects(char)).toEqual([])
  })
})
