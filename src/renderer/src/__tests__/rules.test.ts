import { describe, it, expect } from 'vitest'
import {
  computeSpellSaveDC,
  computeSpellAttackBonus,
  computeSpellDamage,
  computeAttackAdvantage,
  computeAttackBonus,
  isProficientWithWeapon,
  xpForNextLevel,
  xpForLevel,
  getAvailableActions,
  computePreparedSpellCount,
  computeSpellLevelUpConfig,
} from '@/domain/rules'
import { critDiceExpr } from '@/shared/lib/diceExpr'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { endsAtStartOfNextTurn, getBuffCategory, getBuffTarget, isBuffConditionSpell, SPELL_BY_ID } from '@/shared/data/spellData'
import { SUMMON_TEMPLATE_BY_ID } from '@/shared/data/summons/summonTemplates'
import { resolveRacialFormula, resolveRacialMaxUses } from '@/shared/data/racialActions'
import { RACE_BY_ID } from '@/shared/data/raceData'
import type { Weapon } from '@/entities/character/types'
import { makeChar } from './helpers'

// ── Racial action formula / use resolvers ────────────────────────────────────

describe('resolveRacialFormula', () => {
  // level 5 → prof +3; CON 16 → +3
  const char = makeChar({ level: 5, abilityScores: { str: 10, dex: 10, con: 16, int: 10, wis: 10, cha: 10 } })
  it('resolves "level"', () => expect(resolveRacialFormula('level', char)).toBe(5))
  it('resolves "conmod"', () => expect(resolveRacialFormula('conmod', char)).toBe(3))
  it('resolves "prof"', () => expect(resolveRacialFormula('prof', char)).toBe(3))
  it('resolves "prof+prof" (≈2× proficiency)', () => expect(resolveRacialFormula('prof+prof', char)).toBe(6))
  it('resolves a flat number', () => expect(resolveRacialFormula('5', char)).toBe(5))
})

describe('resolveRacialMaxUses', () => {
  it("'prof' → proficiency bonus", () => expect(resolveRacialMaxUses('prof', 5)).toBe(3))
  it('number → itself', () => expect(resolveRacialMaxUses(2, 5)).toBe(2))
  it('undefined → 1', () => expect(resolveRacialMaxUses(undefined, 5)).toBe(1))
})

describe('race data', () => {
  it('first-batch races exist with correct ability bonuses', () => {
    expect(RACE_BY_ID['Goliath'].abilityBonus).toEqual({ str: 2, con: 1 })
    expect(RACE_BY_ID['Aarakocra'].abilityBonus).toEqual({ dex: 2, wis: 1 })
    expect(RACE_BY_ID['FireGenasi'].abilityBonus).toEqual({ con: 2, int: 1 })
  })
  it('Dragonborn has a Breath Weapon racial action', () => {
    expect(RACE_BY_ID['Dragonborn'].racialActions?.some(a => a.id === 'breath-weapon')).toBe(true)
  })
  it('every racialSpells reference resolves to a real spell', () => {
    for (const race of Object.values(RACE_BY_ID)) {
      for (const ids of Object.values(race.racialSpells ?? {})) {
        for (const id of ids ?? []) expect(SPELL_BY_ID[id], `${race.id} → ${id}`).toBeTruthy()
      }
    }
  })
})

// ── Buff-condition spells ────────────────────────────────────────────────────

describe('isBuffConditionSpell', () => {
  it('Mage Armor (setsBaseAC) is a buff condition', () => expect(isBuffConditionSpell(SPELL_BY_ID['mage-armor'])).toBe(true))
  it('Bless (self-buff) is a buff condition', () => expect(isBuffConditionSpell(SPELL_BY_ID['bless'])).toBe(true))
  it('Longstrider (self-buff) is a buff condition', () => expect(isBuffConditionSpell(SPELL_BY_ID['longstrider'])).toBe(true))
  it("Hunter's Mark (attackBuff) is a buff condition", () => expect(isBuffConditionSpell(SPELL_BY_ID['hunter-s-mark'])).toBe(true))
  it('a damage spell (Fireball) is NOT a buff condition', () => expect(isBuffConditionSpell(SPELL_BY_ID['fireball'])).toBe(false))
})

// ── Temp-HP buffs (dropped when temp HP is fully consumed) ───────────────────

