import { describe, it, expect } from 'vitest'
import type { Character, Weapon } from '@/entities/character/types'
import * as legacy from '@/domain/rules'
import * as attacks from '@/domain/rules/attacks'
import * as spellcasting from '@/domain/rules/spellcasting'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { v13_to_v14 } from '@/domain/character/migrations'
import { makeChar } from './helpers'

const longsword: Weapon = { id: 'w1', name: 'Longsword', atkBonus: 0, damage: '1d8', damageType: 'slashing', rangeType: 'Melee', properties: ['Versatile (1d10)'] }
const rapier: Weapon = { id: 'w2', name: 'Rapier', atkBonus: 0, damage: '1d8', damageType: 'piercing', rangeType: 'Melee', properties: ['Finesse'] }
const longbow: Weapon = { id: 'w3', name: 'Longbow', atkBonus: 0, damage: '1d8', damageType: 'piercing', rangeType: 'Ranged', properties: ['Heavy', 'Two-Handed'] }

function both(overrides: Partial<Character>) {
  const v13 = makeChar({
    schemaVersion: 13,
    abilityScores: { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 18 },
    ...overrides,
  })
  return { v13, v14: v13_to_v14(v13) }
}

describe('attack math parity with legacy', () => {
  const weaponCases: Array<[string, Partial<Character>, Weapon, { forceRanged?: boolean }?]> = [
    ['STR melee (proficient Fighter)', { classId: 'Fighter', level: 5 }, longsword],
    ['finesse takes best of STR/DEX', { classId: 'Rogue' }, rapier],
    ['ranged uses DEX', { classId: 'Fighter' }, longbow],
    ['non-proficient class with martial weapon', { classId: 'Wizard' }, longsword],
    ['archery style on ranged', { classId: 'Fighter', fightingStyle: 'archery' }, longbow],
    ['archery on thrown (forceRanged) keeps STR', { classId: 'Fighter', fightingStyle: 'archery' }, longsword, { forceRanged: true }],
    ['Hex Warrior bonded weapon uses CHA', { classId: 'Warlock', subclass: 'Hexblade', hexWarriorWeaponId: 'w1' }, longsword],
  ]

  for (const [label, overrides, weapon, opts] of weaponCases) {
    it(`to-hit: ${label}`, () => {
      const { v13, v14 } = both(overrides)
      expect(attacks.computeAttackBonus(v14, weapon, opts)).toBe(legacy.computeAttackBonus(v13, weapon, opts))
    })
  }

  const damageCases: Array<[string, Partial<Character>, Weapon]> = [
    ['plain melee damage', { classId: 'Fighter' }, longsword],
    ['versatile two-handed', { classId: 'Fighter' }, { ...longsword, twoHanded: true }],
    ['finesse damage mod', { classId: 'Rogue' }, rapier],
    ['Hex Warrior CHA damage', { classId: 'Warlock', hexWarriorWeaponId: 'w1' }, longsword],
    ['enchantment + flat bonus', { classId: 'Fighter' }, { ...longsword, enchantmentBonus: 1, dmgBonusFlat: 2 }],
  ]

  for (const [label, overrides, weapon] of damageCases) {
    it(`damage: ${label}`, () => {
      const { v13, v14 } = both(overrides)
      expect(attacks.computeWeaponDamage(v14, weapon)).toBe(legacy.computeWeaponDamage(v13, weapon))
    })
  }

  it('buff riders stay OUT of the base damage string and surface as rider rows', () => {
    const { v13, v14 } = both({ classId: 'Paladin', activeBuffSpells: ['divine-favor'] })
    expect(attacks.computeWeaponDamage(v14, longsword)).toBe(legacy.computeWeaponDamage(v13, longsword))
    const riders = attacks.getAttackRiders(v14, longsword)
    expect(riders).toHaveLength(1)
    expect(riders[0].sourceLabel).toBe('Divine Favor')
    expect(riders[0].effect).toMatchObject({ kind: 'damageRider', dice: '1d4', damageType: 'radiant' })
  })

  it("Hunter's Mark rider needs only the active buff — no Ranger required (no class cage)", () => {
    const { v14 } = both({ classId: 'Fighter', activeBuffSpells: ['hunter-s-mark'] })
    const riders = attacks.getAttackRiders(v14, longbow)
    expect(riders.some(r => r.sourceId === 'hunter-s-mark')).toBe(true)
  })

  it('crit threshold parity (Champion + gear mods)', () => {
    const { v13, v14 } = both({ classId: 'Fighter', subclass: 'Champion', level: 15 })
    for (const opts of [undefined, { weaponCritMod: 1 }, { gearCritMods: [1, 2] }]) {
      expect(attacks.computeCritThreshold(v14, opts)).toBe(legacy.computeCritThreshold(v13, opts))
    }
  })

  it('crit extra dice: Piercer derived from feats (legacy needed the stored flag)', () => {
    const { v13, v14 } = both({ feats: ['piercer'], piercerCritExtraDie: true, classId: 'Barbarian', level: 13, race: 'HalfOrc' })
    expect(attacks.critExtraDice(v14, rapier, 'piercing')).toEqual(legacy.critExtraDice(v13, rapier, 'piercing'))
    // v14 does not depend on the stored flag:
    const { v14: noFlag } = both({ feats: ['piercer'], classId: 'Fighter' })
    expect(attacks.critExtraDice(noFlag, rapier, 'piercing')).toEqual([{ expr: '1d8', type: 'piercing' }])
  })

  it('attack count parity across classes and levels', () => {
    for (const [classId, level] of [['Fighter', 20], ['Fighter', 11], ['Fighter', 5], ['Fighter', 4], ['Barbarian', 5], ['Paladin', 5], ['Ranger', 5], ['Monk', 5], ['Wizard', 20]] as const) {
      const { v13, v14 } = both({ classId, level })
      expect(attacks.computeAttackCount(v14), `${classId} ${level}`).toBe(legacy.computeAttackCount(v13))
    }
    const { v13, v14 } = both({ classId: 'Wizard', subclass: 'Bladesinger', level: 6 })
    expect(attacks.computeAttackCount(v14)).toBe(legacy.computeAttackCount(v13))
  })
})

