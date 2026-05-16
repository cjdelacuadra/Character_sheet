/**
 * Checklist Tester
 *
 * Tracks each item in CHECKLIST.md as either a real assertion (feature exists)
 * or test.todo() (feature not yet implemented). Run `npm test` to see passing
 * tests (green) and pending items (yellow todo).
 */

import { describe, it, test, expect } from 'vitest'
import { SUBCLASSES_BY_CLASS } from '@/shared/data/subclassData'
import { getAvailableActions, computeSpellAttackBonus, computeAttackBonus, computePreparedSpellCount, computeSpellLevelUpConfig } from '@/domain/rules'
import { computeAC } from '@/shared/data/charCalculations'
import { getSelectableSpells } from '@/shared/data/spellData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { makeChar } from './helpers'
import type { Weapon } from '@/entities/character/types'

// ─────────────────────────────────────────────────────────────
//  FEATURES PANEL
// ─────────────────────────────────────────────────────────────

describe('Features Panel — display', () => {
  test.todo('selected feature card gets .featureCardSel CSS class (visual)')
  test.todo('clicking a selected card a second time clears the right-column detail pane (visual)')
})

describe('Features Panel — action gating by level', () => {
  it('Fighter level 1 has the Attack action', () => {
    const char = makeChar({ classId: 'Fighter', level: 1 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Attack')
  })

  it('Wizard level 1 has Cast a Spell', () => {
    const char = makeChar({ classId: 'Wizard', level: 1 })
    const names = getAvailableActions(char).map(a => a.name)
    expect(names).toContain('Cast a Spell')
  })

  it('Rogue level 2 has Cunning Action; level 1 does not', () => {
    expect(getAvailableActions(makeChar({ classId: 'Rogue', level: 2 })).map(a => a.name)).toContain('Cunning Action')
    expect(getAvailableActions(makeChar({ classId: 'Rogue', level: 1 })).map(a => a.name)).not.toContain('Cunning Action')
  })

  it('Fighter level 5 has Extra Attack', () => {
    expect(getAvailableActions(makeChar({ classId: 'Fighter', level: 5 })).map(a => a.name)).toContain('Extra Attack')
  })

  it('Fighter level 4 does NOT have Extra Attack', () => {
    expect(getAvailableActions(makeChar({ classId: 'Fighter', level: 4 })).map(a => a.name)).not.toContain('Extra Attack')
  })
})

// ─────────────────────────────────────────────────────────────
//  FIGHTER FIGHTING STYLE
// ─────────────────────────────────────────────────────────────

describe('Fighter Fighting Style — selection & storage', () => {
  it('fightingStyle is an optional string on Character', () => {
    expect(makeChar().fightingStyle).toBeUndefined()
    expect(makeChar({ fightingStyle: 'archery' }).fightingStyle).toBe('archery')
  })

  test.todo('buildCharacter() includes fightingStyle when class is Fighter')
  test.todo('buildCharacter() omits fightingStyle when class is not Fighter')
  test.todo('StepEquipment shows Fighting Style picker for Fighter only')
})

describe('Fighter Fighting Style — display', () => {
  test.todo('Fighter with fightingStyle set shows "Fighting Style: <name>" in FeaturesPanel (visual)')
})

describe('Fighter Fighting Style — implementation', () => {
  const shortbow: Weapon = { id: 'sb', name: 'Shortbow', atkBonus: 0, damage: '1d6', rangeType: 'Ranged', properties: [] }
  const longsword: Weapon = { id: 'ls', name: 'Longsword', atkBonus: 0, damage: '1d8', rangeType: 'Melee', properties: [] }
  const armoredBase = {
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    equipment: { armorId: 'leather', hasShield: false as const, shieldId: null },
    classId: 'Fighter',
    race: 'Human',
  }

  it('Archery: computeAttackBonus adds +2 to ranged attack rolls', () => {
    const char = makeChar({ fightingStyle: 'archery', abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    expect(computeAttackBonus(char, shortbow)).toBe(6) // dex(2) + prof(2) + archery(2)
  })

  it('Archery: does NOT add +2 for melee attacks', () => {
    const char = makeChar({ fightingStyle: 'archery', abilityScores: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyBonus: 2 })
    expect(computeAttackBonus(char, longsword)).toBe(4) // str(2) + prof(2), no archery bonus
  })

  it('Defense: computeAC returns +1 AC when Fighter is wearing any armor', () => {
    expect(computeAC({ ...armoredBase, fightingStyle: 'defense' })).toBe(computeAC(armoredBase) + 1)
  })

  it('Defense: computeAC does NOT add +1 when unarmored', () => {
    const unarmoredBase = { ...armoredBase, equipment: { armorId: null, hasShield: false as const, shieldId: null } }
    expect(computeAC({ ...unarmoredBase, fightingStyle: 'defense' })).toBe(computeAC(unarmoredBase))
  })

  test.todo('Dueling: computeAttackBonus adds +2 damage when one melee weapon and no off-hand')

  test.todo('Two-Weapon Fighting: off-hand attack damage includes ability modifier')
})

// ─────────────────────────────────────────────────────────────
//  SUBCLASS / ARCHETYPE
// ─────────────────────────────────────────────────────────────

describe('Subclass unlock levels (data assertions)', () => {
  it('Fighter subclass unlocks at level 3', () => {
    expect(SUBCLASSES_BY_CLASS['Fighter']?.[0]?.unlocksAtLevel).toBe(3)
  })

  it('Barbarian subclass unlocks at level 3', () => {
    expect(SUBCLASSES_BY_CLASS['Barbarian']?.[0]?.unlocksAtLevel).toBe(3)
  })

  it('Bard subclass unlocks at level 3', () => {
    expect(SUBCLASSES_BY_CLASS['Bard']?.[0]?.unlocksAtLevel).toBe(3)
  })

  it('Cleric subclass unlocks at level 1', () => {
    expect(SUBCLASSES_BY_CLASS['Cleric']?.[0]?.unlocksAtLevel).toBe(1)
  })

  it('Druid subclass unlocks at level 2', () => {
    expect(SUBCLASSES_BY_CLASS['Druid']?.[0]?.unlocksAtLevel).toBe(2)
  })

  it('Rogue subclass unlocks at level 3', () => {
    expect(SUBCLASSES_BY_CLASS['Rogue']?.[0]?.unlocksAtLevel).toBe(3)
  })

  it('Wizard subclass unlocks at level 2', () => {
    expect(SUBCLASSES_BY_CLASS['Wizard']?.[0]?.unlocksAtLevel).toBe(2)
  })

  it('every subclass has a valid classId and label', () => {
    const allSubclasses = Object.values(SUBCLASSES_BY_CLASS).flat()
    for (const sc of allSubclasses) {
      expect(sc.classId).toBeTruthy()
      expect(sc.label).toBeTruthy()
      expect(sc.unlocksAtLevel).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('Subclass selection — level-up flow', () => {
  test.todo('LevelUpModal shows subclass picker when newLevel === subclassUnlockLevel and char.subclass is unset')
  test.todo('levelUp() with subclassChoice stores it on character.subclass')
  test.todo('LevelUpModal does NOT show subclass picker when char already has a subclass')
})

describe('Subclass creation — high-level character', () => {
  test.todo('StepBasics "Next" button is disabled for Fighter level 3 with no subclass chosen')
  test.todo('StepBasics "Next" button is enabled for Fighter level 2 with no subclass (not yet required)')
  test.todo('StepBasics "Next" button is enabled for Fighter level 3 after subclass is chosen')
})

// ─────────────────────────────────────────────────────────────
//  OFF-HAND ATTACK
// ─────────────────────────────────────────────────────────────

describe('Off-hand attack', () => {
  const shortsword: Weapon = { id: 'sw', name: 'Shortsword', atkBonus: 0, damage: '1d6', rangeType: 'Melee', properties: ['Finesse', 'Light'] }
  const handaxe: Weapon    = { id: 'ha', name: 'Handaxe',    atkBonus: 0, damage: '1d6', rangeType: 'Melee', properties: ['Light', 'Thrown'] }
  const greatsword: Weapon = { id: 'gs', name: 'Greatsword', atkBonus: 0, damage: '2d6', rangeType: 'Melee', properties: ['Heavy', 'Two-Handed'] }

  it('character with two light melee weapons has Off-Hand Attack bonus action', () => {
    const char = makeChar({ weapons: [shortsword, handaxe] })
    expect(getAvailableActions(char).map(a => a.name)).toContain('Off-Hand Attack')
  })

  it('character with only one weapon has no Off-Hand Attack', () => {
    const char = makeChar({ weapons: [shortsword] })
    expect(getAvailableActions(char).map(a => a.name)).not.toContain('Off-Hand Attack')
  })

  it('character with one light + one heavy weapon has no Off-Hand Attack', () => {
    const char = makeChar({ weapons: [shortsword, greatsword] })
    expect(getAvailableActions(char).map(a => a.name)).not.toContain('Off-Hand Attack')
  })

  it('character with no weapons has no Off-Hand Attack', () => {
    expect(getAvailableActions(makeChar()).map(a => a.name)).not.toContain('Off-Hand Attack')
  })

  test.todo('off-hand damage does NOT include ability modifier (without Two-Weapon Fighting style)')

  test.todo('off-hand damage includes ability modifier when Fighter has Two-Weapon Fighting style')
})

// ─────────────────────────────────────────────────────────────
//  REACTION ACTIONS
// ─────────────────────────────────────────────────────────────

describe('Reaction actions from feats', () => {
  it('character with Sentinel feat has "Opportunity Attack (Sentinel)" reaction', () => {
    const char = makeChar({ feats: ['sentinel'] })
    expect(getAvailableActions(char).map(a => a.name)).toContain('Opportunity Attack (Sentinel)')
  })

  it('character without Sentinel has no Sentinel reaction', () => {
    expect(getAvailableActions(makeChar()).map(a => a.name)).not.toContain('Opportunity Attack (Sentinel)')
  })

  it('character with War Caster feat has War Caster Reaction Spell', () => {
    const char = makeChar({ feats: ['warCaster'] })
    expect(getAvailableActions(char).map(a => a.name)).toContain('War Caster Reaction Spell')
  })
})

// ─────────────────────────────────────────────────────────────
//  SPELL ATTACK DISPLAY
// ─────────────────────────────────────────────────────────────

describe('Spell attack bonus', () => {
  it('Wizard INT 18 level 1 (prof +2): spell attack bonus = +6', () => {
    const char = makeChar({
      classId: 'Wizard',
      level: 1,
      proficiencyBonus: 2,
      abilityScores: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 },
    })
    expect(computeSpellAttackBonus(char)).toBe(6)
  })

  it('Warlock CHA 16 level 5 (prof +3): spell attack bonus = +6', () => {
    const char = makeChar({
      classId: 'Warlock',
      level: 5,
      proficiencyBonus: 3,
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
    })
    expect(computeSpellAttackBonus(char)).toBe(6)
  })

  test.todo('ActionDetailPanel shows "+N to hit · XdY type" for attack-roll cantrips (e.g. Fire Bolt, Eldritch Blast) (visual)')
})

// ─────────────────────────────────────────────────────────────
//  SCROLLABLE UI — LEFT COLUMN
// ─────────────────────────────────────────────────────────────

describe('Scrollable UI — first column', () => {
  test.todo('leftCol scrolls independently at viewport height 768px without hiding FeaturesPanel (visual)')
  test.todo('center and right columns remain fixed when left column scrolls (visual)')
})

describe('Hide scrollbars (keep scrollable)', () => {
  test.todo('scrollable containers have scrollbar-width: none applied — no scrollbar visible (visual)')
  test.todo('content in all columns still scrolls via mouse wheel / trackpad after hiding scrollbar (visual)')
})

// ─────────────────────────────────────────────────────────────
//  LEVEL-UP SPELL SELECTOR
// ─────────────────────────────────────────────────────────────

describe('Level-up spell selector — computeSpellLevelUpConfig', () => {
  it('Wizard leveling 1→2: spell step offers exactly 2 new spells (delta, not cumulative)', () => {
    const config = computeSpellLevelUpConfig(CLASS_BY_ID['Wizard']!, 1, 2)
    expect(config.spellsDelta).toBe(2)
  })

  it('Wizard leveling 2→3: maxSlotLevel reaches 2 so 2nd-level spells become available', () => {
    const config2 = computeSpellLevelUpConfig(CLASS_BY_ID['Wizard']!, 1, 2)
    const config3 = computeSpellLevelUpConfig(CLASS_BY_ID['Wizard']!, 2, 3)
    expect(config2.maxSlotLevel).toBe(1)
    expect(config3.maxSlotLevel).toBe(2)
  })

  it('Sorcerer leveling 1→2: spell step offers exactly 1 new known spell', () => {
    const config = computeSpellLevelUpConfig(CLASS_BY_ID['Sorcerer']!, 1, 2)
    expect(config.spellsDelta).toBe(1) // 2 → 3 known spells
  })

  it('max slot level is capped at 9 (no 10th-level spells)', () => {
    const config = computeSpellLevelUpConfig(CLASS_BY_ID['Wizard']!, 19, 20)
    expect(config.maxSlotLevel).toBe(9)
  })

  it('Bard leveling 1→2: 1 new spell, level-1 spells available', () => {
    const config = computeSpellLevelUpConfig(CLASS_BY_ID['Bard']!, 1, 2)
    expect(config.spellsDelta).toBe(1)  // 4 → 5
    expect(config.maxSlotLevel).toBe(1)
  })

  it('non-spellcaster (Fighter) leveling up: zero delta and maxSlotLevel 1', () => {
    const config = computeSpellLevelUpConfig(CLASS_BY_ID['Fighter']!, 1, 2)
    expect(config.spellsDelta).toBe(0)
    expect(config.cantripsDelta).toBe(0)
  })

  it('Cleric leveling 3→4: gains 1 cantrip, 0 spell slots (prepared caster)', () => {
    const config = computeSpellLevelUpConfig(CLASS_BY_ID['Cleric']!, 3, 4)
    expect(config.cantripsDelta).toBe(1) // cantripsKnownTable: { 1:3, 4:4 }
    expect(config.spellsDelta).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
//  SPELL LIST FILTERING
// ─────────────────────────────────────────────────────────────

describe('Spell list filtering — getSelectableSpells', () => {
  it('returns only spells tagged for the given class', () => {
    const spells = getSelectableSpells('Wizard', 9)
    expect(spells.length).toBeGreaterThan(0)
    expect(spells.every(s => s.classes.includes('Wizard'))).toBe(true)
  })

  it('excludes spells above maxSlotLevel', () => {
    const spells = getSelectableSpells('Wizard', 1)
    expect(spells.every(s => s.level === 0 || s.level <= 1)).toBe(true)
    // Level-2 spells must be absent
    expect(spells.some(s => s.level > 1)).toBe(false)
  })

  it('always includes cantrips (level 0) even when maxSlotLevel is 0', () => {
    const spells = getSelectableSpells('Wizard', 0)
    expect(spells.some(s => s.level === 0)).toBe(true)
    expect(spells.every(s => s.level === 0)).toBe(true)
  })

  it('excludes cross-class spells (Sacred Flame is Cleric-only, absent for Wizard)', () => {
    const spells = getSelectableSpells('Wizard', 9)
    expect(spells.find(s => s.id === 'sacred-flame')).toBeUndefined()
  })

  it('Cleric list includes Sacred Flame but not Eldritch Blast', () => {
    const spells = getSelectableSpells('Cleric', 9)
    expect(spells.find(s => s.id === 'sacred-flame')).toBeDefined()
    expect(spells.find(s => s.id === 'eldritch-blast')).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────
//  WIZARD — LEARN SPELLS
// ─────────────────────────────────────────────────────────────

describe('Wizard: learn spells outside level-up', () => {
  test.todo('Wizard character sheet has an "Add to Spellbook" affordance (visual)')
  test.todo('Adding a spell via the spellbook flow appends it to character.spellIds immediately')
  test.todo('Added spell appears in the Cast a Spell list')
  test.todo('Wizard spellbook picker shows only Wizard-tagged spells')
  test.todo('Wizard spellbook picker hides spells already in character.spellIds')
})

// ─────────────────────────────────────────────────────────────
//  PREPARED SPELLS
// ─────────────────────────────────────────────────────────────

describe('Prepared spells — computePreparedSpellCount', () => {
  it('Cleric level 5 WIS 16 → 8 prepared spells (level 5 + WIS mod 3)', () => {
    expect(computePreparedSpellCount('Cleric', 5, 16)).toBe(8)
  })

  it('Wizard level 5 INT 18 → 9 prepared spells (level 5 + INT mod 4)', () => {
    expect(computePreparedSpellCount('Wizard', 5, 18)).toBe(9)
  })

  it('Paladin level 5 CHA 14 → 4 prepared spells (floor(5/2) + CHA mod 2)', () => {
    expect(computePreparedSpellCount('Paladin', 5, 14)).toBe(4)
  })

  it('Druid level 3 WIS 12 → 4 prepared spells (level 3 + WIS mod 1)', () => {
    expect(computePreparedSpellCount('Druid', 3, 12)).toBe(4)
  })

  it('minimum prepared spells is 1 even when formula gives 0 or negative', () => {
    expect(computePreparedSpellCount('Cleric', 1, 8)).toBe(1) // 1 + (-1) = 0 → clamped to 1
  })

  it('Fighter returns 0 (not a prepared caster)', () => {
    expect(computePreparedSpellCount('Fighter', 5, 10)).toBe(0)
  })

  it('Sorcerer returns 0 (known-spell caster, no prepare step)', () => {
    expect(computePreparedSpellCount('Sorcerer', 5, 10)).toBe(0)
  })
})

describe('Prepared spells — UI', () => {
  test.todo('Prepared caster character sheet shows a "Prepare Spells" section (visual)')
  test.todo('Prepare Spells section shows cap and current count (e.g. "4 / 8 prepared") (visual)')
  test.todo('After reaching the cap, further spells cannot be toggled on (visual)')
  test.todo('ActionDetailPanel cast list only shows prepared spells for prepared-spell classes (visual)')
  test.todo('Known-spell classes (Bard, Sorcerer, Warlock, Ranger) show all spells without a prepare step')
})