describe('temp-HP buff markers', () => {
  // Drop logic keys on grantsTempHp OR tempHpBuff.
  const isTempHpBuff = (id: string) => !!(SPELL_BY_ID[id]?.grantsTempHp || SPELL_BY_ID[id]?.tempHpBuff)
  it.each(['false-life', 'armor-of-agathys', 'heroism', 'polymorph'])(
    '"%s" is flagged as a temp-HP buff',
    (id) => expect(isTempHpBuff(id)).toBe(true)
  )
  it('Bless is NOT a temp-HP buff', () => expect(isTempHpBuff('bless')).toBe(false))
  it('Armor of Agathys grants 5 temp HP on cast', () => expect(SPELL_BY_ID['armor-of-agathys'].grantsTempHp).toBe('5'))
})

// ── Summon templates (every summon spell must resolve to a template) ─────────

describe('summon templates exist for summon spells', () => {
  it.each(['steed', 'undead-spirit', 'shadow-spirit', 'skeleton', 'beast-spirit', 'fey-spirit'])(
    'template "%s" is defined',
    (id) => expect(SUMMON_TEMPLATE_BY_ID[id]).toBeTruthy()
  )
})

// ── Prepared spell count ─────────────────────────────────────────────────────

describe('computePreparedSpellCount', () => {
  // abilityScore 16 → mod +3
  it('Cleric level 5, WIS 16: level + mod = 8', () => expect(computePreparedSpellCount('Cleric', 5, 16)).toBe(8))
  it('Wizard level 1, INT 16: level + mod = 4', () => expect(computePreparedSpellCount('Wizard', 1, 16)).toBe(4))
  it('Artificer level 5, INT 16: level + mod = 8 (was 0 before fix)', () => expect(computePreparedSpellCount('Artificer', 5, 16)).toBe(8))
  it('Paladin level 4, CHA 16: half-level + mod = 5', () => expect(computePreparedSpellCount('Paladin', 4, 16)).toBe(5))
  it('Scholar level 3, INT 16: level + mod = 6 (matches compendium example)', () => expect(computePreparedSpellCount('Scholar', 3, 16)).toBe(6))
  it('non-preparer (Bard) returns 0', () => expect(computePreparedSpellCount('Bard', 5, 16)).toBe(0))
  it('floors at minimum 1 when mod is very negative', () => expect(computePreparedSpellCount('Cleric', 1, 6)).toBe(1)) // 1 + (-2) = -1 → 1
})

// ── Short-duration spell auto-dismiss detection ──────────────────────────────

describe('computeSpellLevelUpConfig prepared casters', () => {
  it('Cleric 4->5 unlocks 3rd-level slots without learned leveled spells', () => {
    const cfg = computeSpellLevelUpConfig(CLASS_BY_ID.Cleric, 4, 5)
    expect(cfg.maxSlotLevel).toBe(3)
    expect(cfg.spellsDelta).toBe(0)
  })

  it('Cleric 5->6 does not unlock a new spell tier', () => {
    const oldCfg = computeSpellLevelUpConfig(CLASS_BY_ID.Cleric, 4, 5)
    const cfg = computeSpellLevelUpConfig(CLASS_BY_ID.Cleric, 5, 6)
    expect(cfg.maxSlotLevel).toBe(oldCfg.maxSlotLevel)
  })
})

describe('buff classification', () => {
  it('classifies sample buff-condition spells by category and target', () => {
    expect(getBuffCategory(SPELL_BY_ID['searing-smite'])).toBe('damage')
    expect(getBuffTarget(SPELL_BY_ID['searing-smite'])).toBe('self')
    expect(getBuffCategory(SPELL_BY_ID['haste'])).toBe('mobility')
    expect(getBuffTarget(SPELL_BY_ID['magic-weapon'])).toBe('weapon')
    expect(getBuffCategory(SPELL_BY_ID['aura-of-vitality'])).toBe('healing')
    expect(getBuffTarget(SPELL_BY_ID['aura-of-vitality'])).toBe('ally')
    expect(getBuffCategory(SPELL_BY_ID['bless'])).toBe('accuracy')
    expect(getBuffTarget(SPELL_BY_ID['hex'])).toBe('enemy')
  })
})