describe('spellcasting parity with legacy', () => {
  it('DC and spell attack parity (class + subclass override)', () => {
    for (const overrides of [
      { classId: 'Wizard', level: 5, proficiencyBonus: 3 },
      { classId: 'Cleric', level: 9, proficiencyBonus: 4 },
      { classId: 'Fighter', subclass: 'EldritchKnight', level: 7, proficiencyBonus: 3 },
    ]) {
      const { v13, v14 } = both(overrides)
      expect(spellcasting.computeSpellSaveDC(v14)).toBe(legacy.computeSpellSaveDC(v13))
      expect(spellcasting.computeSpellAttackBonus(v14)).toBe(legacy.computeSpellAttackBonus(v13))
    }
  })

  it('prepared count parity', () => {
    for (const [classId, level, score] of [['Cleric', 5, 16], ['Paladin', 6, 14], ['Wizard', 3, 18], ['Bard', 5, 16]] as const) {
      expect(spellcasting.computePreparedSpellCount(classId, level, score))
        .toBe(legacy.computePreparedSpellCount(classId, level, score))
    }
  })

  it('spell damage parity for damage-bearing spells', () => {
    const { v13, v14 } = both({ classId: 'Wizard', level: 11 })
    for (const [spellId, slot] of [['fire-bolt', 0], ['magic-missile', 3], ['fireball', 5], ['eldritch-blast', 0]] as const) {
      const spell = SPELL_BY_ID[spellId]
      if (!spell) continue
      const ours = spellcasting.computeSpellDamage(spell, slot, v14)
      const theirs = legacy.computeSpellDamage(spell, slot, v13)
      expect(ours, spellId).toEqual(theirs)
    }
  })

  it('mojibake fix: attack-roll spell with no damage no longer emits a placeholder crit', () => {
    const noDamageAttackSpell = { ...SPELL_BY_ID['fire-bolt'], id: 'x', damageFormula: undefined, scalingDice: undefined, damageType: 'fire' }
    const { v13, v14 } = both({ classId: 'Wizard' })
    const fixed = spellcasting.computeSpellDamage(noDamageAttackSpell, 0, v14)
    expect(fixed.critFormula).toBe('')
    // Legacy bug: the corrupted 'â€”' guard let the '—' placeholder into crit parts.
    const buggy = legacy.computeSpellDamage(noDamageAttackSpell, 0, v13)
    expect(buggy.critFormula).not.toBe('')
  })
})
