import { describe, it, expect } from 'vitest'
import {
  mod,
  profBonus,
  computeMaxHP,
  computeSpeed,
  skillBonus,
  savingThrowBonus,
  computeAC,
} from '@/shared/data/charCalculations'
import type { AbilityScores } from '@/entities/character/types'

function scores(partial: Partial<AbilityScores>): AbilityScores {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...partial }
}

describe('mod', () => {
  it('returns 0 for 10', () => expect(mod(10)).toBe(0))
  it('returns -1 for 8', () => expect(mod(8)).toBe(-1))
  it('returns +5 for 20', () => expect(mod(20)).toBe(5))
  it('returns -5 for 1', () => expect(mod(1)).toBe(-5))
  it('returns +4 for 18', () => expect(mod(18)).toBe(4))
  it('rounds down for odd scores', () => {
    expect(mod(9)).toBe(-1)   // (9-10)/2 = -0.5 → -1
    expect(mod(11)).toBe(0)   // (11-10)/2 = 0.5 → 0
    expect(mod(15)).toBe(2)   // (15-10)/2 = 2.5 → 2
  })
})

describe('profBonus', () => {
  it.each([
    [1, 2], [4, 2],   // tier 1
    [5, 3], [8, 3],   // tier 2
    [9, 4], [12, 4],  // tier 3
    [13, 5], [16, 5], // tier 4
    [17, 6], [20, 6], // tier 5
  ])('level %i → +%i', (level, expected) => {
    expect(profBonus(level)).toBe(expected)
  })
})

describe('computeMaxHP', () => {
  it('Fighter level 1, CON 10: max hit die + 0', () => {
    expect(computeMaxHP('Fighter', 1, 10)).toBe(10) // d10 + 0
  })
  it('Fighter level 2, CON 10: 10 + avg(6)', () => {
    expect(computeMaxHP('Fighter', 2, 10)).toBe(16) // 10 + 6
  })
  it('Fighter level 1, CON 14: max hit die + 2', () => {
    expect(computeMaxHP('Fighter', 1, 14)).toBe(12) // 10 + 2
  })
  it('Fighter level 2, CON 14: 12 + (6+2)', () => {
    expect(computeMaxHP('Fighter', 2, 14)).toBe(20) // 12 + 8
  })
  it('Wizard level 1, CON 10: d6 = 6', () => {
    expect(computeMaxHP('Wizard', 1, 10)).toBe(6)
  })
  it('Barbarian level 1, CON 10: d12 = 12', () => {
    expect(computeMaxHP('Barbarian', 1, 10)).toBe(12)
  })
  it('bonusHpPerLevel adds to each level', () => {
    // Fighter level 2, CON 10, bonus 1/level: 10 + 1 + 6 + 1 = 18
    expect(computeMaxHP('Fighter', 2, 10, 1)).toBe(18)
  })
  it('returns 1 for unknown class', () => {
    expect(computeMaxHP('Unknown', 1, 10)).toBe(1)
  })
})

describe('computeSpeed', () => {
  it('Dwarf: 25', () => expect(computeSpeed('Dwarf')).toBe(25))
  it('Human: 30', () => expect(computeSpeed('Human')).toBe(30))
  it('unknown race defaults to 30', () => expect(computeSpeed('Unknown')).toBe(30))
})

describe('skillBonus', () => {
  it('no proficiency: returns ability modifier', () => {
    expect(skillBonus('athletics', 16, 'none', 3)).toBe(3) // mod(16) = +3
  })
  it('proficient: adds proficiency bonus once', () => {
    expect(skillBonus('athletics', 16, 'proficient', 3)).toBe(6) // +3 + 3
  })
  it('expert: adds proficiency bonus twice', () => {
    expect(skillBonus('athletics', 16, 'expert', 3)).toBe(9) // +3 + 6
  })
  it('below-average ability with no proficiency', () => {
    expect(skillBonus('stealth', 8, 'none', 2)).toBe(-1) // mod(8) = -1
  })
})

describe('savingThrowBonus', () => {
  it('not proficient: returns ability modifier', () => {
    expect(savingThrowBonus(14, false, 3)).toBe(2) // mod(14) = +2
  })
  it('proficient: adds proficiency bonus', () => {
    expect(savingThrowBonus(14, true, 3)).toBe(5) // +2 + 3
  })
  it('negative modifier without proficiency', () => {
    expect(savingThrowBonus(8, false, 2)).toBe(-1)
  })
})

describe('computeAC unarmored', () => {
  const noArmor = { armorId: undefined, shieldId: undefined, hasShield: false }

  it('Wizard, no race effect: 10 + DEX', () => {
    expect(computeAC({ abilityScores: scores({ dex: 14 }), equipment: noArmor, classId: 'Wizard', race: 'Human' })).toBe(12)
  })
  it('Barbarian Human DEX 14 CON 16: 10 + 2 + 3 = 15', () => {
    expect(computeAC({ abilityScores: scores({ dex: 14, con: 16 }), equipment: noArmor, classId: 'Barbarian', race: 'Human' })).toBe(15)
  })
  it('Monk Human DEX 14 WIS 16: 10 + 2 + 3 = 15', () => {
    expect(computeAC({ abilityScores: scores({ dex: 14, wis: 16 }), equipment: noArmor, classId: 'Monk', race: 'Human' })).toBe(15)
  })
  it('Lizardfolk Wizard DEX 16: natural AC 13 + 3 = 16 (beats 10 + DEX)', () => {
    expect(computeAC({ abilityScores: scores({ dex: 16 }), equipment: noArmor, classId: 'Wizard', race: 'Lizardfolk' })).toBe(16)
  })
  it('Lizardfolk Barbarian DEX 14 CON 16: tie at 15 (natural and Barbarian formulas both yield 15)', () => {
    expect(computeAC({ abilityScores: scores({ dex: 14, con: 16 }), equipment: noArmor, classId: 'Barbarian', race: 'Lizardfolk' })).toBe(15)
  })
  it('Lizardfolk Barbarian DEX 10 CON 18: Barbarian wins (14 > 13 natural)', () => {
    expect(computeAC({ abilityScores: scores({ dex: 10, con: 18 }), equipment: noArmor, classId: 'Barbarian', race: 'Lizardfolk' })).toBe(14)
  })
  it('Lizardfolk Barbarian DEX 16 CON 20: natural wins (16 > 15 Barbarian)', () => {
    expect(computeAC({ abilityScores: scores({ dex: 16, con: 20 }), equipment: noArmor, classId: 'Barbarian', race: 'Lizardfolk' })).toBe(16)
  })
  it('Tortle Wizard DEX 8: natural AC 17 (Tortle fixed shell)', () => {
    expect(computeAC({ abilityScores: scores({ dex: 8 }), equipment: noArmor, classId: 'Wizard', race: 'Tortle' })).toBe(17)
  })
  it('Draconic Sorcerer DEX 14: subclass formula 13 + DEX = 15 beats default 12', () => {
    expect(computeAC({ abilityScores: scores({ dex: 14 }), equipment: noArmor, classId: 'Sorcerer', race: 'Human', subclass: 'DraconicBloodline' })).toBe(15)
  })
  it('Githzerai Monk DEX 14 WIS 16: natural (10+2+3=15) ties Monk formula (10+2+3=15)', () => {
    expect(computeAC({ abilityScores: scores({ dex: 14, wis: 16 }), equipment: noArmor, classId: 'Monk', race: 'Githzerai' })).toBe(15)
  })
})