describe('endsAtStartOfNextTurn', () => {
  it('Booming Blade (duration "1 round") returns true', () => expect(endsAtStartOfNextTurn(SPELL_BY_ID['booming-blade'])).toBe(true))
  it('Green-Flame Blade returns true', () => expect(endsAtStartOfNextTurn(SPELL_BY_ID['green-flame-blade'])).toBe(true))
  it('detects "until the start of your next turn" text', () => expect(endsAtStartOfNextTurn({ duration: 'Until the start of your next turn' })).toBe(true))
  it('a 1-hour spell (Mage Armor / False Life style) returns false', () => expect(endsAtStartOfNextTurn({ duration: '8 hours' })).toBe(false))
  it('an instantaneous spell returns false', () => expect(endsAtStartOfNextTurn({ duration: 'Instantaneous' })).toBe(false))
})

// ── Spellcasting ─────────────────────────────────────────────────────────────

describe('computeSpellSaveDC', () => {
  it('Wizard INT 18, level 1 (prof +2): DC = 8 + 2 + 4 = 14', () => {
    const char = makeChar({ classId: 'Wizard', abilityScores: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    expect(computeSpellSaveDC(char)).toBe(14)
  })
  it('Cleric WIS 14, level 5 (prof +3): DC = 8 + 3 + 2 = 13', () => {
    const char = makeChar({ classId: 'Cleric', abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 }, proficiencyBonus: 3 })
    expect(computeSpellSaveDC(char)).toBe(13)
  })
  it('non-spellcaster (Fighter) returns 8 + prof + 0', () => {
    const char = makeChar({ classId: 'Fighter', proficiencyBonus: 2 })
    expect(computeSpellSaveDC(char)).toBe(10) // 8 + 2 + 0
  })
})

describe('computeSpellAttackBonus', () => {
  it('Wizard INT 18, prof +2: +6', () => {
    const char = makeChar({ classId: 'Wizard', abilityScores: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    expect(computeSpellAttackBonus(char)).toBe(6)
  })
  it('Cleric WIS 16, prof +3: +6', () => {
    const char = makeChar({ classId: 'Cleric', abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, proficiencyBonus: 3 })
    expect(computeSpellAttackBonus(char)).toBe(6)
  })
})

// ── Attack bonus ─────────────────────────────────────────────────────────────

describe('critDiceExpr', () => {
  it('doubles dice and keeps flat modifiers unchanged', () => {
    expect(critDiceExpr('2d6 + 14')).toBe('4d6 + 14')
    expect(critDiceExpr('1d8')).toBe('2d8')
  })
})

describe('computeAttackAdvantage', () => {
  it('poisoned gives disadvantage on martial and spell attacks', () => {
    const adv = computeAttackAdvantage(makeChar({ conditionIds: [{ conditionId: 'poisoned' }] }))
    expect(adv.martial).toBe('dis')
    expect(adv.spell).toBe('dis')
  })

  it('invisible gives advantage on martial and spell attacks', () => {
    const adv = computeAttackAdvantage(makeChar({ conditionIds: [{ conditionId: 'invisible' }] }))
    expect(adv.martial).toBe('adv')
    expect(adv.spell).toBe('adv')
  })

  it('advantage and disadvantage cancel', () => {
    const adv = computeAttackAdvantage(makeChar({ conditionIds: [{ conditionId: 'invisible' }, { conditionId: 'poisoned' }] }))
    expect(adv.martial).toBe('none')
    expect(adv.spell).toBe('none')
  })

  it('raging gives martial advantage only', () => {
    const adv = computeAttackAdvantage(makeChar({ isRaging: true }))
    expect(adv.martial).toBe('adv')
    expect(adv.spell).toBe('none')
  })
})

describe('computeSpellDamage critical formula', () => {
  it('attack-roll spells have a crit formula', () => {
    const dmg = computeSpellDamage(SPELL_BY_ID['fire-bolt'], 0, makeChar())
    expect(dmg.critFormula).not.toBe('')
  })

  it('save spells do not have a crit formula', () => {
    const dmg = computeSpellDamage(SPELL_BY_ID['fireball'], 3, makeChar())
    expect(dmg.critFormula).toBe('')
  })
})

function makeWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return { id: 'test', name: 'Dagger', atkBonus: 0, damage: '1d4', ...overrides }
}

describe('computeAttackBonus', () => {
  it('STR melee weapon: uses STR mod + prof', () => {
    const char = makeChar({ abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Club', rangeType: 'Melee' })
    expect(computeAttackBonus(char, weapon)).toBe(5) // +3 STR + 2 prof
  })
  it('ranged weapon: uses DEX mod + prof', () => {
    const char = makeChar({ abilityScores: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Shortbow', rangeType: 'Ranged' })
    expect(computeAttackBonus(char, weapon)).toBe(5) // +3 DEX + 2 prof
  })
  it('finesse weapon: picks higher of STR or DEX', () => {
    const char = makeChar({ abilityScores: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Dagger', rangeType: 'Melee', properties: ['Finesse', 'Light'] })
    expect(computeAttackBonus(char, weapon)).toBe(5) // DEX mod(+3) beats STR mod(0)
  })
  it('enchantment bonus stacks', () => {
    const char = makeChar({ abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Longsword', rangeType: 'Melee', enchantmentBonus: 1 })
    expect(computeAttackBonus(char, weapon)).toBe(6) // +3 + 2 + 1
  })
  it('non-proficient: no proficiency bonus', () => {
    const char = makeChar({ classId: 'Wizard', abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    const weapon = makeWeapon({ name: 'Longsword', rangeType: 'Melee' })
    expect(computeAttackBonus(char, weapon)).toBe(3) // +3 STR only, not proficient
  })
})

describe('isProficientWithWeapon', () => {
  it('Cleric is proficient with simple weapons', () => {
    const char = makeChar({ classId: 'Cleric' })
    const weapon = makeWeapon({ name: 'Dagger' })
    expect(isProficientWithWeapon(char, weapon)).toBe(true)
  })
  it('Cleric is NOT proficient with martial weapons', () => {
    const char = makeChar({ classId: 'Cleric' })
    const weapon = makeWeapon({ name: 'Longsword' })
    expect(isProficientWithWeapon(char, weapon)).toBe(false)
  })
  it('Fighter is proficient with all weapons', () => {
    const char = makeChar({ classId: 'Fighter' })
    expect(isProficientWithWeapon(char, makeWeapon({ name: 'Dagger' }))).toBe(true)
    expect(isProficientWithWeapon(char, makeWeapon({ name: 'Longsword' }))).toBe(true)
  })
  it('custom (unnamed) weapon is assumed proficient', () => {
    const char = makeChar({ classId: 'Cleric' })
    const weapon = makeWeapon({ name: 'Cursed Blade' })
    expect(isProficientWithWeapon(char, weapon)).toBe(true)
  })
})

// ── XP thresholds ─────────────────────────────────────────────────────────────

describe('xpForLevel', () => {
  it('level 1 → 0', () => expect(xpForLevel(1)).toBe(0))
  it('level 2 → 300', () => expect(xpForLevel(2)).toBe(300))
  it('level 20 → 355000', () => expect(xpForLevel(20)).toBe(355000))
})

describe('xpForNextLevel', () => {
  it('level 1 needs 300 XP to reach level 2', () => expect(xpForNextLevel(1)).toBe(300))
  it('level 19 needs 355000 XP to reach level 20', () => expect(xpForNextLevel(19)).toBe(355000))
  it('level 20 → null (max level)', () => expect(xpForNextLevel(20)).toBeNull())
})

// ── Available actions ─────────────────────────────────────────────────────────

describe('getAvailableActions', () => {
  it('all characters have the Attack action', () => {
    const char = makeChar({ classId: 'Fighter' })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Attack')
  })
  it('Wizard has Cast a Spell', () => {
    const char = makeChar({ classId: 'Wizard' })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Cast a Spell')
  })
  it('Fighter does NOT have Cast a Spell', () => {
    const char = makeChar({ classId: 'Fighter' })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).not.toContain('Cast a Spell')
  })
  it('Rogue level 2 has Cunning Action', () => {
    const char = makeChar({ classId: 'Rogue', level: 2 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Cunning Action')
  })
  it('Rogue level 1 does NOT have Cunning Action (requires level 2)', () => {
    const char = makeChar({ classId: 'Rogue', level: 1 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).not.toContain('Cunning Action')
  })
  it('Fighter level 2 has Second Wind and Action Surge', () => {
    const char = makeChar({ classId: 'Fighter', level: 2 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Second Wind')
    expect(names).toContain('Action Surge')
  })
  it('Barbarian actions are not shown for a Fighter', () => {
    const char = makeChar({ classId: 'Fighter', level: 5 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).not.toContain('Rage')
  })
})
